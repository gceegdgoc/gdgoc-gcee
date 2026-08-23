import type { Request, Response } from 'express';
import { EventModel, Feedback } from '../models';
import { connectDB } from '../config/db';
import type { AuthRequest } from '../middleware/auth';

// POST /api/events/:eventId/feedback (student, optional auth)
export async function submitFeedback(req: AuthRequest, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const event = await EventModel.findOne({ eventId }).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const { rating, comment, name } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
      return;
    }

    const studentId = req.studentId || null;
    const submitterName = name || 'Anonymous';

    const fb = await Feedback.create({
      eventId: event._id,
      studentId,
      name: submitterName,
      rating: Math.round(rating),
      comment: (comment || '').substring(0, 1000),
    });

    res.status(201).json({ success: true, message: 'Thank you for your feedback!', feedback: fb });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/events/:eventId/feedback (public)
export async function getEventFeedback(req: Request, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const event = await EventModel.findOne({ eventId }).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const items = await Feedback.find({ eventId: event._id }).sort({ createdAt: -1 }).limit(50).lean();
    const avgResult = await Feedback.aggregate([
      { $match: { eventId: event._id } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, total: { $sum: 1 } } },
    ]);

    const avg = avgResult.length > 0 ? avgResult[0] : { avgRating: 0, total: 0 };

    res.json({
      success: true,
      feedback: items.map((f) => ({
        _id: f._id,
        name: f.name,
        rating: f.rating,
        comment: f.comment,
        createdAt: f.createdAt,
      })),
      stats: {
        averageRating: Math.round(avg.avgRating * 10) / 10,
        totalFeedback: avg.total,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
