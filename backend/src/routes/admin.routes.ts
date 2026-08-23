import { Router } from 'express';
import { adminProtect } from '../middleware/adminAuth';
import { uploadMemory } from '../middleware/upload';
import rateLimit from 'express-rate-limit';

import {
  adminListEvents,
  adminGetEvent,
  adminCreateEvent,
  adminUpdateEvent,
  adminDeleteEvent,
  adminSetEventStatus,
  sendEventToAllStudents,
  getVerifiedStudentCount,
} from '../controllers/event.controller';
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  calculateEligibility,
  generateCertificates,
  generateSingleCertificate,
} from '../controllers/campaign.controller';
import {
  adminListCertificates,
  revokeCertificate,
  restoreCertificate,
  adminCertificateStats,
  quickGenerateAndSendCertificate,
  previewCertificatePdf,
  resendCertificateEmail,
} from '../controllers/certificate.controller';
import {
  listEventParticipants,
  markEventParticipation,
  generateEventCertificates,
  previewEventCertificate,
  listEventCertificates,
  deleteEventCertificate,
} from '../controllers/eventCertificate.controller';
import {
  adminListStudents,
  adminGetStudent,
  adminToggleStudentStatus,
  adminDeleteStudent,
} from '../controllers/studentAdmin.controller';
import {
  adminListMembers,
  createMember,
  updateMember,
  deleteMember,
} from '../controllers/member.controller';
import {
  adminListCoordinatorRoles,
  createCoordinatorRole,
  updateCoordinatorRole,
  deleteCoordinatorRole,
} from '../controllers/coordinatorRole.controller';
import {
  createGalleryItem,
  deleteGalleryItem,
} from '../controllers/gallery.controller';
import {
  adminListResources,
  createResource,
  updateResource,
  deleteResource,
} from '../controllers/resource.controller';
import { adminDashboard } from '../controllers/dashboard.controller';
import { exportStudents } from '../controllers/export.controller';
import {
  adminListRegistrations,
  adminListAttended,
} from '../controllers/adminDashboard.controller';
import {
  adminListFormRegistrations,
  adminGetFormRegistration,
  adminMarkFormRegistrationRead,
} from '../controllers/formRegistration.controller';
import {
  listEventsWithRegistrationCounts,
  listEventRegistrations,
  eventRegistrationCount,
  exportEventRegistrationsAsCsv,
  bulkAddRegistrations,
  getRegistrationStats,
} from '../controllers/registration.controller';
import {
  generateRegistrationListPDF,
  sendEventRegistrationPDFToAll,
  sendEventEmails,
  getEventSendingHistory,
} from '../controllers/eventDistribution.controller';
import {
  deleteEventRegistration,
  clearEventRegistrations,
} from '../controllers/registration.controller';
import {
  getBulkEmailRecipients,
  sendBulkEmailToAll,
  getBulkEmailLogs,
} from '../controllers/bulkEmail.controller';

const router = Router();

router.use(adminProtect);

// Dashboard
router.get('/dashboard', adminDashboard);

// Events
router.get('/events', adminListEvents);
router.get('/events/:eventId', adminGetEvent);
router.post('/events', adminCreateEvent);
router.put('/events/:eventId', adminUpdateEvent);
router.patch('/events/:eventId/status', adminSetEventStatus);
router.delete('/events/:eventId', adminDeleteEvent);

// Send event email to all or selected verified students (rate-limited to prevent accidental mass resends)
const sendEventEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many event-email send requests. Please wait and try again.' },
});
router.post('/events/:eventId/send-to-all', sendEventEmailLimiter, sendEventToAllStudents);
router.post('/events/:eventId/send-registration-email', sendEventEmailLimiter, sendEventToAllStudents);
router.get('/events/:eventId/verified-count', getVerifiedStudentCount);

// Event registrations (Google Form webhook submissions per event)
router.get('/registration-stats', getRegistrationStats);
router.get('/events-with-registrations', listEventsWithRegistrationCounts);
router.get('/events/:eventId/registrations', listEventRegistrations);
router.get('/events/:eventId/registration-count', eventRegistrationCount);
router.get('/events/:eventId/registrations/export', exportEventRegistrationsAsCsv);
router.post('/events/:eventId/registrations/bulk', bulkAddRegistrations);

// Event distribution — PDF generation + email sending + history
router.get('/events/:eventId/registration-list', generateRegistrationListPDF);
router.post('/events/:eventId/send-pdf', sendEventRegistrationPDFToAll);
router.post('/events/:eventId/send-emails', sendEventEmails);
router.get('/events/:eventId/sending-history', getEventSendingHistory);

// Event registrations deletion / clear
router.delete('/events/:eventId/registrations/clear', clearEventRegistrations);
router.delete('/events/:eventId/registrations/:registrationId', deleteEventRegistration);

// Event certificate management (register → participate → certificate)
router.get('/events/:eventId/participants', listEventParticipants);
router.post('/events/:eventId/participation', markEventParticipation);
router.get('/events/:eventId/certificates', listEventCertificates);
router.post('/events/:eventId/certificates/generate', generateEventCertificates);
router.post('/events/:eventId/certificates/preview', previewEventCertificate);
router.delete('/events/:eventId/certificates/:certificateId', deleteEventCertificate);

// Registrations & Attendance (per event)
router.get('/registrations', adminListRegistrations);
router.get('/attended', adminListAttended);

// Students
router.get('/students', adminListStudents);
router.get('/students/export', exportStudents);
router.get('/students/:id', adminGetStudent);
router.patch('/students/:id/status', adminToggleStudentStatus);
router.delete('/students/:id', adminDeleteStudent);

// Members
router.get('/members', adminListMembers);
router.post('/members', createMember);
router.put('/members/:id', updateMember);
router.delete('/members/:id', deleteMember);

// Coordinator Roles
router.get('/coordinator-roles', adminListCoordinatorRoles);
router.post('/coordinator-roles', createCoordinatorRole);
router.put('/coordinator-roles/:id', updateCoordinatorRole);
router.delete('/coordinator-roles/:id', deleteCoordinatorRole);

// Certificate campaigns
router.get('/certificate-campaigns', listCampaigns);
router.get('/certificate-campaigns/:id', getCampaign);
router.post('/certificate-campaigns', createCampaign);
router.put('/certificate-campaigns/:id', updateCampaign);
router.delete('/certificate-campaigns/:id', deleteCampaign);
router.post('/certificate-campaigns/:id/calculate', calculateEligibility);
router.post('/certificate-campaigns/:id/generate', generateCertificates);
router.post('/certificate-campaigns/:id/generate/:studentId', generateSingleCertificate);

// Certificates
router.get('/certificates', adminListCertificates);
router.get('/certificates/stats', adminCertificateStats);
router.post('/certificates/quick-generate', quickGenerateAndSendCertificate);
router.post('/certificates/preview-pdf', previewCertificatePdf);
router.post('/certificates/:certificateId/send-email', resendCertificateEmail);
router.post('/certificates/:certificateId/revoke', revokeCertificate);
router.post('/certificates/:certificateId/restore', restoreCertificate);

// Gallery
router.post('/gallery', uploadMemory.single('image'), createGalleryItem);
router.delete('/gallery/:id', deleteGalleryItem);

// Resources
router.get('/resources', adminListResources);
router.post('/resources', createResource);
router.put('/resources/:id', updateResource);
router.delete('/resources/:id', deleteResource);

// Form registrations (generic Google Form webhook submissions)
router.get('/form-registrations', adminListFormRegistrations);
router.get('/form-registrations/:id', adminGetFormRegistration);
router.patch('/form-registrations/:id/read', adminMarkFormRegistrationRead);

// Bulk Email
router.get('/bulk-email/recipients', getBulkEmailRecipients);
router.post('/bulk-email/send', sendBulkEmailToAll);
router.get('/bulk-email/logs', getBulkEmailLogs);

export default router;
