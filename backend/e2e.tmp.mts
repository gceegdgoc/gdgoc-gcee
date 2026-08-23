/**
 * Full end-to-end integration test against a REAL MongoDB (in-memory server)
 * and the REAL Express app + controllers + Mongoose models.
 * Mirrors exactly what the production admin dashboard does.
 */
process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = 'e2e-test-secret';
process.env.ADMIN_EMAIL = 'e2e-admin@test.local';
process.env.ADMIN_PASSWORD = 'E2eTest@12345';
process.env.ADMIN_NAME = 'E2E Admin';

const { MongoMemoryServer } = await import('mongodb-memory-server');
const mongod = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongod.getUri('gdgoc-e2e');

const mongoose = (await import('mongoose')).default;
await mongoose.connect(process.env.MONGODB_URI);

const bcrypt = (await import('bcryptjs')).default;
const { Admin, EventModel, Resource, Member, Certificate } = await import('./src/models');
const { createApp } = await import('./src/app');

await Admin.create({
  name: 'E2E Admin',
  email: 'e2e-admin@test.local',
  passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD!, 10),
  role: 'superadmin',
});

const app = createApp();
const server = app.listen(0);
await new Promise<void>((resolve) => server.on('listening', resolve));
const base = `http://127.0.0.1:${(server.address() as any).port}`;

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) {
    pass++;
    console.log(`PASS  ${name}`);
  } else {
    fail++;
    console.log(`FAIL  ${name}${detail ? ` -- ${detail}` : ''}`);
  }
}

async function req(method: string, path: string, body?: any, token?: string) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

// ================= AUTH =================
let token = '';
{
  const r = await req('POST', '/api/admin/auth/login', { email: 'e2e-admin@test.local', password: process.env.ADMIN_PASSWORD });
  check('Admin Login', r.status === 200 && !!r.json?.token, `status=${r.status} body=${JSON.stringify(r.json)}`);
  token = r.json?.token || '';
}
{
  const r = await req('GET', '/api/admin/events');
  check('Admin route protected without token (401)', r.status === 401, `status=${r.status}`);
}
{
  const r = await req('POST', '/api/admin/auth/logout');
  check('Logout endpoint', r.status === 200 && r.json?.success === true);
}

// ================= EVENTS =================
let eventIdMongo = '';
{
  const payload = {
    title: 'AI Prompt Engineering Workshop',
    shortDescription: 'Hands-on GenAI session',
    description: 'Full description of the workshop.',
    date: '2026-09-20',
    time: '09:00 AM - 04:00 PM',
    startTime: '09:00',
    endTime: '16:00',
    venue: 'CS Seminar Hall',
    speaker: 'AI Engineer',
    speakerBio: 'Industry expert.',
    eventType: 'Workshop', // legacy frontend alias must map to category
    technologies: ['React', 'TypeScript'],
    registrationEnabled: true,
    registrationDeadline: '2026-09-18',
    capacity: 120,
    registrationLink: 'https://forms.gle/example',
    isCertificateEligible: true,
    isInauguration: false,
    status: 'UPCOMING',
    poster: 'data:image/png;base64,iVBORw0KGgo=',
  };
  const r = await req('POST', '/api/admin/events', payload, token);
  check(
    'Create Event (no eventType/poster/time/slug required-errors)',
    r.status === 201 && !!r.json?.event?._id,
    `status=${r.status} body=${JSON.stringify(r.json).slice(0, 300)}`
  );
  const ev = r.json?.event;
  eventIdMongo = ev?._id || '';
  check('Event slug auto-generated', ev?.slug === 'ai-prompt-engineering-workshop', `slug=${ev?.slug}`);
  check(
    'Event category mapped from legacy eventType alias',
    ev?.category === 'Workshop' && ev?.eventType === 'Workshop',
    `category=${ev?.category} eventType=${ev?.eventType}`
  );
  check('Event poster mirrored to banner', ev?.banner === 'data:image/png;base64,iVBORw0KGgo=', `banner=${ev?.banner}`);
  const dbEv = await EventModel.findById(eventIdMongo).lean();
  check(
    'Event persisted in MongoDB with all fields',
    !!dbEv && dbEv.time === '09:00 AM - 04:00 PM' && dbEv.capacity === 120 && Array.isArray(dbEv.technologies) && dbEv.technologies.length === 2
  );
}
{
  const r = await req('PUT', `/api/admin/events/${eventIdMongo}`, { title: 'AI Prompt Engineering Workshop Advanced', category: 'Hackathon', capacity: 200 }, token);
  check(
    'Edit Event',
    r.status === 200 && r.json?.event?.capacity === 200 && r.json?.event?.category === 'Hackathon',
    `status=${r.status} body=${JSON.stringify(r.json).slice(0, 250)}`
  );
}
{
  // Partial edit (dashboard quick-edits) must not fail on fields not sent.
  const partial = await req('PUT', `/api/admin/events/${eventIdMongo}`, { venue: 'Main Auditorium' }, token);
  check(
    'Partial Edit Event (venue only) keeps stored date/title',
    partial.status === 200 && partial.json?.event?.venue === 'Main Auditorium' && !!partial.json?.event?.title,
    `status=${partial.status} body=${JSON.stringify(partial.json).slice(0, 250)}`
  );
}
{
  const bad = await req('POST', '/api/admin/events', { title: '', date: 'not-a-date' }, token);
  check(
    'Create Event invalid -> structured errors (not raw Mongoose text)',
    bad.status === 400 && bad.json?.errors && typeof bad.json.errors.title === 'string' && typeof bad.json.errors.date === 'string',
    `status=${bad.status} body=${JSON.stringify(bad.json).slice(0, 250)}`
  );
}
{
  const list = await req('GET', '/api/admin/events');
  check(
    'Admin events list shows created event',
    list.status === 200 && (list.json?.events?.length || 0) >= 1,
    `status=${list.status} body=${JSON.stringify(list.json).slice(0, 300)}`
  );
}

// ================= RESOURCES =================
let resourceId = '';
{
  // Legacy frontend shape: url only. Backend must normalize to link.
  const r = await req('POST', '/api/admin/resources', { title: 'React Docs', url: 'https://react.dev', category: 'Web Development', uploadedBy: 'E2E' }, token);
  check(
    'Create Resource (url->link normalization, Web Development valid enum)',
    r.status === 201 && r.json?.resource?.link === 'https://react.dev',
    `status=${r.status} body=${JSON.stringify(r.json).slice(0, 300)}`
  );
  resourceId = r.json?.resource?._id || '';
  const dbRes = await Resource.findById(resourceId).lean();
  check(
    'Resource persisted with canonical link field',
    !!dbRes && dbRes.link === 'https://react.dev' && (dbRes as any).url === 'https://react.dev'
  );
  const pub = await req('GET', '/api/resources');
  check('Public resources list includes Web Development category', pub.status === 200 && (pub.json?.categories || []).includes('Web Development'));
}
{
  const r = await req('PUT', `/api/admin/resources/${resourceId}`, { title: 'React Docs updated', category: 'Other' }, token);
  check('Edit Resource', r.status === 200 && r.json?.resource?.title === 'React Docs updated');
}
{
  const bad = await req('POST', '/api/admin/resources', { title: 'No link', category: 'Web Development' }, token);
  check('Resource missing link -> structured errors.link', bad.status === 400 && typeof bad.json?.errors?.link === 'string', `body=${JSON.stringify(bad.json)}`);
  const badCat = await req('POST', '/api/admin/resources', { title: 'Bad cat', link: 'https://x.dev', category: 'Not Real' }, token);
  check('Resource invalid enum -> structured errors.category', badCat.status === 400 && typeof badCat.json?.errors?.category === 'string');
}

// ================= MEMBERS =================
let memberId = '';
{
  const payload = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '9876543210',
    college: 'Government College of Engineering, Erode',
    registerNumber: '2126105',
    skills: 'React, Node.js',
    areasOfInterest: 'Web Development, AI',
    whyJoin: 'To build with the community',
    team: 'Technical Team',
    role: 'Head',
    department: 'Computer Science and Engineering',
    year: 'III',
    photo: '',
    socialLinks: { github: 'https://github.com/jane', linkedin: 'https://linkedin.com/in/jane', instagram: '', twitter: '' },
  };
  const r = await req('POST', '/api/admin/members', payload, token);
  check(
    'Create Member (email/phone/college/registerNumber/skills/areasOfInterest/whyJoin accepted)',
    r.status === 201 && r.json?.member?.email === 'jane@example.com',
    `status=${r.status} body=${JSON.stringify(r.json).slice(0, 350)}`
  );
  memberId = r.json?.member?._id || '';
  const dbMem = await Member.findById(memberId).lean();
  check(
    'Member persisted in MongoDB with all form fields + team display fields',
    !!dbMem &&
      (dbMem as any).whyJoin === 'To build with the community' &&
      (dbMem as any).registerNumber === '2126105' &&
      (dbMem as any).team === 'Technical Team' &&
      (dbMem as any).socialLinks?.github === 'https://github.com/jane'
  );
}
{
  // Edit a LEGACY-style member (raw insert, no contact fields - like old DB docs).
  const ins = await Member.collection.insertOne({ name: 'Old Seed Member', team: 'Core Team', role: 'Lead', photo: 'x', isActive: true });
  const r = await req('PUT', `/api/admin/members/${ins.insertedId}`, { role: 'President' }, token);
  check(
    'Edit legacy member without contact fields still works',
    r.status === 200 && r.json?.member?.role === 'President',
    `status=${r.status} body=${JSON.stringify(r.json).slice(0, 250)}`
  );
  await Member.deleteOne({ _id: ins.insertedId });
}
{
  const r = await req('PUT', `/api/admin/members/${memberId}`, { skills: 'React, Node.js, GraphQL' }, token);
  check('Edit Member', r.status === 200 && r.json?.member?.skills === 'React, Node.js, GraphQL');
  const bad = await req('POST', '/api/admin/members', { name: 'No Email' }, token);
  check('Member missing email -> structured errors.email', bad.status === 400 && typeof bad.json?.errors?.email === 'string');
}

// ================= CERTIFICATES =================
{
  const r = await req(
    'POST',
    '/api/admin/certificates/quick-generate',
    {
      eventId: eventIdMongo,
      eventName: 'AI Prompt Engineering Workshop Advanced',
      eventDate: '2026-09-20',
      studentName: 'Jane Doe',
      studentEmail: 'jane@example.com',
      sendEmail: false,
    },
    token
  );
  check(
    'Generate Certificate with real event ObjectId',
    r.status === 201 && !!r.json?.certificate?.certificateId,
    `status=${r.status} body=${JSON.stringify(r.json).slice(0, 300)}`
  );
  const certId = r.json?.certificate?.certificateId;
  const dbCert = await Certificate.findOne({ certificateId: certId }).lean();
  check(
    'Certificate persisted with eventId pointing to real Event _id',
    !!dbCert && String((dbCert as any).eventId) === String(eventIdMongo)
  );
}
{
  const empty = await req('POST', '/api/admin/certificates/quick-generate', { studentName: 'X', eventId: '', eventName: 'E', eventDate: '2026-01-01', sendEmail: false }, token);
  check(
    'Certificate with EMPTY eventId -> structured errors.eventId',
    empty.status === 400 && typeof empty.json?.errors?.eventId === 'string',
    `body=${JSON.stringify(empty.json).slice(0, 250)}`
  );
  const fake = await req('POST', '/api/admin/certificates/quick-generate', { studentName: 'X', eventId: 'EV-2026-0004', eventName: 'E', eventDate: '2026-01-01', sendEmail: false }, token);
  check(
    'Certificate with business-code eventId -> structured errors.eventId',
    fake.status === 400 && typeof fake.json?.errors?.eventId === 'string'
  );
  const missing = await req('POST', '/api/admin/certificates/quick-generate', { studentName: 'X', eventId: 'aaaaaaaaaaaaaaaaaaaaaaaa', eventName: 'E', eventDate: '2026-01-01', sendEmail: false }, token);
  check('Certificate with nonexistent-but-valid ObjectId -> clean 400', missing.status === 400 && typeof missing.json?.errors?.eventId === 'string');
}

// ================= DELETE FLOWS =================
{
  const r = await req('DELETE', `/api/admin/resources/${resourceId}`, undefined, token);
  check('Delete Resource', r.status === 200);
  const gone = await Resource.findById(resourceId);
  check('Resource removed from MongoDB', !gone);
}

console.log('');
console.log(fail === 0 ? `ALL ${pass} E2E TESTS PASSED` : `${fail} of ${pass + fail} E2E TESTS FAILED`);
server.close();
await mongod.stop();
process.exit(fail === 0 ? 0 : 1);
