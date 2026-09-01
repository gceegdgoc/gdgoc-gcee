import type { Response } from 'express';
import mongoose from 'mongoose';
import { Student, Registration, Attendance } from '../models';
import { publicStudent } from './auth.controller';
import { connectDB } from '../config/db';

function badStudentId(req: any, res: Response): boolean {
  if (mongoose.Types.ObjectId.isValid(req.params.id)) return false;
  res.status(404).json({ success: false, message: 'Student not found.' });
  return true;
}

// GET /api/admin/students
export async function adminListStudents(req: any, res: Response) {
  try {
    await connectDB();
    const { q, department } = req.query;
    const filter: Record<string, unknown> = {};
    if (q) {
      filter.$or = [
        { name: { $regex: String(q), $options: 'i' } },
        { email: { $regex: String(q), $options: 'i' } },
        { rollNumber: { $regex: String(q), $options: 'i' } },
      ];
    }
    if (department) filter.department = department;

    const students = await Student.find(filter).sort({ createdAt: -1 }).limit(500).lean();

    const ids = students.map((s) => s._id);
    const [attendanceCounts, registrationCounts] = await Promise.all([
      Attendance.aggregate([
        { $match: { studentId: { $in: ids }, status: 'PRESENT' } },
        { $group: { _id: '$studentId', count: { $sum: 1 } } },
      ]),
      Registration.aggregate([
        { $match: { studentId: { $in: ids }, status: 'REGISTERED' } },
        { $group: { _id: '$studentId', count: { $sum: 1 } } },
      ]),
    ]);

    const attMap = new Map(attendanceCounts.map((r) => [String(r._id), r.count]));
    const regMap = new Map(registrationCounts.map((r) => [String(r._id), r.count]));

    res.json({
      success: true,
      students: students.map((s) => ({
        ...publicStudent(s),
        isVerified: s.isVerified || false,
        eventsAttended: attMap.get(String(s._id)) || 0,
        eventsRegistered: regMap.get(String(s._id)) || 0,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/students/:id
export async function adminGetStudent(req: any, res: Response) {
  try {
    await connectDB();
    if (badStudentId(req, res)) return;
    const student = await Student.findById(req.params.id).lean();
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found.' });
      return;
    }
    const [attended, registered] = await Promise.all([
      Attendance.countDocuments({ studentId: student._id, status: 'PRESENT' }),
      Registration.countDocuments({ studentId: student._id, status: 'REGISTERED' }),
    ]);
    res.json({ success: true, student: { ...publicStudent(student), eventsAttended: attended, eventsRegistered: registered } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/admin/students/:id/status
export async function adminToggleStudentStatus(req: any, res: Response) {
  try {
    await connectDB();
    if (badStudentId(req, res)) return;
    const student = await Student.findById(req.params.id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found.' });
      return;
    }
    student.isActive = !student.isActive;
    await student.save();
    res.json({ success: true, message: student.isActive ? 'Student account enabled.' : 'Student account disabled.', isActive: student.isActive });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/admin/students/:id/points
export async function adminUpdateStudentPoints(req: any, res: Response) {
  try {
    await connectDB();
    const student = await Student.findById(req.params.id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found.' });
      return;
    }
    student.points = Number(req.body.points) || 0;
    await student.save();
    res.json({ success: true, message: 'Points updated.', points: student.points });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/admin/students/:id
export async function adminDeleteStudent(req: any, res: Response) {
  try {
    await connectDB();
    if (badStudentId(req, res)) return;
    await Student.findByIdAndDelete(req.params.id);
    await Attendance.deleteMany({ studentId: req.params.id });
    await Registration.deleteMany({ studentId: req.params.id });
    res.json({ success: true, message: 'Student removed from the platform.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
