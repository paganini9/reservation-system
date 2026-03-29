import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import { reservationService } from '../services/reservation.service';
import { TIME_SLOTS } from '@reservation/shared';

/**
 * POST /api/reservations
 */
export async function createReservation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { spaceId, date, startTime, endTime } = req.body;
    const userId = req.user!.userId;

    // 기본 유효성 검증
    if (!spaceId || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'spaceId, date, startTime, endTime은 필수입니다.' },
      });
    }

    // 유효한 시간대인지 확인
    const validSlot = TIME_SLOTS.find((s) => s.start === startTime && s.end === endTime);
    if (!validSlot) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 시간대입니다.' },
      });
    }

    // 날짜 형식 검증 (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' },
      });
    }

    const result = await reservationService.createReservation(userId, spaceId, date, startTime, endTime);

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reservations/me
 */
export async function getMyReservations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const status = (req.query.status as string) || 'all';
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));

    const result = await reservationService.getMyReservations(userId, status, page, limit);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reservations/slots
 */
export async function getSlots(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { date, spaceId } = req.query as { date: string; spaceId: string };

    if (!date || !spaceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'date와 spaceId는 필수입니다.' },
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' },
      });
    }

    const slots = await reservationService.getSlots(date, spaceId);

    res.json({ success: true, data: { date, spaceId, slots } });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/reservations/:id
 */
export async function updateReservation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { spaceId, date, startTime, endTime } = req.body;
    const userId = req.user!.userId;

    if (!spaceId || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'spaceId, date, startTime, endTime은 필수입니다.' },
      });
    }

    const validSlot = TIME_SLOTS.find((s) => s.start === startTime && s.end === endTime);
    if (!validSlot) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 시간대입니다.' },
      });
    }

    const result = await reservationService.updateReservation(id, userId, spaceId, date, startTime, endTime);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/reservations/:id
 */
export async function cancelReservation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const result = await reservationService.cancelReservation(id, userId);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
