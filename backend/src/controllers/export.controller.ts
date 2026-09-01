import type { Response } from 'express';
import ExcelJS from 'exceljs';
import { EventModel, Registration, Attendance, Student } from '../models';
import { connectDB } from '../config/db';
import { eventQuery } from './event.controller';

export async function exportEventRegistrations(req: any, res: Response) {
  try {
    await connectDB();

    const event = await EventModel.findOne(eventQuery(req.params.eventId)).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const registrations = await Registration.find({ eventId: event._id })
      .populate('studentId', 'name email rollNumber department year phone')
      .sort({ registeredAt: 1 })
      .lean();

    const attendanceRecords = await Attendance.find({ eventId: event._id }).lean();
    const attMap = new Map(attendanceRecords.map((a) => [String(a.studentId), a]));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GDGoC GCEE';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Registrations');

    sheet.columns = [
      { header: '#', key: 'sl', width: 6 },
      { header: 'Name', key: 'name', width: 28 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Roll Number', key: 'rollNumber', width: 16 },
      { header: 'Department', key: 'department', width: 32 },
      { header: 'Year', key: 'year', width: 8 },
      { header: 'Phone', key: 'phone', width: 14 },
      { header: 'Registration Date', key: 'registeredAt', width: 20 },
      { header: 'Attendance Status', key: 'attendanceStatus', width: 18 },
      { header: 'Attendance Method', key: 'attendanceMethod', width: 18 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    registrations.forEach((reg, i) => {
      const student = reg.studentId as any;
      if (!student) return;
      const att = attMap.get(String(student._id));
      sheet.addRow({
        sl: i + 1,
        name: student.name || '',
        email: student.email || '',
        rollNumber: student.rollNumber || '',
        department: student.department || '',
        year: student.year || '',
        phone: student.phone || '',
        registeredAt: reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString('en-IN') : '',
        attendanceStatus: att?.status || 'Not marked',
        attendanceMethod: att?.method || '',
      });
    });

    const fileName = `registrations-${event.eventId}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function exportStudents(_: any, res: Response) {
  try {
    await connectDB();

    const students = await Student.find().sort({ createdAt: -1 }).lean();

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

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GDGoC GCEE';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Students');

    sheet.columns = [
      { header: '#', key: 'sl', width: 6 },
      { header: 'Name', key: 'name', width: 28 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 14 },
      { header: 'Roll Number', key: 'rollNumber', width: 16 },
      { header: 'Department', key: 'department', width: 32 },
      { header: 'Year', key: 'year', width: 8 },
      { header: 'Events Registered', key: 'eventsRegistered', width: 18 },
      { header: 'Events Attended', key: 'eventsAttended', width: 16 },
      { header: 'Points', key: 'points', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Joined', key: 'joinedAt', width: 16 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    students.forEach((s, i) => {
      sheet.addRow({
        sl: i + 1,
        name: s.name || '',
        email: s.email || '',
        phone: s.phone || '',
        rollNumber: s.rollNumber || '',
        department: s.department || '',
        year: s.year || '',
        eventsRegistered: regMap.get(String(s._id)) || 0,
        eventsAttended: attMap.get(String(s._id)) || 0,
        points: s.points || 0,
        status: s.isActive ? 'Active' : 'Disabled',
        joinedAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '',
      });
    });

    const fileName = `students-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
