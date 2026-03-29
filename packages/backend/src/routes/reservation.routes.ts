import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { reservationGuard } from '../middleware/reservation-guard';
import {
  createReservation,
  getMyReservations,
  getSlots,
  updateReservation,
  cancelReservation,
} from '../controllers/reservation.controller';

const router = Router();

// 모든 예약 라우트는 인증 필요
router.use(authenticate);

// GET /api/reservations/slots?date=YYYY-MM-DD&spaceId=uuid
router.get('/slots', getSlots);

// GET /api/reservations/me?status=CONFIRMED|CANCELLED|all&page=1&limit=10
router.get('/me', getMyReservations);

// POST /api/reservations (reservation-guard: 정지/한도 검증)
router.post('/', reservationGuard, createReservation);

// PUT /api/reservations/:id (reservation-guard: 정지/한도 검증)
router.put('/:id', reservationGuard, updateReservation);

// DELETE /api/reservations/:id
router.delete('/:id', cancelReservation);

export default router;
