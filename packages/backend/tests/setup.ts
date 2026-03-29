import { PrismaClient } from '@prisma/client';
import { spaceFixtures } from './fixtures/spaces.fixture';
import { usersFixture, USER_ID } from './fixtures/users.fixture';
import { reservationFixtures } from './fixtures/reservations.fixture';

// 환경변수 설정 (jest setupFiles에서 실행됨)
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access_secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.NODE_ENV = 'test';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://user:password@localhost:5433/reservation_test_db',
    },
  },
});

export async function resetAndSeedDatabase() {
  // 동시 예약 방어를 위한 부분 유니크 인덱스 (없으면 생성)
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_reservation_slot
     ON reservations (space_id, date, start_time)
     WHERE status = 'CONFIRMED' AND deleted_at IS NULL`
  ).catch(() => {}); // 이미 존재하면 무시

  // FK 역순 삭제
  await prisma.$transaction([
    prisma.penaltyLog.deleteMany(),
    prisma.reservation.deleteMany(),
    prisma.startupClubApproval.deleteMany(),
    prisma.emailVerificationToken.deleteMany(),
    prisma.unavailableDate.deleteMany(),
    prisma.holiday.deleteMany(),
    prisma.user.deleteMany(),
    prisma.space.deleteMany(),
  ]);

  // 순방향 삽입: spaces -> users -> reservations
  await prisma.space.createMany({ data: spaceFixtures });
  await prisma.user.createMany({ data: usersFixture });
  await prisma.reservation.createMany({ data: reservationFixtures });

  // 창업동아리 미승인 사용자 StartupClubApproval 레코드 생성
  await prisma.startupClubApproval.create({
    data: {
      id: '30000000-0000-4000-a000-000000000001',
      user_id: USER_ID.STARTUP,
      status: 'PENDING',
    },
  });
}

export { prisma as testPrisma };
