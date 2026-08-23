import type { Response } from 'express';
import { Resource, RESOURCE_CATEGORIES } from '../models';
import { connectDB } from '../config/db';

function serialize(r: any) {
  return {
    _id: r._id,
    title: r.title,
    description: r.description || '',
    link: r.link || r.url || '',
    url: r.url || r.link || '',
    category: r.category,
    type: r.type || 'link',
    uploadedBy: r.uploadedBy || 'GDGoC GCEE',
    createdAt: r.createdAt,
  };
}

/** Safe request summary logging (field names only — never values). */
function logAdminAction(route: string, req: any, normalized?: Record<string, unknown>) {
  try {
    const keys = req?.body && typeof req.body === 'object' ? Object.keys(req.body) : [];
    console.log(
      `[ADMIN RESOURCE] ${route} | received fields: [${keys.join(', ')}]` +
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

/**
 * Canonical Resource payload builder.
 * Accepts link/url/resourceUrl aliases and always produces `link`.
 */
export function normalizeResourcePayload(body: any = {}) {
  const link = asTrimmedString(body.link || body.resourceLink || body.resourceUrl || body.url);
  return {
    title: asTrimmedString(body.title),
    description: asTrimmedString(body.description),
    link,
    url: link,
    category: asTrimmedString(body.category) || 'Other',
    type: asTrimmedString(body.type) || 'link',
    uploadedBy: asTrimmedString(body.uploadedBy) || 'GDGoC GCEE',
  };
}

// GET /api/resources  (public)
export async function listResources(req: any, res: Response) {
  try {
    await connectDB();
    const { category, q } = req.query;
    const filter: Record<string, unknown> = {};
    if (category && category !== 'All') filter.category = category;
    if (q) filter.title = { $regex: String(q), $options: 'i' };

    const resources = await Resource.find(filter).sort({ createdAt: -1 }).limit(300).lean();
    res.json({ success: true, resources: resources.map(serialize), categories: RESOURCE_CATEGORIES });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/resources
export async function adminListResources(_: any, res: Response) {
  try {
    await connectDB();
    const resources = await Resource.find().sort({ createdAt: -1 }).limit(500).lean();
    res.json({ success: true, resources: resources.map(serialize), categories: RESOURCE_CATEGORIES });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/admin/resources
export async function createResource(req: any, res: Response) {
  try {
    await connectDB();

    const data = normalizeResourcePayload(req.body);

    const errors: Record<string, string> = {};
    if (!data.title) errors.title = 'Title is required.';
    if (!data.link) errors.link = 'Resource link is required.';
    if (data.link && !/^https?:\/\//i.test(data.link)) {
      errors.link = 'Link must start with http:// or https://';
    }
    if (!RESOURCE_CATEGORIES.includes(data.category)) {
      errors.category = `Category must be one of: ${RESOURCE_CATEGORIES.join(', ')}`;
    }
    if (Object.keys(errors).length > 0) {
      logAdminAction('POST /api/admin/resources [invalid]', req, data);
      validationError(res, errors);
      return;
    }

    const resource = await Resource.create(data);
    logAdminAction('POST /api/admin/resources', req, data);
    res.status(201).json({ success: true, message: 'Resource added.', resource: serialize(resource) });
  } catch (err: any) {
    if (err?.name === 'ValidationError') {
      const errors: Record<string, string> = {};
      for (const [path, e] of Object.entries<any>(err.errors || {})) errors[path] = e.message;
      validationError(res, errors);
      return;
    }
    console.error('[ADMIN RESOURCE] create failed:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /api/admin/resources/:id
export async function updateResource(req: any, res: Response) {
  try {
    await connectDB();
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      res.status(404).json({ success: false, message: 'Resource not found.' });
      return;
    }

    // Start from the existing document and overlay normalized fields.
    const data = normalizeResourcePayload({
      title: resource.title,
      description: resource.description,
      link: resource.link || resource.url,
      category: resource.category,
      type: resource.type,
      uploadedBy: resource.uploadedBy,
      ...req.body,
    });

    const errors: Record<string, string> = {};
    if (!data.title) errors.title = 'Title is required.';
    if (!data.link) errors.link = 'Resource link is required.';
    if (!RESOURCE_CATEGORIES.includes(data.category)) {
      errors.category = `Category must be one of: ${RESOURCE_CATEGORIES.join(', ')}`;
    }
    if (Object.keys(errors).length > 0) {
      logAdminAction(`PUT /api/admin/resources/${req.params.id} [invalid]`, req, data);
      validationError(res, errors);
      return;
    }

    Object.assign(resource, data);
    await resource.save();

    logAdminAction(`PUT /api/admin/resources/${req.params.id}`, req, data);
    res.json({ success: true, message: 'Resource updated.', resource: serialize(resource) });
  } catch (err: any) {
    if (err?.name === 'ValidationError') {
      const errors: Record<string, string> = {};
      for (const [path, e] of Object.entries<any>(err.errors || {})) errors[path] = e.message;
      validationError(res, errors);
      return;
    }
    console.error('[ADMIN RESOURCE] update failed:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/admin/resources/:id
export async function deleteResource(req: any, res: Response) {
  try {
    await connectDB();
    await Resource.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Resource removed.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
