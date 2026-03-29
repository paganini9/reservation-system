import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authenticate';
import { holidayService } from '../services/holiday.service';

const prisma = new PrismaClient();

/**
 * GET /api/spaces
 */
export async function getSpaces(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const spaces = await prisma.space.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });

    const mapped = spaces.map((s) => ({
      spaceId: s.id,
      name: s.name,
      type: s.type,
      capacity: s.capacity,
      isReservable: s.is_active,
    }));

    res.json({ success: true, data: { spaces: mapped } });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/calendar?month=YYYY-MM
 */
export async function getCalendar(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const monthParam = req.query.month as string;

    if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'month 파라미터 형식: YYYY-MM' },
      });
    }

    const [yearStr, monthStr] = monthParam.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '월은 1~12 사이여야 합니다.' },
      });
    }

    const userRole = req.user!.role;
    const days = await holidayService.getCalendarDays(year, month, userRole);

    res.json({
      success: true,
      data: { year, month, days },
    });
  } catch (error) {
    next(error);
  }
}
