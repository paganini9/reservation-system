import { PrismaClient } from '@prisma/client';
import { PENALTY } from '@reservation/shared';
import { emailService } from './email.service';

const prisma = new PrismaClient();

class PenaltyService {
  /**
   * 패널티 부과 (당일취소 시)
   * @returns 정지 여부와 현재 총 점수
   */
  async applyPenalty(
    userId: string,
    reservationId: string,
    score: number,
    reason: string,
  ): Promise<{ totalScore: number; suspended: boolean; suspendedUntil: Date | null }> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        penalty_score: { increment: score },
        penalty_logs: {
          create: {
            reservation_id: reservationId,
            score,
            reason,
          },
        },
      },
    });

    const totalScore = user.penalty_score;
    let suspended = false;
    let suspendedUntil: Date | null = null;

    // 정지 임계값 도달
    if (totalScore >= PENALTY.SUSPENSION_THRESHOLD && !user.is_suspended) {
      const now = new Date();
      suspendedUntil = new Date(now.getTime() + PENALTY.SUSPENSION_DAYS * 24 * 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: userId },
        data: {
          is_suspended: true,
          suspended_at: now,
          suspended_until: suspendedUntil,
        },
      });

      suspended = true;

      // 정지 안내 이메일
      emailService.sendPenaltySuspensionEmail(user.email, suspendedUntil).catch(() => {});
    }

    return { totalScore, suspended, suspendedUntil };
  }

  /**
   * 정지 해제 cron — suspended_until이 지난 사용자
   */
  async resetExpiredSuspensions(): Promise<number> {
    const now = new Date();
    const result = await prisma.user.updateMany({
      where: {
        is_suspended: true,
        suspended_until: { lte: now },
      },
      data: {
        is_suspended: false,
        suspended_at: null,
        suspended_until: null,
      },
    });
    return result.count;
  }

  /**
   * 1개월 경과 후 패널티 점수 리셋
   * penalty_logs에서 1개월 이상 된 로그를 제외하고 점수 재계산
   */
  async resetMonthlyPenalties(): Promise<number> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // 정지 상태가 아닌 사용자 중 패널티가 있는 사용자 조회
    const usersWithPenalty = await prisma.user.findMany({
      where: {
        penalty_score: { gt: 0 },
        is_suspended: false,
        deleted_at: null,
      },
      select: { id: true },
    });

    let resetCount = 0;

    for (const user of usersWithPenalty) {
      // 최근 1개월 이내 로그만 합산
      const recentLogs = await prisma.penaltyLog.aggregate({
        where: {
          user_id: user.id,
          created_at: { gte: oneMonthAgo },
        },
        _sum: { score: true },
      });

      const newScore = Math.max(0, recentLogs._sum.score ?? 0);

      await prisma.user.update({
        where: { id: user.id },
        data: { penalty_score: newScore },
      });

      resetCount++;
    }

    return resetCount;
  }
}

export const penaltyService = new PenaltyService();
