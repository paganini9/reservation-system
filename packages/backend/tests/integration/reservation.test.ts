/**
 * Reservation Integration Tests
 * 시나리오 1: 선착순 동시 예약
 * 시나리오 6: 당일 취소 패널티
 */
import request from 'supertest';
import { createApp } from '../../src/app';
import { resetAndSeedDatabase, testPrisma } from '../setup';
import { loginAs, getTomorrowDate, getTodayDate } from '../helpers/auth.helper';
import { SPACE_ID } from '../fixtures/spaces.fixture';
import { USER_ID } from '../fixtures/users.fixture';
import { RES_ID } from '../fixtures/reservations.fixture';

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

describe('Reservation Integration', () => {
  // ─── 예약 생성 ───
  describe('POST /api/reservations', () => {
    test('예약 생성 성공', async () => {
      const cookies = await loginAs(app, 'student@test.com');
      const tomorrow = getTomorrowDate();

      const res = await request(app)
        .post('/api/reservations')
        .set('Cookie', cookies)
        .send({
          spaceId: SPACE_ID.MEETING_2,
          date: tomorrow,
          startTime: '13:00',
          endTime: '15:00',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.spaceId).toBe(SPACE_ID.MEETING_2);
      expect(res.body.data.status).toBe('CONFIRMED');
      expect(res.body.data.reservationNumber).toMatch(/^R\d{8}\d{5}$/);
    });

    test('동일 시간대 중복 예약 거부(409)', async () => {
      const cookies = await loginAs(app, 'general@test.com');
      const tomorrow = getTomorrowDate();

      // MEETING_1의 09:00~11:00은 이미 fixture로 예약됨
      const res = await request(app)
        .post('/api/reservations')
        .set('Cookie', cookies)
        .send({
          spaceId: SPACE_ID.MEETING_1,
          date: tomorrow,
          startTime: '09:00',
          endTime: '11:00',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    test('인증 없이 예약 시 401', async () => {
      const res = await request(app)
        .post('/api/reservations')
        .send({
          spaceId: SPACE_ID.MEETING_2,
          date: getTomorrowDate(),
          startTime: '13:00',
          endTime: '15:00',
        });

      expect(res.status).toBe(401);
    });
  });

  // ─── 예약 조회 ───
  describe('GET /api/reservations/me', () => {
    test('내 예약 목록 조회', async () => {
      const cookies = await loginAs(app, 'student@test.com');

      const res = await request(app)
        .get('/api/reservations/me')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.items[0].reservationId).toBe(RES_ID.BASIC);
    });
  });

  // ─── 시간대 조회 ───
  describe('GET /api/reservations/slots', () => {
    test('예약된 슬롯은 BOOKED 상태', async () => {
      const cookies = await loginAs(app, 'student@test.com');
      const tomorrow = getTomorrowDate();

      const res = await request(app)
        .get('/api/reservations/slots')
        .query({ date: tomorrow, spaceId: SPACE_ID.MEETING_1 })
        .set('Cookie', cookies);

      expect(res.status).toBe(200);

      const slots = res.body.data.slots;
      const slot9 = slots.find((s: any) => s.startTime === '09:00');
      expect(slot9.status).toBe('BOOKED');

      // 다른 시간대는 AVAILABLE
      const slot13 = slots.find((s: any) => s.startTime === '13:00');
      expect(slot13.status).toBe('AVAILABLE');
    });
  });

  // ─── 예약 수정 (원자적 교체) ───
  describe('PUT /api/reservations/:id', () => {
    test('예약 수정 성공 (원자적 교체)', async () => {
      const cookies = await loginAs(app, 'student@test.com');
      const tomorrow = getTomorrowDate();

      const res = await request(app)
        .put(`/api/reservations/${RES_ID.BASIC}`)
        .set('Cookie', cookies)
        .send({
          spaceId: SPACE_ID.MEETING_1,
          date: tomorrow,
          startTime: '13:00',
          endTime: '15:00',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.startTime).toBe('13:00');

      // 기존 예약은 CANCELLED
      const oldRes = await testPrisma.reservation.findUnique({ where: { id: RES_ID.BASIC } });
      expect(oldRes!.status).toBe('CANCELLED');
    });
  });

  // ─── 예약 취소 ───
  describe('DELETE /api/reservations/:id', () => {
    test('하루 전 취소 시 패널티 없음', async () => {
      const cookies = await loginAs(app, 'student@test.com');

      // RES_ID.BASIC은 내일 예약이므로 당일 취소가 아님
      const res = await request(app)
        .delete(`/api/reservations/${RES_ID.BASIC}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
      expect(res.body.data.penaltyApplied).toBe(false);
      expect(res.body.data.penaltyScore).toBe(0);
    });

    test('당일 취소 시 패널티 +1점', async () => {
      const cookies = await loginAs(app, 'student@test.com');
      const today = getTodayDate();

      // 오늘 날짜 예약을 직접 DB에 생성
      const todayResId = '20000000-0000-4000-a000-000000000099';
      await testPrisma.reservation.create({
        data: {
          id: todayResId,
          reservation_number: 'R' + today.replace(/-/g, '') + '00099',
          user_id: USER_ID.STUDENT,
          space_id: SPACE_ID.MEETING_2,
          date: new Date(today),
          start_time: new Date('1970-01-01T15:00:00Z'),
          end_time: new Date('1970-01-01T17:00:00Z'),
          status: 'CONFIRMED',
          requested_at: new Date(),
        },
      });

      const res = await request(app)
        .delete(`/api/reservations/${todayResId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
      expect(res.body.data.penaltyApplied).toBe(true);
      expect(res.body.data.penaltyScore).toBe(1);
      expect(res.body.data.currentTotalPenalty).toBe(1);

      // DB에서 패널티 로그 확인
      const log = await testPrisma.penaltyLog.findFirst({
        where: { user_id: USER_ID.STUDENT, reservation_id: todayResId },
      });
      expect(log).not.toBeNull();
      expect(log!.score).toBe(1);
    });
  });
});
