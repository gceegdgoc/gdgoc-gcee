import type { Response } from 'express';
import { Resource, RESOURCE_CATEGORIES } from '../models';
import { connectDB } from '../config/db';

function serialize(r: any) {
  return {
    _id: r._id,
    title: r.title,
    description: r.description,
    url: r.url,
    category: r.category,
    type: r.type,
    uploadedBy: r.uploadedBy,
    createdAt: r.createdAt,
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
    const { title, url } = req.body;
    if (!title || !url) {
      res.status(400).json({ success: false, message: 'Title and URL are required.' });
      return;
    }
    const resource = await Resource.create({
      title,
      description: req.body.description || '',
      url,
      category: req.body.category || 'Other',
      type: req.body.type || 'link',
      uploadedBy: req.body.uploadedBy || 'GDGoC GCEE',
    });
    res.status(201).json({ success: true, message: 'Resource added.', resource: serialize(resource) });
  } catch (err: any) {
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
    const allowed = ['title', 'description', 'url', 'category', 'type', 'uploadedBy'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) (resource as any)[key] = req.body[key];
    }
    await resource.save();
    res.json({ success: true, message: 'Resource updated.', resource: serialize(resource) });
  } catch (err: any) {
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
