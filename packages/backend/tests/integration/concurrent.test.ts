/**
 * Concurrent Reservation Tests
 * 시나리오 1: 선착순 동시 예약 (10개 동시 요청)
 *
 * 같은 공간/시간대에 10개 사용자가 동시에 예약 요청 ->
 * 정확히 1개만 성공(201), 나머지 9개는 409 Conflict.
 */
import request from 'supertest';
import { createApp } from '../../src/app';
import { resetAndSeedDatabase, testPrisma } from '../setup';
import { loginAs, getTomorrowDate } from '../helpers/auth.helper';
import { SPACE_ID } from '../fixtures/spaces.fixture';
import bcrypt from 'bcryptjs';

jest.mock('../../src/services/email.service', () => ({
  emailService: {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendTempPasswordEmail: jest.fn().mockResolvedValue(undefined),
    sendReservationConfirmEmail: jest.fn().mockResolvedValue(undefined),
    sendReservationCancelledEmail: jest.fn().mockResolvedValue(undefined),
    sendReservationModifiedEmail: jest.fn().mockResolvedValue(undefined),
    sendStartupClubResultEmail: jest.fn().mockResolvedValue(undefined),
    sendPenaltySuspensionEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

const app = createApp();

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://user:password@localhost:5433/reservation_test_db';
});

beforeEach(async () => {
  await resetAndSeedDatabase();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe('Concurrent Reservation', () => {
  test('같은 공간/시간대에 10개 동시 요청 -> 1개 성공, 9개 409', async () => {
    const hash = bcrypt.hashSync('Test1234!', 12);

    // 10명의 추가 사용자 생성
    const concurrentUsers = Array.from({ length: 10 }, (_, i) => ({
      id: `40000000-0000-4000-a000-0000000000${String(i).padStart(2, '0')}`,
      name: `동시유저${i}`,
      email: `concurrent${i}@test.com`,
      password_hash: hash,
      role: 'STUDENT' as const,
      student_type: 'NORMAL' as const,
      university: '대구대학교',
      student_id: `20240${String(i).padStart(2, '0')}`,
      email_verified: true,
      penalty_score: 0,
      is_suspended: false,
    }));

    await testPrisma.user.createMany({ data: concurrentUsers });

    // 10명 로그인
    const cookiePromises = concurrentUsers.map((u) => loginAs(app, u.email));
    const allCookies = await Promise.all(cookiePromises);

    const tomorrow = getTomorrowDate();

    // 비어 있는 슬롯에 10명 동시 요청
    const results = await Promise.all(
      allCookies.map((cookies) =>
        request(app)
          .post('/api/reservations')
          .set('Cookie', cookies)
          .send({
            spaceId: SPACE_ID.MEETING_3, // 아직 예약 없는 공간
            date: tomorrow,
            startTime: '15:00',
            endTime: '17:00',
          }),
      ),
    );

    const successes = results.filter((r) => r.status === 201);
    const conflicts = results.filter((r) => r.status === 409);

    // 유니크 부분 인덱스(uq_reservation_slot)에 의해
    // 정확히 1개만 성공하고 나머지는 409
    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(9);

    // DB에 CONFIRMED 상태 예약이 정확히 1건
    const confirmed = await testPrisma.reservation.count({
      where: {
        space_id: SPACE_ID.MEETING_3,
        date: new Date(tomorrow),
        start_time: new Date('1970-01-01T15:00:00Z'),
        status: 'CONFIRMED',
        deleted_at: null,
      },
    });
    expect(confirmed).toBe(1);
  }, 30000);
});
