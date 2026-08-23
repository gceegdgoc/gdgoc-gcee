// @ts-nocheck
import type { Response } from 'express';
import mongoose from 'mongoose';
import { Member, TEAMS } from '../models';
import { connectDB } from '../config/db';
import { safeString, isValidHttpUrl } from '../utils/safe';

function serialize(m: any) {
  return {
    _id: m._id,
    name: m.name,
    email: m.email || '',
    phone: m.phone || '',
    college: m.college || '',
    registerNumber: m.registerNumber || '',
    skills: m.skills || '',
    areasOfInterest: m.areasOfInterest || '',
    whyJoin: m.whyJoin || '',
    team: m.team,
    role: m.role,
    coordinatorRole: m.coordinatorRole || '',
    department: m.department || '',
    year: m.year || '',
    photo: m.photo || '',
    socialLinks: {
      github: m.socialLinks?.github || '',
      linkedin: m.socialLinks?.linkedin || '',
      instagram: m.socialLinks?.instagram || '',
      twitter: m.socialLinks?.twitter || '',
    },
    order: m.order ?? 0,
    isActive: m.isActive !== false,
  };
}

/** Safe request summary logging (field names only — never values). */
function logAdminAction(route: string, req: any, normalized?: Record<string, unknown>) {
  try {
    const keys = req?.body && typeof req.body === 'object' ? Object.keys(req.body) : [];
    console.log(
      `[ADMIN MEMBER] ${route} | received fields: [${keys.join(', ')}]` +
        ` | normalized fields: [${normalized ? Object.keys(normalized).join(', ') : '-'}]`
    );
  } catch {
    // logging must never break the request
  }
}

function validationError(res: Response, errors: Record<string, string>) {
  res.status(400).json({
    success: false,
    message: 'Validation failed. Please check the highlighted fields.',
    errors,
  });
}

const asTrimmedString = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Social links are OPTIONAL: empty strings are always accepted, but a
 * non-empty value must be a real http(s) URL. Field-specific errors keep the
 * dashboard toast actionable.
 */
function validateSocialLinks(
  links: Record<string, string>,
  errors: Record<string, string>
) {
  const labels: Record<string, string> = {
    github: 'GitHub URL must be a valid URL (e.g. https://github.com/username).',
    linkedin: 'LinkedIn URL must be a valid URL (e.g. https://www.linkedin.com/in/username).',
    instagram: 'Instagram URL must be a valid URL (e.g. https://www.instagram.com/username).',
    twitter: 'Twitter URL must be a valid URL (e.g. https://twitter.com/username).',
  };
  for (const [key, message] of Object.entries(labels)) {
    const value = safeString(links[key]).trim();
    if (value && !isValidHttpUrl(value)) {
      errors[`socialLinks.${key}`] = message;
    }
  }
}

function normalizeSocialLinks(input: any): Record<string, string> {
  const src = input && typeof input === 'object' ? input : {};
  return {
    github: asTrimmedString(src.github),
    linkedin: asTrimmedString(src.linkedin),
    instagram: asTrimmedString(src.instagram),
    twitter: asTrimmedString(src.twitter),
  };
}

/**
 * Canonical Member payload builder.
 * Every field the admin form sends is preserved — nothing silently dropped.
 */
export function normalizeMemberPayload(body: any = {}) {
  return {
    name: asTrimmedString(body.name),
    email: asTrimmedString(body.email).toLowerCase(),
    phone: asTrimmedString(body.phone),
    college: asTrimmedString(body.college) || 'Government College of Engineering, Erode',
    department: asTrimmedString(body.department),
    year: asTrimmedString(body.year),
    registerNumber: asTrimmedString(body.registerNumber),
    skills: asTrimmedString(body.skills),
    areasOfInterest: asTrimmedString(body.areasOfInterest),
    whyJoin: asTrimmedString(body.whyJoin),
    team: asTrimmedString(body.team) || 'Community Members',
    role: asTrimmedString(body.role) || 'Member',
    coordinatorRole: asTrimmedString(body.coordinatorRole),
    photo: asTrimmedString(body.photo),
    socialLinks: normalizeSocialLinks(body.socialLinks),
    order: Math.max(0, Number(body.order) || 0),
    isActive: body.isActive === undefined ? true : Boolean(body.isActive),
  };
}

// GET /api/members  (public)
export async function listMembers(_: any, res: Response) {
  try {
    await connectDB();
    const members = await Member.find({ isActive: { $not: { $eq: false } } }).sort({ team: 1, order: 1, name: 1 }).lean();
    const grouped: Record<string, any[]> = {};
    for (const t of TEAMS) grouped[t] = [];
    for (const m of members) {
      if (!grouped[m.team]) grouped[m.team] = [];
      grouped[m.team].push(serialize(m));
    }
    res.json({ success: true, grouped, teams: TEAMS, members: members.map(serialize) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/members
export async function adminListMembers(_: any, res: Response) {
  try {
    await connectDB();
    const members = await Member.find().sort({ team: 1, order: 1, name: 1 }).lean();
    res.json({ success: true, members: members.map(serialize) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/admin/members
export async function createMember(req: any, res: Response) {
  try {
    await connectDB();

    const data = normalizeMemberPayload(req.body);

    const errors: Record<string, string> = {};
    if (!data.name) errors.name = 'Member name is required.';
    if (!data.email) errors.email = 'Email is required.';
    else if (!EMAIL_RE.test(data.email)) errors.email = 'Enter a valid email address.';
    validateSocialLinks(data.socialLinks, errors);
    if (Object.keys(errors).length > 0) {
      logAdminAction('POST /api/admin/members [invalid]', req, data);
      validationError(res, errors);
      return;
    }

    const member = await Member.create(data);
    logAdminAction('POST /api/admin/members', req, data);
    res.status(201).json({ success: true, message: 'Member added.', member: serialize(member) });
  } catch (err: any) {
    if (err?.code === 11000) {
      const dupField = String(Object.keys(err.keyPattern || {})[0] || 'email');
      validationError(res, { [dupField]: `That ${dupField} is already used by another member.` });
      return;
    }
    if (err?.name === 'ValidationError') {
      const errors: Record<string, string> = {};
      for (const [path, e] of Object.entries<any>(err.errors || {})) errors[path] = e.message;
      validationError(res, errors);
      return;
    }
    console.error('[ADMIN MEMBER] create failed:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /api/admin/members/:id
export async function updateMember(req: any, res: Response) {
  try {
    await connectDB();
    const member = await Member.findById(req.params.id);
    if (!member) {
      res.status(404).json({ success: false, message: 'Member not found.' });
      return;
    }

    // Overlay provided fields on the existing document; unspecified fields stay untouched.
    const overlay: any = {};
    const passthrough = [
      'name', 'email', 'phone', 'college', 'department', 'year', 'registerNumber',
      'skills', 'areasOfInterest', 'whyJoin', 'team', 'role', 'coordinatorRole',
      'photo', 'order', 'isActive',
    ];
    for (const key of passthrough) {
      if (req.body[key] !== undefined) overlay[key] = req.body[key];
    }
    if (req.body.socialLinks !== undefined) overlay.socialLinks = normalizeSocialLinks(req.body.socialLinks);

    const data = normalizeMemberPayload({ ...member.toObject(), ...overlay });

    const errors: Record<string, string> = {};
    // Update rule: an existing required value may never be BLANKED, but a
    // legacy document that never had the value stays fully editable.
    if (!data.name && member.name) errors.name = 'Member name is required.';
    if (!data.email && member.email) errors.email = 'Email is required.';
    else if (data.email && !EMAIL_RE.test(data.email)) errors.email = 'Enter a valid email address.';
    validateSocialLinks(data.socialLinks, errors);
    if (Object.keys(errors).length > 0) {
      logAdminAction(`PUT /api/admin/members/${req.params.id} [invalid]`, req, data);
      validationError(res, errors);
      return;
    }

    // Apply back ONLY the fields the client actually sent, so untouched paths
    // on legacy documents are never marked modified (keeps validateModifiedOnly
    // meaningful — missing-on-purpose legacy fields stay editable).
    for (const key of Object.keys(overlay)) {
      member[key] = data[key];
    }

    // validateModifiedOnly keeps legacy members (created before richer fields
    // existed) editable while still validating everything the admin changed.
    await member.save({ validateModifiedOnly: true });

    logAdminAction(`PUT /api/admin/members/${req.params.id}`, req, data);
    res.json({ success: true, message: 'Member updated.', member: serialize(member) });
  } catch (err: any) {
    if (err?.code === 11000) {
      const dupField = String(Object.keys(err.keyPattern || {})[0] || 'email');
      validationError(res, { [dupField]: `That ${dupField} is already used by another member.` });
      return;
    }
    if (err?.name === 'ValidationError') {
      const errors: Record<string, string> = {};
      for (const [path, e] of Object.entries<any>(err.errors || {})) errors[path] = e.message;
      validationError(res, errors);
      return;
    }
    console.error('[ADMIN MEMBER] update failed:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/admin/members/:id
export async function deleteMember(req: any, res: Response) {
  try {
    await connectDB();
    await Member.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Member removed.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
