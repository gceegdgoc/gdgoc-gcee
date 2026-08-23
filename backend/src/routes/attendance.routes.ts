import { Router } from 'express';
import { qrMarkAttendance, myAttendance } from '../controllers/attendance.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/my', protect, myAttendance);
router.post('/qr', protect, qrMarkAttendance);
router.get('/qr/scan', protect, qrMarkAttendance);

export default router;
