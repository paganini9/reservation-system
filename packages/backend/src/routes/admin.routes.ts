import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  getReservations,
  createReservation,
  updateReservation,
  cancelReservation,
  getStartupClubs,
  processStartupClub,
  getUnavailableDates,
  createUnavailableDate,
  updateUnavailableDate,
  deleteUnavailableDate,
  getUsers,
  getUserPenalty,
  adjustPenalty,
  grantAdmin,
  bulkDeleteUsers,
  bulkChangeRole,
  bulkSendEmail,
  getReservationReport,
} from '../controllers/admin.controller';

const router = Router();

// 모든 라우트에 authenticate + authorize('ADMIN') 적용
router.use(authenticate, authorize('ADMIN'));

// ─── 예약 관리 ───
router.get('/reservations', getReservations);
router.post('/reservations', createReservation);
router.put('/reservations/:id', updateReservation);
router.delete('/reservations/:id', cancelReservation);

// ─── 창업동아리 승인 ───
router.get('/startup-clubs', getStartupClubs);
router.patch('/startup-clubs/:approvalId', processStartupClub);

// ─── 운영 불가일 ───
router.get('/unavailable-dates', getUnavailableDates);
router.post('/unavailable-dates', createUnavailableDate);
router.put('/unavailable-dates/:id', updateUnavailableDate);
router.delete('/unavailable-dates/:id', deleteUnavailableDate);

// ─── 사용자 관리 ───
router.get('/users', getUsers);
router.post('/users/bulk/delete', bulkDeleteUsers);
router.patch('/users/bulk/role', bulkChangeRole);
router.post('/users/bulk/email', bulkSendEmail);
router.get('/users/:userId/penalty', getUserPenalty);
router.patch('/users/:userId/penalty', adjustPenalty);
router.post('/users/:userId/grant-admin', grantAdmin);

// ─── 보고서 ───
router.get('/reports/reservations', getReservationReport);

export default router;
