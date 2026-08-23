import type { Request, Response } from 'express';
import { GoogleFormRegistration } from '../models';
import { connectDB } from '../config/db';
import { env } from '../config/env';
import { sendStudentConfirmationEmail } from '../utils/email';

function extractField(data: Record<string, any>, keys: string[]): string {
  for (const search of keys) {
    const match = Object.keys(data).find((k) => k.toLowerCase().includes(search.toLowerCase()));
    if (match) {
      const val = data[match];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
    }
  }
  return '';
}

// POST /api/google-form/webhook — generic Google Form webhook (no event binding)
export async function googleFormWebhook(req: Request, res: Response) {
  try {
    await connectDB();

    const secret = req.headers['x-webhook-secret'] || req.query.secret;
    const expected = env.googleFormWebhookSecret;
    if (expected && secret !== expected) {
      res.status(401).json({ success: false, message: 'Unauthorized.' });
      return;
    }

    const body = req.body;
    if (!body || (typeof body !== 'object' && typeof body !== 'string')) {
      res.status(400).json({ success: false, message: 'Invalid payload.' });
      return;
    }

    let formData: Record<string, any>;
    if (body.formData && typeof body.formData === 'object') {
      formData = body.formData;
    } else if (typeof body === 'object') {
      formData = body;
    } else {
      res.status(400).json({ success: false, message: 'Invalid payload format.' });
      return;
    }

    const responseId = body.responseId || formData['Response ID'] || formData['responseId'] || null;

    const name = extractField(formData, ['full name', 'name', 'student name']);
    const email = extractField(formData, ['email', 'e-mail']);
    const phone = extractField(formData, ['phone', 'mobile', 'contact', 'whatsapp']);
    const rollNumber = extractField(formData, ['register', 'roll', 'reg no', 'roll no', 'roll number']);
    const department = extractField(formData, ['department', 'dept', 'branch']);
    const year = extractField(formData, ['year', 'semester', 'study year']);
    const college = extractField(formData, ['college', 'institution', 'university']);

    if (!name && !email) {
      res.status(400).json({ success: false, message: 'Name or email is required.' });
      return;
    }

    if (responseId) {
      const existing = await GoogleFormRegistration.findOne({ responseId }).lean();
      if (existing) {
        res.json({ success: true, message: 'Submission already recorded.', duplicate: true });
        return;
      }
    }

    if (email) {
      const recentDupe = await GoogleFormRegistration.findOne({
        email: email.toLowerCase(),
        submittedAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      }).lean();
      if (recentDupe) {
        res.json({ success: true, message: 'Submission already recorded.', duplicate: true });
        return;
      }
    }

    const registration = await GoogleFormRegistration.create({
      responseId: responseId || undefined,
      formData,
      name,
      email: email ? email.toLowerCase() : '',
      phone,
      rollNumber,
      department,
      year,
      college,
      source: 'webhook',
      submittedAt: new Date(),
    });

    console.log(`[webhook] Registration saved: ${name} (${email}) — id=${registration._id}`);

    try {
      await sendStudentConfirmationEmail({
        to: email || '',
        studentName: name || 'Student',
      });
    } catch (emailErr: any) {
      console.error('[webhook] Email notification failed but registration saved:', emailErr.message);
    }

    res.json({ success: true, message: 'Registration saved.', id: String(registration._id) });
  } catch (err: any) {
    console.error('[webhook] Error:', err.message, err.stack);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// POST /api/google-form/test
export async function googleFormTest(req: Request, res: Response) {
  try {
    await connectDB();

    const secret = req.headers['x-webhook-secret'] || req.query.secret;
    const expected = env.googleFormWebhookSecret;
    if (expected && secret !== expected) {
      res.status(401).json({ success: false, message: 'Unauthorized.' });
      return;
    }

    const testResponseId = `test-${Date.now()}`;
    const formData = {
      'Full Name': 'Test Student',
      'Email': 'test.student@gdggcee.example.com',
      'Phone Number': '9876543210',
      'Register Number': '21CSE999',
      'Department': 'Computer Science',
      'Year': '3rd Year',
      'College': 'Government College of Engineering, Erode',
    };

    const registration = await GoogleFormRegistration.create({
      responseId: testResponseId,
      formData,
      name: 'Test Student',
      email: 'test.student@gdggcee.example.com',
      phone: '9876543210',
      rollNumber: '21CSE999',
      department: 'Computer Science',
      year: '3rd Year',
      college: 'Government College of Engineering, Erode',
      source: 'webhook',
      submittedAt: new Date(),
    });

    console.log(`[webhook] Test registration created: id=${registration._id}`);
    res.json({
      success: true,
      message: 'Test registration created.',
      id: String(registration._id),
      testPayload: formData,
    });
  } catch (err: any) {
    console.error('[webhook] Test error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}
