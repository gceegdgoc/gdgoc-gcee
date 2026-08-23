import type { Response } from 'express';
import { CertificateCampaign, EventModel, Attendance, Student, Certificate } from '../models';
import { env } from '../config/env';
import { todayIST } from '../utils/dates';
import { nextCertificateId } from '../utils/ids';
import { generateQRCodeDataURL } from '../utils/qr';
import { generateCertificatePDF } from '../utils/pdf';
import { sendCertificateEmail, emailIsConfigured } from '../utils/email';
import { connectDB } from '../config/db';

export interface EligibleEventInfo {
  _id: any;
  eventId: string;
  title: string;
  date: string;
}

export interface EligibilityResult {
  eligibleEvents: EligibleEventInfo[];
  perStudent: {
    studentId: string;
    name: string;
    email: string;
    rollNumber: string;
    department: string;
    year: string;
    attended: number;
    attendancePercentage: number;
    qualifies: boolean;
  }[];
  qualifiedCount: number;
}

/**
 * Core certificate eligibility algorithm.
 * Eligible events = events within campaign window, certificate-eligible,
 * NOT inauguration, and completed (past / today).
 */
export async function computeEligibility(campaignId: string): Promise<EligibilityResult> {
  await connectDB();
  const campaign = await CertificateCampaign.findById(campaignId);
  if (!campaign) throw new Error('Campaign not found.');

  const today = todayIST();

  const events = await EventModel.find({
    date: { $gte: campaign.startDate, $lte: campaign.endDate < today ? campaign.endDate : today },
    isCertificateEligible: true,
    isInauguration: false,
    status: { $ne: 'CANCELLED' },
  })
    .sort({ date: 1 })
    .lean();

  const eligibleEvents: EligibleEventInfo[] = events.map((e) => ({
    _id: e._id,
    eventId: e.eventId,
    title: e.title,
    date: e.date,
  }));

  const eligibleEventIds = eligibleEvents.map((e) => e._id);

  const attendance = await Attendance.find({
    eventId: { $in: eligibleEventIds },
    status: 'PRESENT',
  }).lean();

  const attendedCounts = new Map<string, number>();
  for (const a of attendance) {
    const key = String(a.studentId);
    attendedCounts.set(key, (attendedCounts.get(key) || 0) + 1);
  }

  const students = await Student.find({ isActive: true }).sort({ name: 1 }).lean();

  const perStudent = students.map((st) => {
    const attended = attendedCounts.get(String(st._id)) || 0;
    const attendancePercentage = eligibleEvents.length
      ? Math.round((attended / eligibleEvents.length) * 100)
      : 0;

    const qualifies =
      eligibleEvents.length > 0 &&
      attendancePercentage >= campaign.minimumAttendancePercentage &&
      attended >= campaign.minimumEligibleEvents;

    return {
      studentId: String(st._id),
      name: st.name,
      email: st.email,
      rollNumber: st.rollNumber || '',
      department: st.department || '',
      year: st.year || '',
      attended,
      attendancePercentage,
      qualifies,
    };
  });

  return {
    eligibleEvents,
    perStudent,
    qualifiedCount: perStudent.filter((s) => s.qualifies).length,
  };
}

async function buildCertificateDoc(campaign: any, student: any, eligibility: EligibilityResult) {
  const attended = eligibility.perStudent.find((s) => s.studentId === String(student._id));
  if (!attended || !attended.qualifies) return null;

  const certificateId = await nextCertificateId();
  const verificationUrl = `${env.appUrl}/certificate/${certificateId}`;
  const qrCode = await generateQRCodeDataURL(verificationUrl);

  const eventDate = eligibility.eligibleEvents[0]?.date || todayIST();
  const eventName = eligibility.eligibleEvents[0]?.title || 'GDGoC GCEE Community Participation';

  const issueDate = todayIST();

  // Generate and store the PDF buffer so the exact same PDF is served on download.
  const pdfBuffer = await generateCertificatePDF({
    certificateId,
    studentName: student.name,
    eventName,
    eventDate,
    issueDate,
    qrCodeDataURL: qrCode,
    verificationUrl,
  });

  return Certificate.create({
    certificateId,
    campaignId: campaign._id,
    studentId: student._id,
    studentName: student.name,
    studentEmail: student.email,
    organization: 'GDGoC GCEE',
    institution: 'Government College of Engineering, Erode',
    eventDate,
    eventName,
    issueDate,
    verificationUrl,
    qrCode,
    pdfBuffer,
    status: 'VALID',
  });
}

// GET /api/admin/certificate-campaigns
export async function listCampaigns(_: any, res: Response) {
  try {
    await connectDB();
    const campaigns = await CertificateCampaign.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, campaigns });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/certificate-campaigns/:id
export async function getCampaign(req: any, res: Response) {
  try {
    await connectDB();
    const campaign = await CertificateCampaign.findById(req.params.id).lean();
    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found.' });
      return;
    }
    const certs = await Certificate.find({ campaignId: campaign._id }).lean();
    res.json({
      success: true,
      campaign,
      certificates: certs.map((c) => ({
        certificateId: c.certificateId,
        studentName: c.studentName,
        studentEmail: c.studentEmail,
        status: c.status,
        attendancePercentage: 0,
        issueDate: c.issueDate,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/admin/certificate-campaigns
export async function createCampaign(req: any, res: Response) {
  try {
    await connectDB();
    const { name, startDate, endDate } = req.body;
    if (!name || !startDate || !endDate) {
      res.status(400).json({ success: false, message: 'Name, start date and end date are required.' });
      return;
    }
    if (startDate > endDate) {
      res.status(400).json({ success: false, message: 'Start date must be before end date.' });
      return;
    }

    const campaign = await CertificateCampaign.create({
      name,
      description: req.body.description || '',
      startDate,
      endDate,
      minimumAttendancePercentage: Number(req.body.minimumAttendancePercentage) || 75,
      minimumEligibleEvents: Number(req.body.minimumEligibleEvents) || 1,
      releaseDate: req.body.releaseDate || '',
      certificateTemplate: req.body.certificateTemplate || 'default',
      status: req.body.status || 'ACTIVE',
    });
    res.status(201).json({ success: true, message: 'Certificate campaign created.', campaign });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /api/admin/certificate-campaigns/:id
export async function updateCampaign(req: any, res: Response) {
  try {
    await connectDB();
    const campaign = await CertificateCampaign.findById(req.params.id);
    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found.' });
      return;
    }
    const allowed = ['name', 'description', 'startDate', 'endDate', 'minimumAttendancePercentage', 'minimumEligibleEvents', 'releaseDate', 'certificateTemplate', 'status'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        (campaign as any)[key] = key.startsWith('minimum') ? Number(req.body[key]) : req.body[key];
      }
    }
    await campaign.save();
    res.json({ success: true, message: 'Campaign updated.', campaign });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/admin/certificate-campaigns/:id
export async function deleteCampaign(req: any, res: Response) {
  try {
    await connectDB();
    const campaign = await CertificateCampaign.findById(req.params.id);
    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found.' });
      return;
    }
    await Certificate.updateMany({ campaignId: campaign._id }, { $set: { status: 'REVOKED' } });
    await campaign.deleteOne();
    res.json({ success: true, message: 'Campaign deleted. Its certificates were revoked.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/admin/certificate-campaigns/:id/calculate
export async function calculateEligibility(req: any, res: Response) {
  try {
    await connectDB();
    const result = await computeEligibility(req.params.id);
    const campaign = await CertificateCampaign.findById(req.params.id).lean();
    const generatedCount = await Certificate.countDocuments({ campaignId: req.params.id });

    res.json({
      success: true,
      message: 'Eligibility calculated.',
      eligibleEvents: result.eligibleEvents,
      perStudent: result.perStudent,
      qualifiedCount: result.qualifiedCount,
      studentsCount: result.perStudent.length,
      generatedCount,
      campaign,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/admin/certificate-campaigns/:id/generate
export async function generateCertificates(req: any, res: Response) {
  try {
    await connectDB();
    const campaign = await CertificateCampaign.findById(req.params.id);
    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found.' });
      return;
    }

    const eligibility = await computeEligibility(String(campaign._id));

    let generated = 0;
    const skipped: string[] = [];
    const errors: { student: string; error: string }[] = [];

    const qualifiedStudents = await Student.find({ isActive: true }).sort({ name: 1 }).lean();

    for (const student of qualifiedStudents) {
      const per = eligibility.perStudent.find((s) => s.studentId === String(student._id));
      if (!per || !per.qualifies) continue;

      const exists = await Certificate.exists({ studentId: student._id, campaignId: campaign._id });
      if (exists) {
        skipped.push(student.name);
        continue;
      }

      try {
        await buildCertificateDoc(campaign, student, eligibility);
        generated += 1;
      } catch (err) {
        errors.push({ student: student.name, error: (err as Error).message });
      }
    }

    campaign.generatedAt = new Date();
    await campaign.save();

    res.json({
      success: true,
      message: `Certificates generated: ${generated}.`,
      generated,
      skipped,
      errors,
      qualifiedCount: eligibility.qualifiedCount,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/admin/certificate-campaigns/:id/generate/:studentId
export async function generateSingleCertificate(req: any, res: Response) {
  try {
    await connectDB();
    const campaign = await CertificateCampaign.findById(req.params.id);
    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found.' });
      return;
    }

    const student = await Student.findById(req.params.studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found.' });
      return;
    }

    const eligibility = await computeEligibility(String(campaign._id));
    const per = eligibility.perStudent.find((s) => s.studentId === String(student._id));
    if (!per || !per.qualifies) {
      res.status(400).json({
        success: false,
        message: `This student does not meet the eligibility criteria (attended ${per?.attended ?? 0}, ${per?.attendancePercentage ?? 0}%).`,
      });
      return;
    }

    const exists = await Certificate.exists({ studentId: student._id, campaignId: campaign._id });
    if (exists) {
      res.status(400).json({ success: false, message: 'Certificate already exists for this student. Use regenerate to update it.' });
      return;
    }

    const cert = await buildCertificateDoc(campaign, student, eligibility);

    // Optional, non-blocking email notification.
    if (emailIsConfigured()) {
      sendCertificateEmail({
        to: student.email,
        studentName: student.name,
        certificateId: cert!.certificateId,
        verificationUrl: cert!.verificationUrl,
        downloadUrl: `${env.appUrl}/api/certificates/${cert!.certificateId}/download`,
      }).catch(() => {});
    }

    res.status(201).json({ success: true, message: 'Certificate generated successfully.', certificate: cert });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
