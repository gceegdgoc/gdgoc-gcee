import type { Response } from 'express';
import { Member, TEAMS } from '../models';
import { connectDB } from '../config/db';

function serialize(m: any) {
  return {
    _id: m._id,
    name: m.name,
    team: m.team,
    role: m.role,
    coordinatorRole: m.coordinatorRole || '',
    department: m.department,
    year: m.year,
    photo: m.photo,
    socialLinks: m.socialLinks,
  };
}

// GET /api/members  (public)
export async function listMembers(_: any, res: Response) {
  try {
    await connectDB();
    const members = await Member.find({ isActive: true }).sort({ team: 1, order: 1, name: 1 }).lean();
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
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'Member name is required.' });
      return;
    }
    const member = await Member.create({
      name,
      team: req.body.team || 'Community Members',
      role: req.body.role || 'Member',
      coordinatorRole: req.body.coordinatorRole || '',
      department: req.body.department || '',
      year: req.body.year || '',
      photo: req.body.photo || '',
      socialLinks: req.body.socialLinks || {},
      order: Number(req.body.order) || 0,
    });
    res.status(201).json({ success: true, message: 'Member added.', member: serialize(member) });
  } catch (err: any) {
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
    const allowed = ['name', 'team', 'role', 'coordinatorRole', 'department', 'year', 'photo', 'socialLinks', 'order', 'isActive'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) (member as any)[key] = req.body[key];
    }
    await member.save();
    res.json({ success: true, message: 'Member updated.', member: serialize(member) });
  } catch (err: any) {
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
