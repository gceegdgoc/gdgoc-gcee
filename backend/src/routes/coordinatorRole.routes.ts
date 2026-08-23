import { Router } from 'express';
import { listCoordinatorRoles } from '../controllers/coordinatorRole.controller';

const router = Router();

router.get('/', listCoordinatorRoles);

export default router;
