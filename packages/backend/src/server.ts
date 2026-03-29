import 'dotenv/config';
import cron from 'node-cron';
import { createHttpServer } from './app';

const PORT = process.env.PORT ?? 4000;

const { httpServer } = createHttpServer();

// 패널티 자동 리셋 cron — 매일 자정 실행
// Phase 2에서 reservation-agent가 구현
cron.schedule('0 0 * * *', () => {
  console.log('[CRON] 패널티 자동 리셋 실행');
  // penaltyService.resetExpiredSuspensions();
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
