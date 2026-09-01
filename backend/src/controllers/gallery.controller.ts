import type { Response } from 'express';
import { GalleryItem, EventModel } from '../models';
import { bufferToDataURL } from '../middleware/upload';
import { connectDB } from '../config/db';
import { eventQuery } from './event.controller';

// GET /api/gallery  (public)
export async function listGallery(req: any, res: Response) {
  try {
    await connectDB();
    const { category } = req.query;
    const filter: Record<string, unknown> = {};
    if (category && category !== 'All') filter.category = category;

    const items = await GalleryItem.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json({
      success: true,
      items: items.map((g) => ({
        id: g._id,
        title: g.title,
        category: g.category,
        image: g.image,
        createdAt: g.createdAt,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/admin/gallery  (admin, image upload)
export async function createGalleryItem(req: any, res: Response) {
  try {
    await connectDB();
    const { title, category } = req.body;
    const image = req.file ? bufferToDataURL(req.file.buffer, req.file.mimetype) : req.body.image;

    if (!image) {
      res.status(400).json({ success: false, message: 'An image is required.' });
      return;
    }

    let resolvedEventId: any = null;
    if (req.body.eventId) {
      const event = await EventModel.findOne(eventQuery(req.body.eventId));
      if (event) resolvedEventId = event._id;
    }

    const item = await GalleryItem.create({
      title: title || '',
      category: category || 'Meetups',
      image,
      uploadedBy: req.adminId || null,
      eventId: resolvedEventId,
    });

    res.status(201).json({ success: true, message: 'Image uploaded to gallery.', item });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/admin/gallery/:id
export async function deleteGalleryItem(req: any, res: Response) {
  try {
    await connectDB();
    await GalleryItem.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Gallery item removed.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
