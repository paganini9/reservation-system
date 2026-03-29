import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { getSpaces, getCalendar } from '../controllers/space.controller';

const router = Router();

// 모든 공간/달력 라우트는 인증 필요
router.use(authenticate);

// GET /api/spaces
router.get('/spaces', getSpaces);

// GET /api/calendar?month=YYYY-MM
router.get('/calendar', getCalendar);

export default router;
