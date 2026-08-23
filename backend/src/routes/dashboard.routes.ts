import { Router } from 'express';
import { studentDashboard } from '../controllers/dashboard.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/', protect, studentDashboard);

export default router;
