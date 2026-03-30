import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import { adminService } from '../services/admin.service';

// ──────────────────────────────────────────
// 예약 관리
// ──────────────────────────────────────────

/**
 * GET /api/admin/reservations
 */
export async function getReservations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const date = req.query.date as string | undefined;
    const spaceId = req.query.spaceId as string | undefined;
    const userId = req.query.userId as string | undefined;

    const result = await adminService.getReservations({ date, spaceId, userId, page, limit });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/reservations
 */
export async function createReservation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { spaceId, date, startTime, endTime } = req.body;
    const adminUserId = req.user!.userId;

    if (!spaceId || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'spaceId, date, startTime, endTime은 필수입니다.' },
      });
    }

    const result = await adminService.createReservation(adminUserId, spaceId, date, startTime, endTime);

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/reservations/:id
 */
export async function updateReservation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { spaceId, date, startTime, endTime, reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '수정 사유(reason)는 필수입니다.' },
      });
    }

    if (!spaceId || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'spaceId, date, startTime, endTime은 필수입니다.' },
      });
    }

    const result = await adminService.updateReservation(id, spaceId, date, startTime, endTime, reason);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/reservations/:id
 */
export async function cancelReservation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '취소 사유(reason)는 필수입니다.' },
      });
    }

    const result = await adminService.cancelReservation(id, reason);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ──────────────────────────────────────────
// 창업동아리 승인
// ──────────────────────────────────────────

/**
 * GET /api/admin/startup-clubs
 */
export async function getStartupClubs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await adminService.getStartupClubs();

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/startup-clubs/:approvalId
 */
export async function processStartupClub(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { approvalId } = req.params;
    const { action, reason } = req.body;

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'action은 "APPROVE" 또는 "REJECT"이어야 합니다.' },
      });
    }

    const result = await adminService.processStartupClub(approvalId, action, reason);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ──────────────────────────────────────────
// 운영 불가일
// ──────────────────────────────────────────

/**
 * GET /api/admin/unavailable-dates
 */
export async function getUnavailableDates(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();

    const result = await adminService.getUnavailableDates(year);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/unavailable-dates
 */
export async function createUnavailableDate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate, reason } = req.body;
    const adminUserId = req.user!.userId;

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'startDate, endDate, reason은 필수입니다.' },
      });
    }

    const result = await adminService.createUnavailableDate(adminUserId, startDate, endDate, reason);

    const response: any = { success: true, data: result };
    if (result.warning) {
      response.warning = result.warning;
    }

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/unavailable-dates/:id
 */
export async function updateUnavailableDate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { startDate, endDate, reason } = req.body;
    const adminUserId = req.user!.userId;

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'startDate, endDate, reason은 필수입니다.' },
      });
    }

    const result = await adminService.updateUnavailableDate(id, adminUserId, startDate, endDate, reason);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/unavailable-dates/:id
 */
export async function deleteUnavailableDate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const result = await adminService.deleteUnavailableDate(id);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ──────────────────────────────────────────
// 사용자 관리
// ──────────────────────────────────────────

/**
 * GET /api/admin/users
 */
export async function getUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const search = req.query.search as string | undefined;
    const role = req.query.role as string | undefined;
    const sort = req.query.sort as string | undefined;
    const order = req.query.order as string | undefined;

    const result = await adminService.getUsers({ search, role, sort, order, page, limit });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/users/:userId/penalty
 */
export async function getUserPenalty(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;

    const result = await adminService.getUserPenalty(userId);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/users/:userId/penalty
 */
export async function adjustPenalty(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    const { score, reason } = req.body;

    if (score === undefined || score === null || typeof score !== 'number') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'score(숫자)는 필수입니다.' },
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'reason은 필수입니다.' },
      });
    }

    const result = await adminService.adjustPenalty(userId, score, reason);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/users/:userId/grant-admin
 */
export async function grantAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;

    const result = await adminService.grantAdmin(userId);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ──────────────────────────────────────────
// 사용자 일괄 작업
// ──────────────────────────────────────────

/**
 * DELETE /api/admin/users/bulk
 */
export async function bulkDeleteUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'userIds 배열은 필수입니다.' },
      });
    }
    const result = await adminService.bulkDeleteUsers(userIds);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/users/bulk/role
 */
export async function bulkChangeRole(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userIds, role, studentType, clubName } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0 || !role) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'userIds와 role은 필수입니다.' },
      });
    }
    const result = await adminService.bulkChangeRole(userIds, role, studentType, clubName);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/users/bulk/email
 */
export async function bulkSendEmail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userIds, subject, body } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0 || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'userIds, subject, body는 필수입니다.' },
      });
    }
    const result = await adminService.bulkSendEmail(userIds, subject, body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ──────────────────────────────────────────
// PDF 보고서
// ──────────────────────────────────────────

/**
 * GET /api/admin/reports/reservations
 */
export async function getReservationReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const dates = req.query['dates[]'];

    if (!dates) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'dates[] 파라미터는 필수입니다.' },
      });
    }

    const dateArray = Array.isArray(dates) ? (dates as string[]) : [dates as string];

    const result = await adminService.generateReservationReport(dateArray);

    if (result.type === 'pdf') {
      const dateStr = dateArray.join('_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="reservation-report-${dateStr}.pdf"`);
      result.doc.pipe(res);
    } else {
      // pdfkit이 없는 경우 JSON으로 대체
      res.json({ success: true, data: result.data });
    }
  } catch (error) {
    next(error);
  }
}
