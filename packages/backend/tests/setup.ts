import { PrismaClient } from '@prisma/client';
import { spaceFixtures } from './fixtures/spaces.fixture';
import { userFixtures } from './fixtures/users.fixture';
import { reservationFixtures } from './fixtures/reservations.fixture';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL } },
});

export async function resetAndSeedDatabase() {
  // 역순 삭제 (FK 의존성 고려)
  await prisma.penaltyLog.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.startupClubApproval.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.unavailableDate.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.user.deleteMany();
  await prisma.space.deleteMany();

  // 목업 데이터 삽입 (순방향)
  await prisma.space.createMany({ data: spaceFixtures });
  await prisma.user.createMany({ data: userFixtures });
  await prisma.reservation.createMany({ data: reservationFixtures });
}

export { prisma };

afterAll(async () => {
  await prisma.$disconnect();
});
