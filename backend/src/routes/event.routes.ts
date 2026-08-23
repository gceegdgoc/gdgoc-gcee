import { Router } from 'express';
import {
  listEvents,
  getEvent,
  checkMemberEligibility,
  registerForEvent,
  registerPublicEvent,
  unregisterFromEvent,
  myEvents,
} from '../controllers/event.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/', listEvents);
router.get('/my/registered', protect, myEvents);
router.get('/:eventId', getEvent);
router.post('/:eventId/check-membership', checkMemberEligibility);
router.post('/:eventId/register-public', registerPublicEvent);
router.post('/:eventId/continue-registration', registerPublicEvent);
router.post('/:eventId/register', protect, registerForEvent);
router.delete('/:eventId/register', protect, unregisterFromEvent);

export default router;
