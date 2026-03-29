/**
 * Penalty Integration Tests
 * 시나리오 2: 패널티 5점 차단
 * 시나리오 6: 당일 취소 패널티
 */
import request from 'supertest';
import { createApp } from '../../src/app';
import { resetAndSeedDatabase, testPrisma } from '../setup';
import { loginAs, getTodayDate, getTomorrowDate } from '../helpers/auth.helper';
import { SPACE_ID } from '../fixtures/spaces.fixture';
import { USER_ID } from '../fixtures/users.fixture';

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

/**
 * 오늘 날짜 예약을 DB에 직접 생성하는 헬퍼
 */
async function createTodayReservation(
  userId: string,
  spaceId: string,
  startTime: string,
  endTime: string,
  seqNum: number,
): Promise<string> {
  const today = getTodayDate();
  const id = `20000000-0000-4000-a000-000000${String(seqNum).padStart(6, '0')}`;
  await testPrisma.reservation.create({
    data: {
      id,
      reservation_number: `R${today.replace(/-/g, '')}${String(seqNum).padStart(5, '0')}`,
      user_id: userId,
      space_id: spaceId,
      date: new Date(today),
      start_time: new Date(`1970-01-01T${startTime}:00Z`),
      end_time: new Date(`1970-01-01T${endTime}:00Z`),
      status: 'CONFIRMED',
      requested_at: new Date(),
    },
  });
  return id;
}

describe('Penalty Integration', () => {
  test('당일 취소 5회 -> 패널티 5점 도달 시 is_suspended=true, suspended_until 설정', async () => {
    const cookies = await loginAs(app, 'student@test.com');

    // 각기 다른 공간의 다른 시간대 (공간 ID를 하나만 사용해도 시간대가 다르면 OK)
    const timeSlots = [
      { s: '09:00', e: '11:00' },
      { s: '11:00', e: '13:00' },
      { s: '13:00', e: '15:00' },
      { s: '15:00', e: '17:00' },
      { s: '17:00', e: '19:00' },
    ];

    // 5건의 오늘 예약을 만들고 순차 취소
    for (let i = 0; i < 5; i++) {
      const resId = await createTodayReservation(
        USER_ID.STUDENT,
        SPACE_ID.FOCUS_1,
        timeSlots[i].s,
        timeSlots[i].e,
        i + 10,
      );

      const res = await request(app)
        .delete(`/api/reservations/${resId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.penaltyApplied).toBe(true);
    }

    // DB에서 정지 상태 확인
    const user = await testPrisma.user.findUnique({ where: { id: USER_ID.STUDENT } });
    expect(user!.penalty_score).toBe(5);
    expect(user!.is_suspended).toBe(true);
    expect(user!.suspended_until).not.toBeNull();

    // 정지 해제일은 30일 후
    const diffDays = Math.round(
      (user!.suspended_until!.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(31);
  });

  test('패널티 5점인 사용자 예약 시 PENALTY_BLOCKED(422)', async () => {
    // user-penalty는 penalty_score=4, 당일 취소 1회로 5점 도달
    const cookies = await loginAs(app, 'penalty@test.com');

    // 오늘 예약 1건 생성 후 당일 취소 -> 5점 도달 + 정지
    const resId = await createTodayReservation(USER_ID.PENALTY, SPACE_ID.FOCUS_2, '09:00', '11:00', 100);

    await request(app)
      .delete(`/api/reservations/${resId}`)
      .set('Cookie', cookies);

    // 정지 상태 확인
    const userAfter = await testPrisma.user.findUnique({ where: { id: USER_ID.PENALTY } });
    expect(userAfter!.penalty_score).toBe(5);
    expect(userAfter!.is_suspended).toBe(true);

    // 정지 상태에서 새 예약 시도 -> 422
    const res = await request(app)
      .post('/api/reservations')
      .set('Cookie', cookies)
      .send({
        spaceId: SPACE_ID.FOCUS_3,
        date: getTomorrowDate(),
        startTime: '13:00',
        endTime: '15:00',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('PENALTY_BLOCKED');
  });

  test('패널티 로그가 정확히 기록됨', async () => {
    const cookies = await loginAs(app, 'student@test.com');

    const resId = await createTodayReservation(USER_ID.STUDENT, SPACE_ID.FOCUS_4, '09:00', '11:00', 200);

    await request(app)
      .delete(`/api/reservations/${resId}`)
      .set('Cookie', cookies);

    const logs = await testPrisma.penaltyLog.findMany({
      where: { user_id: USER_ID.STUDENT },
    });

    expect(logs.length).toBe(1);
    expect(logs[0].score).toBe(1);
    expect(logs[0].reason).toContain('당일');
    expect(logs[0].reservation_id).toBe(resId);
  });
});
