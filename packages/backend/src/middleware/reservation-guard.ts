import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './authenticate';
import { RESERVATION_LIMIT } from '@reservation/shared';

const prisma = new PrismaClient();

/**
 * 예약 전 검증 미들웨어
 * 1. 패널티 정지 여부
 * 2. 활성 예약 건수 한도
 */
export async function reservationGuard(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.userId;

    // 1. 사용자 조회 — 정지 여부 확인
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        is_suspended: true,
        suspended_until: true,
        student_type: true,
        startup_club_approved: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '사용자를 찾을 수 없습니다.' },
      });
    }

    // 정지 상태 + 정지 기간 내
    if (user.is_suspended && user.suspended_until && user.suspended_until > new Date()) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'PENALTY_BLOCKED',
          message: `패널티로 인해 예약이 정지되었습니다. 해제일: ${user.suspended_until.toISOString().split('T')[0]}`,
        },
      });
    }

    // 2. 활성 예약 건수 확인
    const confirmedCount = await prisma.reservation.count({
      where: {
        user_id: userId,
        status: 'CONFIRMED',
        deleted_at: null,
      },
    });

    // 한도 결정: STARTUP_CLUB + 승인완료 → 6, 그 외 → 3
    const limit =
      user.student_type === 'STARTUP_CLUB' && user.startup_club_approved
        ? RESERVATION_LIMIT.STARTUP_CLUB_APPROVED
        : RESERVATION_LIMIT.NORMAL_STUDENT;

    if (confirmedCount >= limit) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'LIMIT_EXCEEDED',
          message: `예약 한도(${limit}건)를 초과했습니다. 기존 예약을 취소 후 다시 시도해 주세요.`,
        },
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}
