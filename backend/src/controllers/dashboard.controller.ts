import type { Response } from 'express';
import { Student, EventModel, Registration, Attendance, Certificate, CertificateCampaign, Member, GoogleFormRegistration, Resource } from '../models';
import type { AuthRequest } from '../middleware/auth';
import { todayIST, formatHumanDate } from '../utils/dates';
import { connectDB } from '../config/db';

// GET /api/dashboard  (student)
export async function studentDashboard(req: AuthRequest, res: Response) {
  try {
    await connectDB();
    const studentId = req.studentId;

    const [registeredEvents, attendanceRecords, certificates] = await Promise.all([
      Registration.find({ studentId, status: 'REGISTERED' }).populate('eventId').lean(),
      Attendance.find({ studentId }).lean(),
      Certificate.find({ studentId, status: 'VALID' }).lean(),
    ]);

    const attended = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
    const today = todayIST();

    const upcoming = registeredEvents
      .map((r) => r.eventId as any)
      .filter((e) => e && e.date >= today && e.status !== 'CANCELLED')
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
      .slice(0, 5);

    const completedAttended = attendanceRecords.filter((a) => a.status === 'PRESENT').length;

    const stats = {
      registered: registeredEvents.filter((r) => (r.eventId as any)?.status !== 'CANCELLED').length,
      attended,
      attendancePercent: 0,
      certificates: certificates.length,
    };

    res.json({
      success: true,
      stats,
      upcomingEvents: upcoming.map((e: any) => ({
        _id: e._id,
        eventId: e.eventId,
        title: e.title,
        date: e.date,
        dateLabel: formatHumanDate(e.date),
        startTime: e.startTime,
        endTime: e.endTime,
        venue: e.venue,
        category: e.category,
        isInauguration: e.isInauguration,
        isCertificateEligible: e.isCertificateEligible,
        banner: e.banner,
      })),
      recentAttendance: attendanceRecords
        .sort((a, b) => String(b.markedAt).localeCompare(String(a.markedAt)))
        .slice(0, 10)
        .map((a) => ({
          id: a._id,
          eventDate: a.eventDate,
          status: a.status,
          method: a.method,
        })),
      completedAttended,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/dashboard
export async function adminDashboard(_: any, res: Response) {
  try {
    await connectDB();
    const today = todayIST();

    const [
      totalStudents,
      verifiedStudents,
      totalEvents,
      upcomingEvents,
      completedEvents,
      attendanceRecords,
      certificates,
      validCertificates,
      members,
      campaigns,
      totalFormRegistrations,
      recentFormRegistrations,
      eventsEmailSent,
      totalResources,
      recentResources,
    ] = await Promise.all([
      Student.countDocuments({ isActive: true }),
      Student.countDocuments({ isActive: true, isVerified: true }),
      EventModel.countDocuments(),
      EventModel.countDocuments({ status: { $nin: ['COMPLETED', 'CANCELLED'] }, date: { $gte: today } }),
      EventModel.countDocuments({ $or: [{ status: 'COMPLETED' }, { status: { $nin: ['COMPLETED', 'CANCELLED'] }, date: { $lt: today } }] }),
      Attendance.countDocuments(),
      Certificate.countDocuments(),
      Certificate.countDocuments({ status: 'VALID' }),
      Member.countDocuments({ isActive: true }),
      CertificateCampaign.find().sort({ createdAt: -1 }).lean(),
      GoogleFormRegistration.countDocuments(),
      GoogleFormRegistration.find().sort({ submittedAt: -1 }).limit(5).lean(),
      EventModel.countDocuments({ emailSent: true }),
      Resource.countDocuments(),
      Resource.find().sort({ createdAt: -1 }).limit(6).lean(),
    ]);

    // Chart: registrations per event (top 8)
    const registrationTrends = await Registration.aggregate([
      { $match: { status: 'REGISTERED' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$registeredAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 60 },
    ]);

    // Chart: attendance records per day (top 60)
    const attendanceTrends = await Attendance.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$markedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 60 },
    ]);

    // Chart: event participation by category
    const participationByCategory = await Registration.aggregate([
      { $match: { status: 'REGISTERED' } },
      {
        $lookup: {
          from: EventModel.collection.name,
          localField: 'eventId',
          foreignField: '_id',
          as: 'event',
        },
      },
      { $unwind: { path: '$event', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$event.category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Chart: certificate stats
    const certByStatus = await Certificate.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Chart: attendance per event (top 8)
    const attendanceByEvent = await Attendance.aggregate([
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
      { $group: { _id: '$event.title', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    // Chart: resources by category
    const resourcesByCategory = await Resource.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      stats: {
        totalStudents,
        verifiedStudents,
        totalEvents,
        upcomingEvents,
        completedEvents,
        attendanceRecords,
        certificates,
        validCertificates,
        pendingCertificates: Math.max(certificates - validCertificates, 0),
        members,
        totalFormRegistrations,
        eventsEmailSent,
        totalResources,
      },
      charts: {
        registrationTrends,
        attendanceTrends,
        participationByCategory,
        certByStatus,
        attendanceByEvent,
        resourcesByCategory,
      },
      recentFormRegistrations: recentFormRegistrations.map((r) => ({
        _id: r._id,
        name: r.name,
        email: r.email,
        department: r.department,
        year: r.year,
        isRead: r.isRead,
        submittedAt: r.submittedAt,
      })),
      recentResources: recentResources.map((r) => ({
        _id: r._id,
        title: r.title,
        description: r.description,
        url: r.url,
        category: r.category,
        uploadedBy: r.uploadedBy,
        createdAt: r.createdAt,
      })),
      campaigns,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
