import type { Response } from 'express';
import { Certificate } from '../models/Certificate';
import { CertificateCampaign } from '../models/CertificateCampaign';
import { Student } from '../models/Student';
import type { AuthRequest } from '../middleware/auth';
import { formatDotDate, todayIST } from '../utils/dates';
import { generateCertificatePDF } from '../utils/pdf';
import { generateQRCodeDataURL } from '../utils/qr';
import { nextCertificateId } from '../utils/ids';
import { getPublicAppUrl } from '../config/env';
import { sendGmailEmail } from '../services/emailService';
import { generateCertificateEmailHtml } from '../services/email/templates/certificate.template';
import { connectDB } from '../config/db';

const PDF_MIME = 'application/pdf';

/** Public-safe certificate view — never expose sensitive fields. */
function publicView(cert: any) {
  return {
    certificateId: cert.certificateId,
    studentName: cert.studentName,
    organization: cert.organization,
    institution: cert.institution,
    eventDate: cert.eventDate || '',
    eventName: cert.eventName || '',
    eventDateLabel: formatDotDate(cert.eventDate || ''),
    issueDate: cert.issueDate,
    issueDateLabel: formatDotDate(cert.issueDate),
    participationStatus: cert.participationStatus || 'PARTICIPATED',
    issuedBy: cert.issuedBy || 'admin',
    status: cert.status,
    revokedAt: cert.revokedAt,
    campaignName: cert.campaignName || '',
    qrCode: cert.qrCode || '',
  };
}

// GET /api/certificates/verify/:certificateId  (public)
export async function verifyCertificate(req: any, res: Response) {
  try {
    await connectDB();

    const cert = await Certificate.findOne({ certificateId: req.params.certificateId }).lean();
    if (!cert) {
      res.status(404).json({ success: false, message: 'Certificate not found.' });
      return;
    }

    const campaign = await CertificateCampaign.findById(cert.campaignId).select('name').lean();
    res.json({
      success: true,
      certificate: publicView({ ...cert, campaignName: campaign?.name || '' }),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/certificates/:certificateId/download  (public)
export async function downloadCertificate(req: any, res: Response) {
  try {
    await connectDB();

    const cert = await Certificate.findOne({ certificateId: req.params.certificateId }).lean();
    if (!cert) {
      res.status(404).json({ success: false, message: 'Certificate not found.' });
      return;
    }
    if (cert.status === 'REVOKED') {
      res.status(403).json({ success: false, message: 'This certificate has been revoked and cannot be downloaded.' });
      return;
    }

    // Serve the stored PDF buffer (generated once during certificate creation).
    if (cert.pdfBuffer) {
      res.setHeader('Content-Type', PDF_MIME);
      res.setHeader('Content-Disposition', `attachment; filename="${cert.certificateId}.pdf"`);
      res.send(Buffer.from(cert.pdfBuffer));
      return;
    }

    // Fallback: regenerate if pdfBuffer is missing (backward compat with old certificates).
    const pdf = await generateCertificatePDF({
      certificateId: cert.certificateId,
      studentName: cert.studentName,
      eventName: cert.eventName || '',
      eventDate: cert.eventDate || '',
      issueDate: cert.issueDate,
      qrCodeDataURL: cert.qrCode,
      verificationUrl: cert.verificationUrl,
    });

    res.setHeader('Content-Type', PDF_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="${cert.certificateId}.pdf"`);
    res.send(pdf);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/certificates/my  (student)
export async function myCertificates(req: AuthRequest, res: Response) {
  try {
    await connectDB();

    const certs = await Certificate.find({ studentId: req.studentId }).sort({ createdAt: -1 }).lean();
    const campaigns = await CertificateCampaign.find({ _id: { $in: certs.map((c) => c.campaignId) } }).select('name').lean();
    const campMap = new Map(campaigns.map((c) => [String(c._id), c.name]));

    res.json({
      success: true,
      certificates: certs.map((c) => publicView({ ...c, campaignName: campMap.get(String(c.campaignId)) || '' })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/certificates
export async function adminListCertificates(req: any, res: Response) {
  try {
    await connectDB();

    const { status, campaignId } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (campaignId) filter.campaignId = campaignId;

    const certs = await Certificate.find(filter).sort({ createdAt: -1 }).limit(2000).lean();
    const campaigns = await CertificateCampaign.find({ _id: { $in: [...new Set(certs.map((c) => c.campaignId))] } }).select('name').lean();
    const campMap = new Map(campaigns.map((c) => [String(c._id), c.name]));

    res.json({
      success: true,
      certificates: certs.map((c) => ({
        certificateId: c.certificateId,
        studentName: c.studentName,
        studentEmail: c.studentEmail,
        campaignName: campMap.get(String(c.campaignId)) || '',
        campaignId: c.campaignId,
        eventName: c.eventName || '',
        eventDate: c.eventDate || '',
        eventDateLabel: formatDotDate(c.eventDate || ''),
        issueDate: c.issueDate,
        status: c.status,
        revokedAt: c.revokedAt,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/admin/certificates/:certificateId/revoke
export async function revokeCertificate(req: any, res: Response) {
  try {
    await connectDB();

    const cert = await Certificate.findOne({ certificateId: req.params.certificateId });
    if (!cert) {
      res.status(404).json({ success: false, message: 'Certificate not found.' });
      return;
    }
    if (cert.status === 'REVOKED') {
      res.status(400).json({ success: false, message: 'Certificate is already revoked.' });
      return;
    }

    cert.status = 'REVOKED';
    cert.revokedAt = new Date();
    cert.revokedBy = `admin:${req.adminId}`;
    cert.revokeReason = req.body.reason || 'Revoked by administrator';
    await cert.save();

    res.json({ success: true, message: 'Certificate revoked. History is preserved for audit.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/admin/certificates/:certificateId/restore
export async function restoreCertificate(req: any, res: Response) {
  try {
    await connectDB();

    const cert = await Certificate.findOne({ certificateId: req.params.certificateId });
    if (!cert) {
      res.status(404).json({ success: false, message: 'Certificate not found.' });
      return;
    }
    cert.status = 'VALID';
    cert.revokedAt = null;
    cert.revokeReason = '';
    await cert.save();
    res.json({ success: true, message: 'Certificate restored to VALID.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/certificates/stats
export async function adminCertificateStats(_: any, res: Response) {
  try {
    await connectDB();

    const [total, valid, revoked] = await Promise.all([
      Certificate.countDocuments(),
      Certificate.countDocuments({ status: 'VALID' }),
      Certificate.countDocuments({ status: 'REVOKED' }),
    ]);

    const byStatus = await Certificate.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      stats: { total, valid, revoked },
      byStatus,
      issueDate: todayIST(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/admin/certificates/quick-generate-and-send
 * Body: { studentName, studentEmail, eventName, eventDate, sendEmail = true }
 * Admin enters only the event name, event date, and student name (+ email to send).
 */
export async function quickGenerateAndSendCertificate(req: any, res: Response) {
  try {
    await connectDB();
    const { studentName, studentEmail, eventName, eventDate, sendEmail = true } = req.body;

    if (!studentName || !studentName.trim()) {
      res.status(400).json({ success: false, message: 'Student name is required.' });
      return;
    }
    if (!eventName || !eventName.trim()) {
      res.status(400).json({ success: false, message: 'Event name is required.' });
      return;
    }
    if (!eventDate || !eventDate.trim()) {
      res.status(400).json({ success: false, message: 'Event date is required.' });
      return;
    }

    const cleanName = studentName.trim();
    const cleanEmail = (studentEmail || '').trim().toLowerCase();
    const cleanEventName = eventName.trim();
    const cleanEventDate = eventDate.trim();
    const issueDate = todayIST();

    const studentRecord = cleanEmail ? await Student.findOne({ email: cleanEmail }).lean() : null;

    let cert: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const certificateId = await nextCertificateId();
      const appUrl = getPublicAppUrl();
      const verificationUrl = `${appUrl}/certificate/${certificateId}`;
      const qrCode = await generateQRCodeDataURL(verificationUrl);

      const pdfBuffer = await generateCertificatePDF({
        certificateId,
        studentName: cleanName,
        eventName: cleanEventName,
        eventDate: cleanEventDate,
        issueDate,
        qrCodeDataURL: qrCode,
        verificationUrl,
      });

      try {
        cert = await Certificate.create({
          certificateId,
          studentId: studentRecord?._id || null,
          studentName: cleanName,
          studentEmail: cleanEmail,
          organization: 'GDGoC GCEE',
          institution: 'Government College of Engineering, Erode',
          eventName: cleanEventName,
          eventDate: cleanEventDate,
          issueDate,
          verificationUrl,
          qrCode,
          pdfBuffer,
          status: 'VALID',
          issuedBy: `admin:${req.adminId || 'dashboard'}`,
          participationStatus: 'PARTICIPATED',
        });
        break;
      } catch (err: any) {
        if (err.code === 11000) continue;
        throw err;
      }
    }

    if (!cert) {
      res.status(500).json({ success: false, message: 'Failed to allocate a unique certificate ID. Please retry.' });
      return;
    }

    let emailSent = false;
    let emailError: string | undefined;

    if (sendEmail && cleanEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      const appUrl = getPublicAppUrl();
      const verificationUrl = `${appUrl}/certificate/${cert.certificateId}`;
      const downloadUrl = `${appUrl}/api/certificates/${cert.certificateId}/download`;

      const { subject, html, text } = generateCertificateEmailHtml({
        studentName: cleanName,
        eventName: cleanEventName,
        certificateId: cert.certificateId,
        verificationUrl,
        downloadUrl,
      });

      const sendResult = await sendGmailEmail({
        to: cleanEmail,
        subject,
        html,
        text,
        attachments: [
          {
            filename: `${cert.certificateId}.pdf`,
            content: Buffer.from(cert.pdfBuffer),
          },
        ],
      });

      if (sendResult.success) {
        emailSent = true;
      } else {
        emailError = sendResult.error;
      }
    }

    res.status(201).json({
      success: true,
      message: emailSent
        ? `Certificate ${cert.certificateId} generated and delivered to ${cleanEmail}!`
        : `Certificate ${cert.certificateId} generated successfully.`,
      certificate: publicView(cert),
      emailSent,
      emailError,
    });
  } catch (err: any) {
    console.error('[certificate] quickGenerate error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/admin/certificates/preview-pdf
 * Body: { studentName, eventName, eventDate }
 * Returns on-the-fly generated PDF buffer for live instant preview.
 */
export async function previewCertificatePdf(req: any, res: Response) {
  try {
    const { studentName, eventName, eventDate } = req.body;
    const cleanName = (studentName || 'Student Name').trim();
    const cleanEventName = (eventName || 'AI Prompt Engineering Workshop').trim();
    const cleanEventDate = (eventDate || todayIST()).trim();
    const issueDate = todayIST();

    const sampleId = 'GDGCEE-PREVIEW-001';
    const appUrl = getPublicAppUrl();
    const verificationUrl = `${appUrl}/certificate/${sampleId}`;
    const qrCode = await generateQRCodeDataURL(verificationUrl);

    const pdfBuffer = await generateCertificatePDF({
      certificateId: sampleId,
      studentName: cleanName,
      eventName: cleanEventName,
      eventDate: cleanEventDate,
      issueDate,
      qrCodeDataURL: qrCode,
      verificationUrl,
    });

    res.setHeader('Content-Type', PDF_MIME);
    res.setHeader('Content-Disposition', 'inline; filename="certificate-preview.pdf"');
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/admin/certificates/:certificateId/send-email
 * Resends certificate email with PDF attachment to student.
 */
export async function resendCertificateEmail(req: any, res: Response) {
  try {
    await connectDB();
    const { certificateId } = req.params;
    const cert = await Certificate.findOne({ certificateId });
    if (!cert) {
      res.status(404).json({ success: false, message: 'Certificate not found.' });
      return;
    }

    const targetEmail = (req.body.email || cert.studentEmail || '').trim().toLowerCase();
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      res.status(400).json({ success: false, message: 'Valid student email is required.' });
      return;
    }

    const appUrl = getPublicAppUrl();
    const verificationUrl = `${appUrl}/certificate/${cert.certificateId}`;
    const downloadUrl = `${appUrl}/api/certificates/${cert.certificateId}/download`;

    const { subject, html, text } = generateCertificateEmailHtml({
      studentName: cert.studentName,
      eventName: cert.eventName || 'GDGoC GCEE Event',
      certificateId: cert.certificateId,
      verificationUrl,
      downloadUrl,
    });

    let pdfBuffer = cert.pdfBuffer;
    if (!pdfBuffer) {
      pdfBuffer = await generateCertificatePDF({
        certificateId: cert.certificateId,
        studentName: cert.studentName,
        eventName: cert.eventName || '',
        eventDate: cert.eventDate || '',
        issueDate: cert.issueDate,
        qrCodeDataURL: cert.qrCode,
        verificationUrl: cert.verificationUrl,
      });
      cert.pdfBuffer = pdfBuffer;
      await cert.save();
    }

    const sendResult = await sendGmailEmail({
      to: targetEmail,
      subject,
      html,
      text,
      attachments: [
        {
          filename: `${cert.certificateId}.pdf`,
          content: Buffer.from(pdfBuffer),
        },
      ],
    });

    if (!sendResult.success) {
      res.status(500).json({ success: false, message: sendResult.error || 'Failed to send certificate email.' });
      return;
    }

    res.json({
      success: true,
      message: `Certificate email delivered to ${targetEmail}!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
