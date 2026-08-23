import { Router } from 'express';
import { googleFormWebhook, googleFormTest } from '../controllers/webhook.controller';
import { eventWebhook } from '../controllers/registration.controller';

const router = Router();
router.post('/webhook', googleFormWebhook);
router.post('/test', googleFormTest);

export default router;

export const registrationWebhookRouter = Router();
registrationWebhookRouter.post('/webhook/:eventId', eventWebhook);
