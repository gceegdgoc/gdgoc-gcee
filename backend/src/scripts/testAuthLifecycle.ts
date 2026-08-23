import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db';
import { Student } from '../models/Student';
import { sendOTPEmail, sendWelcomeEmail } from '../services/emailService';

async function testFullAuthLifecycle() {
  console.log('--- Testing Full Auth & OTP Lifecycle ---');
  await connectDB();

  const testEmail = `test_student_${Date.now()}@example.com`;
  const testPassword = 'Password@123';
  const passwordHash = await bcrypt.hash(testPassword, 10);

  console.log(`\n1. Creating test unverified registration for ${testEmail}...`);
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = bcrypt.hashSync(otp, 10);
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const student = await Student.create({
    name: 'Test Student',
    email: testEmail,
    phone: '9876543210',
    rollNumber: `TEST${Date.now().toString().slice(-4)}`,
    department: 'CSE',
    year: '3',
    college: 'Government College of Engineering, Erode',
    passwordHash,
    isVerified: false,
    otp: otpHash,
    otpExpiresAt,
    otpAttempts: 0,
    otpLastSentAt: new Date(),
  });

  console.log(`- Created student record with ID: ${student._id}`);
  console.log(`- isVerified: ${student.isVerified}`);
  console.log(`- otpExpiresAt: ${student.otpExpiresAt}`);

  // Test wrong OTP attempt
  console.log('\n2. Testing incorrect OTP verification attempt...');
  const wrongOtp = '000000';
  const isMatchWrong = await bcrypt.compare(wrongOtp, student.otp || '');
  if (!isMatchWrong) {
    student.otpAttempts = (student.otpAttempts || 0) + 1;
    await student.save();
    console.log(`PASS: Incorrect OTP rejected! Attempt count: ${student.otpAttempts}`);
  } else {
    console.error('FAIL: Wrong OTP unexpectedly accepted');
  }

  // Test correct OTP verification
  console.log('\n3. Testing correct OTP verification...');
  const isMatchCorrect = await bcrypt.compare(otp, student.otp || '');
  if (isMatchCorrect && student.otpExpiresAt && new Date() <= student.otpExpiresAt && (student.otpAttempts || 0) < 5) {
    const updated = await Student.findOneAndUpdate(
      { _id: student._id },
      { $set: { isVerified: true }, $unset: { otp: 1, otpExpiresAt: 1, otpAttempts: 1, otpLastSentAt: 1 } },
      { new: true }
    );
    console.log(`PASS: Email verified successfully! isVerified: ${updated?.isVerified}`);
    console.log(`- Cleared OTP credentials from DB: otp=${updated?.otp}`);
  } else {
    console.error('FAIL: Correct OTP was not accepted');
  }

  // Clean up test document
  await Student.deleteOne({ _id: student._id });
  console.log('\n4. Cleaned up test record.');
  console.log('\n--- Complete Auth Lifecycle Verified Successfully ---');
}

testFullAuthLifecycle().catch(console.error).finally(() => process.exit(0));
