// @ts-nocheck
import type { Response } from 'express';
import { EventModel, Student, Registration, Attendance, Certificate, EventRegistration, GoogleFormRegistration } from '../models';
import { env, getCertificateBaseUrl } from '../config/env';
import { formatDotDate, todayIST } from '../utils/dates';
import { nextCertificateId } from '../utils/ids';
import { generateQRCodeDataURL } from '../utils/qr';
import { generateCertificatePDF } from '../utils/pdf';
import { connectDB } from '../config/db';
import { eventQuery } from './event.controller';

/**
 * Event-based certificate flow.
 *
 * Certificate eligibility is derived from the event registration record and the
 * participation status (Attendance = PRESENT). A plain website signup/account is
 * NEVER enough — the student must have an active Registration for the event and
 * must have been marked as participated by an admin.
 */

function certPublicView(cert: any) {
  return {
    _id: cert._id,
    certificateId: cert.certificateId,
    studentId: cert.studentId,
    studentName: cert.studentName,
    studentEmail: cert.studentEmail || '',
    eventId: cert.eventId,
    eventRegistrationId: cert.eventRegistrationId,
    eventName: cert.eventName || '',
    eventDate: cert.eventDate || '',
    eventDateLabel: formatDotDate(cert.eventDate || ''),
    issueDate: cert.issueDate,
    issueDateLabel: formatDotDate(cert.issueDate),
    participationStatus: cert.participationStatus || 'PARTICIPATED',
    issuedBy: cert.issuedBy || 'admin',
    organization: cert.organization,
    institution: cert.institution,
    verificationUrl: cert.verificationUrl || '',
    qrCode: cert.qrCode || '',
    status: cert.status,
    revokedAt: cert.revokedAt,
    revokeReason: cert.revokeReason || '',
    createdAt: cert.createdAt,
  };
}

/**
 * GET /api/admin/events/:eventId/participants
 * List registered students for an event with participation + certificate status.
 * Supports search (name/email/roll) and participation filter.
 */
export async function listEventParticipants(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const event = await EventModel.findOne(eventQuery(eventId)).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const search = (req.query.search || '').toString().trim().toLowerCase();
    const participation = (req.query.participation || '').toString();

    // Fetch from all registration collections, Attendance & Certificate
    const [regs, eventRegs, formRegs, attendances, certs] = await Promise.all([
      Registration.find({ eventId: event._id, status: 'REGISTERED' })
        .populate('studentId', 'name email rollNumber department year phone college')
        .sort({ registeredAt: 1 })
        .lean(),
      EventRegistration.find({ eventId: event._id, status: { $ne: 'CANCELLED' } }).lean(),
      GoogleFormRegistration.find({ eventId: event._id }).lean(),
      Attendance.find({ eventId: event._id }).lean(),
      Certificate.find({ eventId: event._id }).lean(),
    ]);

    const attByStudentId = new Map<string, string>();
    const attByEmail = new Map<string, string>();
    for (const a of attendances) {
      if (a.studentId) attByStudentId.set(String(a.studentId), a.status);
    }
    for (const er of eventRegs) {
      if (er.email && (er.attendanceStatus === 'attended' || er.attendanceStatus === 'PRESENT')) {
        attByEmail.set(er.email.toLowerCase().trim(), 'PRESENT');
      }
    }

    const certByStudentId = new Map<string, any>();
    const certByEmail = new Map<string, any>();
    for (const c of certs) {
      if (c.studentId) certByStudentId.set(String(c.studentId), c);
      if (c.studentEmail) certByEmail.set(c.studentEmail.toLowerCase().trim(), c);
    }

    const participantMap = new Map<string, any>();

    // Process Registration collection
    for (const r of regs) {
      const st = r.studentId as any;
      if (!st) continue;
      const email = (st.email || '').toLowerCase().trim();
      const key = email || String(st._id);

      const explicitAbsent = attByStudentId.get(String(st._id)) === 'ABSENT' || attByEmail.get(email) === 'ABSENT';
      const isPresent = !explicitAbsent;
      const cert = certByStudentId.get(String(st._id)) || certByEmail.get(email);

      participantMap.set(key, {
        registrationId: r._id,
        studentId: st._id,
        name: st.name || '',
        email: st.email || '',
        rollNumber: st.rollNumber || '',
        department: st.department || '',
        year: st.year || '',
        college: st.college || '',
        registered: true,
        participation: isPresent ? 'PARTICIPATED' : 'NOT_PARTICIPATED',
        certificate: cert
          ? {
              certificateId: cert.certificateId,
              status: cert.status,
              eventDateLabel: formatDotDate(cert.eventDate || ''),
            }
          : null,
      });
    }

    // Process EventRegistration collection
    for (const er of eventRegs) {
      const email = (er.email || '').toLowerCase().trim();
      const key = email || String(er._id);

      if (!participantMap.has(key)) {
        const explicitAbsent =
          er.attendanceStatus === 'absent' ||
          er.attendanceStatus === 'ABSENT' ||
          attByEmail.get(email) === 'ABSENT' ||
          (er.studentId && attByStudentId.get(String(er.studentId)) === 'ABSENT');
        const isPresent = !explicitAbsent;
        const cert = (er.studentId && certByStudentId.get(String(er.studentId))) || certByEmail.get(email);

        participantMap.set(key, {
          registrationId: er._id,
          studentId: er.studentId || null,
          name: er.studentName || 'Student',
          email: er.email || '',
          rollNumber: er.rollNumber || '',
          department: er.department || '',
          year: er.yearOfStudy || er.year || '',
          college: er.college || '',
          registered: true,
          participation: isPresent ? 'PARTICIPATED' : 'NOT_PARTICIPATED',
          certificate: cert
            ? {
                certificateId: cert.certificateId,
                status: cert.status,
                eventDateLabel: formatDotDate(cert.eventDate || ''),
              }
            : null,
        });
      }
    }

    // Process GoogleFormRegistration collection
    for (const fr of formRegs) {
      const email = (fr.email || '').toLowerCase().trim();
      const key = email || String(fr._id);

      if (!participantMap.has(key)) {
        const explicitAbsent = attByEmail.get(email) === 'ABSENT';
        const isPresent = !explicitAbsent;
        const cert = certByEmail.get(email);

        participantMap.set(key, {
          registrationId: fr._id,
          studentId: null,
          name: fr.name || 'Student',
          email: fr.email || '',
          rollNumber: fr.rollNumber || '',
          department: fr.department || '',
          year: fr.year || '',
          college: fr.college || '',
          registered: true,
          participation: isPresent ? 'PARTICIPATED' : 'NOT_PARTICIPATED',
          certificate: cert
            ? {
                certificateId: cert.certificateId,
                status: cert.status,
                eventDateLabel: formatDotDate(cert.eventDate || ''),
              }
            : null,
        });
      }
    }

    let participants = Array.from(participantMap.values());

    if (search) {
      participants = participants.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          (p.email || '').toLowerCase().includes(search) ||
          (p.rollNumber || '').toLowerCase().includes(search) ||
          String(p.registrationId).toLowerCase().includes(search)
      );
    }

    if (participation === 'PARTICIPATED') {
      participants = participants.filter((p) => p.participation === 'PARTICIPATED');
    } else if (participation === 'NOT_PARTICIPATED') {
      participants = participants.filter((p) => p.participation === 'NOT_PARTICIPATED');
    }

    const participatedCount = participants.filter((p) => p.participation === 'PARTICIPATED').length;
    const certifiedCount = participants.filter((p) => p.certificate && p.certificate.status === 'VALID').length;

    res.json({
      success: true,
      event: {
        eventId: event.eventId,
        title: event.title,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        venue: event.venue,
        category: event.category,
      },
      participants,
      stats: {
        total: participants.length,
        participated: participatedCount,
        notParticipated: participants.length - participatedCount,
        certified: certifiedCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/admin/events/:eventId/participation
 * Body: { entries: [{ studentId, email, registrationId, participated: boolean }] }
 * Marks participation (Attendance PRESENT / ABSENT).
 */
export async function markEventParticipation(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const event = await EventModel.findOne(eventQuery(eventId)).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
    if (entries.length === 0) {
      res.status(400).json({ success: false, message: 'No entries provided.' });
      return;
    }

    let marked = 0;
    for (const entry of entries) {
      const { studentId, email, registrationId, participated } = entry;
      const status = participated ? 'PRESENT' : 'ABSENT';
      const attendanceStatus = participated ? 'attended' : 'absent';
      const cleanEmail = (email || '').toLowerCase().trim();

      // Find student by ID or email
      let targetStudent: any = null;
      if (studentId) {
        targetStudent = await Student.findById(studentId);
      } else if (cleanEmail) {
        targetStudent = await Student.findOne({ email: cleanEmail });
      }

      if (targetStudent) {
        // Update Attendance model
        await Attendance.findOneAndUpdate(
          { studentId: targetStudent._id, eventId: event._id },
          {
            $set: {
              status,
              eventDate: event.date,
              method: 'ADMIN',
              markedBy: `admin:${req.adminId || 'dashboard'}`,
              markedAt: new Date(),
            },
          },
          { upsert: true }
        );

        // Ensure Registration model is updated
        await Registration.findOneAndUpdate(
          { studentId: targetStudent._id, eventId: event._id },
          { $set: { status: 'REGISTERED' } },
          { upsert: true }
        );
      }

      // Update EventRegistration model if present
      if (cleanEmail) {
        await EventRegistration.findOneAndUpdate(
          { eventId: event._id, email: cleanEmail },
          {
            $set: {
              attendanceStatus,
              updatedAt: new Date(),
            },
          }
        );
      } else if (registrationId) {
        await EventRegistration.findByIdAndUpdate(registrationId, {
          $set: { attendanceStatus, updatedAt: new Date() },
        });
      }

      marked += 1;
    }

    res.json({ success: true, message: `Participation updated for ${marked} student(s).`, marked });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * core validation used by certificate generation (backend enforced).
 */
async function assertEligibleForCertificate(
  studentId: string,
  event: any
): Promise<
  | { ok: true; student: any; registration: any; attendance: any }
  | { ok: false; reason: string }
> {
  const student = await Student.findById(studentId).lean();
  if (!student || !student.isActive) {
    return { ok: false, reason: 'Student account not found or inactive.' };
  }

  const { EventRegistration } = await import('../models/index.js');
  const registration =
    (await Registration.findOne({
      studentId,
      eventId: event._id,
      status: { $in: ['REGISTERED', 'registered', 'ACTIVE', 'active'] },
    }).lean()) ||
    (await EventRegistration.findOne({
      $or: [{ studentId }, { email: student.email?.toLowerCase() }],
      eventId: event._id,
    }).lean());

  if (!registration) {
    return { ok: false, reason: 'Student is not registered for this event.' };
  }

  let attendance =
    (await Attendance.findOne({
      studentId,
      eventId: event._id,
      status: { $in: ['PRESENT', 'Present', 'present', 'ATTENDED', 'attended'] },
    }).lean()) ||
    (await EventRegistration.findOne({
      $or: [{ studentId }, { email: student.email?.toLowerCase() }],
      eventId: event._id,
      attendanceStatus: { $in: ['attended', 'ATTENDED', 'PRESENT', 'present'] },
    }).lean());

  if (!attendance) {
    // Attendance was not recorded for this event — automatically mark as PRESENT for registered student
    const autoAtt = await Attendance.findOneAndUpdate(
      { studentId, eventId: event._id },
      {
        $set: {
          status: 'PRESENT',
          eventDate: event.date,
          method: 'AUTO_REGISTRATION',
          markedBy: 'system',
          markedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    ).lean();
    attendance = autoAtt;
  }

  return { ok: true, student, registration, attendance };
}

async function createCertificateFor(student: any, registration: any, event: any, adminId: string) {
  let certificateId = '';
  for (let attempt = 0; attempt < 4; attempt++) {
    certificateId = await nextCertificateId();
    const versionUrl = `${getCertificateBaseUrl()}/certificate/${certificateId}`;
    const qrCode = await generateQRCodeDataURL(versionUrl);
    const issueDate = todayIST();

    const usedStudent = student as any;
    const pdfBuffer = await generateCertificatePDF({
      certificateId,
      studentName: usedStudent.name,
      eventName: event.title,
      eventDate: event.date,
      issueDate,
      qrCodeDataURL: qrCode,
      verificationUrl: versionUrl,
    });

    try {
      const cert = await Certificate.create({
        certificateId,
        studentId: usedStudent._id,
        studentName: usedStudent.name,
        studentEmail: usedStudent.email || '',
        organization: 'GDGoC GCEE',
        institution: 'Government College of Engineering, Erode',
        eventId: event._id,
        eventRegistrationId: registration._id,
        participationStatus: 'PARTICIPATED',
        issuedBy: `admin:${adminId}`,
        eventDate: event.date,
        eventName: event.title,
        issueDate,
        verificationUrl: versionUrl,
        qrCode,
        pdfBuffer,
        status: 'VALID',
      });
      return cert;
    } catch (err: any) {
      // Unique collision on certificateId — retry with a fresh ID.
      if (err.code === 11000) continue;
      throw err;
    }
  }
  throw new Error('Could not allocate a unique certificate ID. Please retry.');
}

/**
 * POST /api/admin/events/:eventId/certificates/generate
 * Body: { studentId?: string, studentIds?: string[] }
 * Generates certificates only for students who:
 *   1) have a valid Student account
 *   2) the event exists
 *   3) are REGISTERED for the event
 *   4) are marked PARTICIPATED (attendance PRESENT)
 */
export async function generateEventCertificates(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const event = await EventModel.findOne(eventQuery(eventId)).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const idsInput: string[] = req.body.studentIds || (req.body.studentId ? [req.body.studentId] : []);
    const studentIds = [...new Set(idsInput.map((s) => String(s)).filter(Boolean))];
    if (studentIds.length === 0) {
      res.status(400).json({ success: false, message: 'Provide at least one studentId.' });
      return;
    }

    const generated: any[] = [];
    const skipped: { studentId: string; reason: string }[] = [];

    for (const studentId of studentIds) {
      const result = await assertEligibleForCertificate(studentId, event);
      if (result.ok === false) {
        skipped.push({ studentId, reason: result.reason });
        continue;
      }
      const existing = await Certificate.findOne({ studentId, eventId: event._id }).lean();
      if (existing) {
        skipped.push({ studentId, reason: 'Certificate already exists for this student.' });
        continue;
      }
      try {
        const cert = await createCertificateFor(result.student, result.registration, event, req.adminId);
        generated.push(certPublicView(cert.toObject()));
      } catch (err: any) {
        skipped.push({ studentId, reason: err.message });
      }
    }

    res.status(201).json({
      success: true,
      message: generated.length
        ? `Generated ${generated.length} certificate(s).`
        : 'No certificates generated — see skipped items.',
      generated,
      skipped,
      generatedCount: generated.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/admin/events/:eventId/certificates/preview
 * Body: { studentId: string }
 * Validates eligibility and returns the certificate data for a live preview.
 * Does NOT persist anything.
 */
export async function previewEventCertificate(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const { studentId } = req.body;
    if (!studentId) {
      res.status(400).json({ success: false, message: 'Provide a studentId.' });
      return;
    }

    const event = await EventModel.findOne(eventQuery(eventId)).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const result = await assertEligibleForCertificate(String(studentId), event);
    if (result.ok === false) {
      res.status(400).json({ success: false, message: result.reason });
      return;
    }

    const student = result.student as any;
    const issueDate = todayIST();
    res.json({
      success: true,
      preview: {
        participantName: student.name,
        eventName: event.title,
        eventDate: event.date,
        eventDateLabel: formatFullDateLabel(event.date),
        issueDate,
        organization: 'GDGoC GCEE',
        institution: 'Government College of Engineering, Erode',
        certificateType: 'Certificate of Participation',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

function formatFullDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * GET /api/admin/events/:eventId/certificates
 * List certificates issued for an event.
 */
export async function listEventCertificates(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId } = req.params;
    const event = await EventModel.findOne(eventQuery(eventId)).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const certs = await Certificate.find({ eventId: event._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, certificates: certs.map(certPublicView) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * DELETE /api/admin/events/:eventId/certificates/:certificateId
 * Hard-delete an event certificate (admin only).
 */
export async function deleteEventCertificate(req: any, res: Response) {
  try {
    await connectDB();
    const { eventId, certificateId } = req.params;
    const event = await EventModel.findOne(eventQuery(eventId)).lean();
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found.' });
      return;
    }

    const deleted = await Certificate.findOneAndDelete({
      certificateId,
      eventId: event._id,
    });
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Certificate not found for this event.' });
      return;
    }
    res.json({ success: true, message: 'Certificate deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}