import { Router } from 'express';
import { adminLogin, adminLogout, adminMe, adminChangePassword } from '../controllers/adminAuth.controller';
import { adminProtect } from '../middleware/adminAuth';

const router = Router();

router.post('/login', adminLogin);
router.post('/logout', adminLogout);
router.get('/me', adminProtect, adminMe);
router.put('/password', adminProtect, adminChangePassword);

export default router;
