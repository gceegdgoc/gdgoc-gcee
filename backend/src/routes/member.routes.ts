import { Router } from 'express';
import { listMembers } from '../controllers/member.controller';

const router = Router();

router.get('/', listMembers);

export default router;
