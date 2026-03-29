import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SPACES } from '../../shared/src/constants/spaces';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 공간 23개 생성
  for (const space of SPACES) {
    await prisma.space.upsert({
      where: { id: space.spaceId },
      update: {},
      create: {
        id: space.spaceId,
        name: space.name,
        type: space.type as any,
        capacity: space.capacity,
        is_active: true,
      },
    });
  }

  // 기본 관리자 계정 생성
  const adminHash = await bcrypt.hash('1234', 10);
  await prisma.user.upsert({
    where: { email: 'paganini9@gmail.com' },
    update: {},
    create: {
      name: '관리자',
      email: 'paganini9@gmail.com',
      password_hash: adminHash,
      role: 'ADMIN',
      email_verified: true,
    },
  });

  console.log('Seeding complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
