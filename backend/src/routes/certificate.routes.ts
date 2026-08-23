import { Router } from 'express';
import { verifyCertificate, downloadCertificate, myCertificates } from '../controllers/certificate.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/verify/:certificateId', verifyCertificate);
router.get('/my', protect, myCertificates);
router.get('/:certificateId/download', downloadCertificate);

export default router;
