import { penaltyService } from '../services/penalty.service';

/**
 * 패널티 자동 리셋 cron job
 * 매일 자정 실행 (server.ts에서 cron.schedule로 호출)
 */
export async function runPenaltyReset(): Promise<void> {
  try {
    // 1. 정지 기간 만료된 사용자 해제
    const unsuspendedCount = await penaltyService.resetExpiredSuspensions();
    if (unsuspendedCount > 0) {
      console.log(`[CRON] 정지 해제: ${unsuspendedCount}명`);
    }

    // 2. 1개월 경과 패널티 점수 재계산
    const resetCount = await penaltyService.resetMonthlyPenalties();
    if (resetCount > 0) {
      console.log(`[CRON] 패널티 점수 재계산: ${resetCount}명`);
    }
  } catch (error) {
    console.error('[CRON] 패널티 리셋 실패:', error);
  }
}
