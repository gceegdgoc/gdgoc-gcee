import type { Response } from 'express';
import { Attendance, Student, EventModel } from '../models';
import { connectDB } from '../config/db';

const BASE_POINTS = 10;
const BONUS: Record<string, number> = {
  Hackathon: 15,
  Workshop: 5,
  'Hands-on Session': 5,
  'Coding Session': 5,
};

/** Community participation leaderboard. Not the sole basis for certificates. */
export async function getLeaderboard(req: any, res: Response) {
  try {
    await connectDB();
    const { limit } = req.query;
    const rows = await Attendance.aggregate([
      { $match: { status: 'PRESENT' } },
      {
        $lookup: {
          from: EventModel.collection.name,
          localField: 'eventId',
          foreignField: '_id',
          as: 'event',
        },
      },
      { $unwind: { path: '$event', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$studentId',
          attended: { $sum: 1 },
          categories: { $push: '$event.category' },
        },
      },
    ]);

    const students = await Student.find({
      _id: { $in: rows.map((r) => r._id) },
      isActive: true,
    })
      .select('name department year profileImage rollNumber')
      .lean();

    const studentMap = new Map(students.map((s) => [String(s._id), s]));

    const board = rows
      .filter((r) => studentMap.has(String(r._id)))
      .map((r) => {
        const categories: string[] = (r.categories || []).filter(Boolean);
        let points = r.attended * BASE_POINTS;
        for (const c of categories) points += BONUS[c] || 0;

        const student = studentMap.get(String(r._id))!;
        const community = student as any;
        return {
          studentId: String(r._id),
          name: community.name,
          department: community.department,
          year: community.year,
          profileImage: community.profileImage,
          rollNumber: community.rollNumber,
          points: points + (community.points || 0),
          eventsAttended: r.attended,
        };
      })
      .sort((a, b) => b.points - a.points)
      .slice(0, Number(limit) || 50);

    res.json({
      success: true,
      leaderboard: board.map((entry, i) => ({ ...entry, rank: i + 1 })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
