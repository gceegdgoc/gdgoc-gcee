import { Router } from 'express';
import { listResources } from '../controllers/resource.controller';

const router = Router();

router.get('/', listResources);

export default router;
