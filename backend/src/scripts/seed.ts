import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { connectDB } from '../config/db';
import { todayIST } from '../utils/dates';
import { nextEventId, nextCertificateId } from '../utils/ids';
import { generateQRCodeDataURL } from '../utils/qr';
import {
  Admin,
  Student,
  EventModel,
  Registration,
  Attendance,
  CertificateCampaign,
  Member,
  GalleryItem,
  Resource,
} from '../models';

function shiftDate(base: string, days: number): string {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function svgImage(color: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" font-family="Arial" font-size="34" fill="#ffffff" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

async function seed() {
  console.log('[seed] connecting to MongoDB...');
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database');

  const today = todayIST();

  // ---- Admin ----
  const adminEmail = env.adminEmail.toLowerCase();
  if (!(await Admin.findOne({ email: adminEmail }))) {
    await Admin.create({
      name: env.adminName,
      email: adminEmail,
      passwordHash: await bcrypt.hash(env.adminPassword, 10),
      role: 'superadmin',
    });
    console.log(`[seed] admin created: ${adminEmail} / ${env.adminPassword}`);
  } else {
    console.log('[seed] admin already exists');
  }

  // ---- Students ----
  const studentsSpec: Array<[string, string, string]> = [
    ['Demo Student', 'demo@gdgocgcee.in', '2021CSE001'],
    ['Student Two', 'student@gdgocgcee.in', '2022ECE002'],
    ['Student Three', 'participant@gdgocgcee.in', '2023MEC003'],
    ['Student Four', 'learner@gdgocgcee.in', '2024CSE004'],
  ];
  const students: any[] = [];
  for (const [name, email, roll] of studentsSpec) {
    let st = await Student.findOne({ email });
    if (!st) {
      st = await Student.create({
        name,
        email,
        phone: '9000000000',
        rollNumber: roll,
        department: name.includes('Demo') ? 'Computer Science and Engineering' : 'Electronics and Communication Engineering',
        year: 'III',
        college: 'Government College of Engineering, Erode',
        passwordHash: await bcrypt.hash('student123', 10),
        bio: 'Active GDGoC GCEE community member.',
      });
    }
    students.push(st);
    console.log(`[seed] student ready: ${email} / student123`);
  }

  // ---- Events ----
  const inaugurationDate = shiftDate(today, -6);
  const eligibleDates = [shiftDate(today, -5), shiftDate(today, -4), shiftDate(today, -3), shiftDate(today, -2), shiftDate(today, -1)];

  const eventSpec: any[] = [
    {
      eventId: await nextEventId(),
      title: 'GDGoC GCEE Inauguration',
      shortDescription: 'Official launch of GDGoC on Campus at GCEE.',
      description: 'Join us as we officially launch Google Developer Groups on Campus at Government College of Engineering, Erode. Meet the core team, learn about the roadmap, and be part of the community from day one.',
      banner: svgImage('#4285F4', 'Inauguration'),
      date: inaugurationDate,
      startTime: '10:00',
      endTime: '12:30',
      venue: 'Main Auditorium',
      speaker: 'Chief Guest',
      speakerBio: 'Distinguished guest from the industry.',
      category: 'Community Meetup',
      technologies: [],
      capacity: 200,
      isCertificateEligible: false,
      isInauguration: true,
      status: 'COMPLETED',
    },
  ];

  const titles = ['Web Development Bootcamp', 'Git & GitHub Workshop', 'Generative AI Hands-on', 'Cloud Computing Workshop', 'Hackathon: Build Sprint'];
  const cats = ['Workshop', 'Workshop', 'Hands-on Session', 'Workshop', 'Hackathon'];
  const speakers = ['Faculty Mentor', 'Open Source Maintainer', 'AI Engineer', 'Cloud Architect', 'Community Lead'];
  const techs = [
    ['React', 'TypeScript', 'Tailwind CSS'],
    ['Git', 'GitHub', 'CI/CD'],
    ['Python', 'GenAI', 'Prompt Engineering'],
    ['AWS', 'Docker', 'Kubernetes'],
    ['React', 'Node.js', 'MongoDB'],
  ];

  for (let i = 0; i < eligibleDates.length; i++) {
    eventSpec.push({
      eventId: await nextEventId(),
      title: titles[i],
      shortDescription: `Hands-on ${cats[i].toLowerCase()} session.`,
      description: `A practical ${cats[i].toLowerCase()} covering real-world skills, tooling and best practices. Open to all GDGoC GCEE members.`,
      banner: svgImage(['#34A853', '#FBBC05', '#EA4335', '#4285F4', '#34A853'][i], titles[i].split(':')[0]),
      date: eligibleDates[i],
      startTime: '14:00',
      endTime: '17:00',
      venue: ['CS Seminar Hall', 'Innovation Lab', 'Smart Classroom', 'CS Lab 2', 'Online'][i],
      speaker: speakers[i],
      speakerBio: `Speaker for ${titles[i]}.`,
      category: cats[i],
      technologies: techs[i],
      capacity: 120,
      isCertificateEligible: true,
      isInauguration: false,
      status: 'COMPLETED',
    });
  }

  // Upcoming (non-certificate) events for the dashboard/homepage
  eventSpec.push({
    eventId: await nextEventId(),
    title: 'Community Meetup & Tech Talk',
    shortDescription: 'Monthly community catch-up with a short tech talk.',
    description: 'Our monthly meetup — network with peers, discuss latest developer trends and enjoy a short technical talk.',
    banner: svgImage('#FBBC05', 'Meetup'),
    date: shiftDate(today, 7),
    startTime: '16:00',
    endTime: '18:00',
    venue: 'Library Auditorium',
    speaker: 'GDGoC GCEE',
    speakerBio: 'Community',
    category: 'Community Meetup',
    technologies: [],
    capacity: 150,
    isCertificateEligible: false,
    isInauguration: false,
    status: 'UPCOMING',
  });
  eventSpec.push({
    eventId: await nextEventId(),
    title: 'Android Development Session',
    shortDescription: 'Intro to building Android apps with Kotlin.',
    description: 'A beginner-friendly session on Android development with Kotlin and Jetpack Compose.',
    banner: svgImage('#EA4335', 'Android'),
    date: shiftDate(today, 14),
    startTime: '11:00',
    endTime: '14:00',
    venue: 'IT Seminar Hall',
    speaker: 'Guest Speaker',
    speakerBio: 'Mobile developer with industry experience.',
    category: 'Workshop',
    technologies: ['Kotlin', 'Jetpack Compose', 'Firebase'],
    capacity: 100,
    isCertificateEligible: true,
    isInauguration: false,
    status: 'UPCOMING',
  });

  const events: any[] = [];
  for (const spec of eventSpec) {
    let ev = await EventModel.findOne({ eventId: spec.eventId });
    if (!ev) ev = await EventModel.create(spec);
    events.push(ev);
    console.log(`[seed] event: ${spec.eventId} — ${spec.title} (${spec.date}) ${spec.isInauguration ? '[INAUGURATION]' : spec.isCertificateEligible ? '[CERT ELIGIBLE]' : ''}`);
  }

  const inauguration = events[0];
  const eligible = events.slice(1, 6);

  // ---- Registrations ----
  const registeredIds = new Set<string>();
  for (const ev of events) {
    for (const st of students) {
      const key = `${String(st._id)}:${String(ev._id)}`;
      if (registeredIds.has(key)) continue;
      registeredIds.add(key);
      await Registration.findOneAndUpdate(
        { studentId: st._id, eventId: ev._id },
        { $setOnInsert: { studentId: st._id, eventId: ev._id, status: 'REGISTERED', registeredAt: new Date() } },
        { upsert: true }
      );
    }
  }

  // ---- Attendance ----
  // Attendance present patterns (inauguration + eligible events).
  const attendancePattern = [
    [true, true, true, true, true, true], // Demo Student: inauguration + all 5 -> 100%
    [true, true, true, true, true, false], // Student Two: inauguration + 4 -> 80%
    [true, true, true, true, false, false], // Student Three: inauguration + 3 -> 60%
    [true, false, false, false, false, false], // Student Four: inauguration only -> 0%
  ];

  for (let si = 0; si < students.length; si++) {
    const st = students[si];
    const pattern = attendancePattern[si];
    const allEvents = [inauguration, ...eligible];
    for (let ei = 0; ei < allEvents.length; ei++) {
      const ev = allEvents[ei];
      const present = pattern[ei];
      const existing = await Attendance.findOne({ studentId: st._id, eventId: ev._id });
      if (!existing) {
        await Attendance.create({
          studentId: st._id,
          eventId: ev._id,
          eventDate: ev.date,
          status: present ? 'PRESENT' : 'ABSENT',
          method: 'ADMIN',
          markedBy: 'seed',
        });
      }
    }
    await Student.updateOne({ _id: st._id }, { $set: { points: si === 0 ? 100 : si === 1 ? 80 : si === 2 ? 60 : 20 } });
  }
  console.log('[seed] attendance seeded');

  // ---- Certificate Campaign ----
  const campaign = await CertificateCampaign.findOneAndUpdate(
    { name: 'GDGoC GCEE 2026 Community Participation' },
    {
      $set: {
        description: 'Consolidated certificate for participation in eligible GDGoC GCEE events.',
        startDate: eligibleDates[0],
        endDate: eligibleDates[eligibleDates.length - 1],
        minimumAttendancePercentage: 75,
        minimumEligibleEvents: 4,
        releaseDate: shiftDate(today, 2),
        certificateTemplate: 'default',
        status: 'ACTIVE',
      },
    },
    { upsert: true, new: true }
  );
  console.log(`[seed] campaign: ${campaign.name} (${eligibleDates[0]} → ${eligibleDates[eligibleDates.length - 1]})`);

  // ---- Members ----
  const teamSpec: Array<[string, string, string, string]> = [
    ['Priya Ramesh', 'Core Team', 'Lead', 'CSE'],
    ['Karthik Subramanian', 'Core Team', 'Co-Lead', 'ECE'],
    ['Divya Lakshmi', 'Student Coordinators', 'Coordinator', 'IT'],
    ['Arjun Nandakumar', 'Technical Team', 'Head', 'CSE'],
    ['Sneha Krishnan', 'Design Team', 'Head', 'ECE'],
    ['Rahul Varma', 'Event Team', 'Head', 'MEC'],
    ['Anitha Kumari', 'Community Members', 'Member', 'CSE'],
    ['Vignesh Raja', 'Community Members', 'Member', 'EEE'],
  ];
  for (const [name, team, role, dept] of teamSpec) {
    await Member.findOneAndUpdate(
      { name },
      {
        $set: {
          team,
          role,
          department: `${dept}`,
          year: 'III',
          photo: svgImage(team === 'Core Team' ? '#4285F4' : '#34A853', name.split(' ')[0]),
          socialLinks: { github: 'https://github.com', linkedin: 'https://linkedin.com', instagram: '', twitter: '' },
          isActive: true,
        },
      },
      { upsert: true }
    );
  }
  console.log('[seed] members seeded');

  // ---- Gallery ----
  const gallerySpec: Array<[string, string, string]> = [
    ['Inauguration', 'Meetups', '#4285F4'],
    ['Web Bootcamp', 'Workshops', '#34A853'],
    ['Git Workshop', 'Workshops', '#FBBC05'],
    ['Build Sprint', 'Hackathons', '#EA4335'],
    ['Team Photo', 'Team', '#4285F4'],
  ];
  for (const [title, cat, color] of gallerySpec) {
    const img = svgImage(color, title);
    await GalleryItem.findOneAndUpdate(
      { title },
      { $set: { title, category: cat, image: img } },
      { upsert: true }
    );
  }
  console.log('[seed] gallery seeded');

  // ---- Resources ----
  const resourceSpec: Array<[string, string, string, string]> = [
    ['Learn React', 'Official React docs', 'https://react.dev/learn', 'Web Development'],
    ['FreeCodeCamp', 'Free coding curriculum', 'https://www.freecodecamp.org', 'Programming'],
    ['Machine Learning Crash Course', 'Google ML fundamentals', 'https://developers.google.com/machine-learning/crash-course', 'AI/ML'],
    ['AWS Training', 'Cloud fundamentals', 'https://aws.amazon.com/training/', 'Cloud'],
    ['Git Guide', 'Everything you need about Git', 'https://git-scm.com/doc', 'Git & GitHub'],
  ];
  for (const [title, desc, url, cat] of resourceSpec) {
    await Resource.findOneAndUpdate(
      { title },
      { $set: { title, description: desc, url, category: cat, uploadedBy: 'GDGoC GCEE' } },
      { upsert: true }
    );
  }
  console.log('[seed] resources seeded');

  console.log('\n[seed] done. Summary:');
  console.log('  Admin   :', adminEmail, '/', env.adminPassword);
  console.log('  Students: demo@gdgocgcee.in / student123  (attended 100%)');
  console.log('  Campaign: GDGoC GCEE 2026 Community Participation');
  await mongoose.disconnect();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  });
