/**
 * Admin Integration Tests
 * 시나리오 4: 창업동아리 승인 후 한도 변경
 * 시나리오 5: 관리자 강제 취소 패널티 미부과
 */
import request from 'supertest';
import { createApp } from '../../src/app';
import { resetAndSeedDatabase, testPrisma } from '../setup';
import { loginAs, getTomorrowDate, getFutureDate } from '../helpers/auth.helper';
import { SPACE_ID } from '../fixtures/spaces.fixture';
import { USER_ID } from '../fixtures/users.fixture';
import { RES_ID } from '../fixtures/reservations.fixture';

const APPROVAL_ID = '30000000-0000-4000-a000-000000000001';

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

describe('Admin Integration', () => {
  // ─── 창업동아리 승인 ───
  describe('PATCH /api/admin/startup-clubs/:approvalId', () => {
    test('창업동아리 승인 후 예약 한도 6으로 변경', async () => {
      const adminCookies = await loginAs(app, 'admin@test.com');

      // 승인 요청
      const res = await request(app)
        .patch(`/api/admin/startup-clubs/${APPROVAL_ID}`)
        .set('Cookie', adminCookies)
        .send({ action: 'APPROVE' });

      expect(res.status).toBe(200);
      expect(res.body.data.action).toBe('APPROVE');
      expect(res.body.data.reservationLimit).toBe(6);

      // DB에서 startup_club_approved 확인
      const user = await testPrisma.user.findUnique({ where: { id: USER_ID.STARTUP } });
      expect(user!.startup_club_approved).toBe(true);

      // StartupClubApproval 상태 확인
      const approval = await testPrisma.startupClubApproval.findUnique({
        where: { id: APPROVAL_ID },
      });
      expect(approval!.status).toBe('APPROVED');
      expect(approval!.processed_at).not.toBeNull();
    });

    test('관리자가 아닌 사용자의 접근 거부(403)', async () => {
      const studentCookies = await loginAs(app, 'student@test.com');

      const res = await request(app)
        .patch(`/api/admin/startup-clubs/${APPROVAL_ID}`)
        .set('Cookie', studentCookies)
        .send({ action: 'APPROVE' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // ─── 관리자 강제 취소 ───
  describe('DELETE /api/admin/reservations/:id', () => {
    test('관리자 강제 취소 시 패널티 미부과', async () => {
      const adminCookies = await loginAs(app, 'admin@test.com');

      // RES_ID.BASIC (내일 예약) 강제 취소
      const res = await request(app)
        .delete(`/api/admin/reservations/${RES_ID.BASIC}`)
        .set('Cookie', adminCookies)
        .send({ reason: '시설 점검' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
      expect(res.body.data.penaltyApplied).toBe(false);
      expect(res.body.data.cancelledByAdmin).toBe(true);

      // DB에서 cancelled_by_admin 확인
      const reservation = await testPrisma.reservation.findUnique({ where: { id: RES_ID.BASIC } });
      expect(reservation!.cancelled_by_admin).toBe(true);
      expect(reservation!.admin_reason).toBe('시설 점검');

      // 패널티 로그가 생성되지 않았는지 확인
      const penaltyLogs = await testPrisma.penaltyLog.findMany({
        where: { reservation_id: RES_ID.BASIC },
      });
      expect(penaltyLogs.length).toBe(0);

      // 사용자 패널티 점수 변화 없음
      const user = await testPrisma.user.findUnique({ where: { id: USER_ID.STUDENT } });
      expect(user!.penalty_score).toBe(0);
    });

    test('관리자 강제 취소 시 사유 필수(400)', async () => {
      const adminCookies = await loginAs(app, 'admin@test.com');

      const res = await request(app)
        .delete(`/api/admin/reservations/${RES_ID.BASIC}`)
        .set('Cookie', adminCookies)
        .send({}); // reason 누락

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ─── 운영 불가일 등록 ───
  describe('POST /api/admin/unavailable-dates', () => {
    test('운영 불가일 등록 성공', async () => {
      const adminCookies = await loginAs(app, 'admin@test.com');
      const futureStart = getFutureDate(7);
      const futureEnd = getFutureDate(8);

      const res = await request(app)
        .post('/api/admin/unavailable-dates')
        .set('Cookie', adminCookies)
        .send({
          startDate: futureStart,
          endDate: futureEnd,
          reason: '시설 보수 공사',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.startDate).toBe(futureStart);
      expect(res.body.data.endDate).toBe(futureEnd);
      expect(res.body.data.reason).toBe('시설 보수 공사');

      // DB 확인
      const records = await testPrisma.unavailableDate.findMany();
      expect(records.length).toBe(1);
    });

    test('예약 존재 기간에 등록 시 경고 포함', async () => {
      const adminCookies = await loginAs(app, 'admin@test.com');
      const tomorrow = getTomorrowDate();

      // 내일에 이미 fixture 예약(RES_ID.BASIC)이 있음
      const res = await request(app)
        .post('/api/admin/unavailable-dates')
        .set('Cookie', adminCookies)
        .send({
          startDate: tomorrow,
          endDate: tomorrow,
          reason: '긴급 점검',
        });

      expect(res.status).toBe(201);
      expect(res.body.warning).toBeDefined();
      expect(res.body.warning).toContain('확정 예약');
    });
  });

  // ─── 패널티 수동 조정 ───
  describe('PATCH /api/admin/users/:userId/penalty', () => {
    test('관리자 패널티 수동 조정', async () => {
      const adminCookies = await loginAs(app, 'admin@test.com');

      const res = await request(app)
        .patch(`/api/admin/users/${USER_ID.PENALTY}/penalty`)
        .set('Cookie', adminCookies)
        .send({ score: 0, reason: '선처 차감' });

      expect(res.status).toBe(200);
      expect(res.body.data.penaltyScore).toBe(0);
      expect(res.body.data.isSuspended).toBe(false);

      // DB 확인
      const user = await testPrisma.user.findUnique({ where: { id: USER_ID.PENALTY } });
      expect(user!.penalty_score).toBe(0);
      expect(user!.is_suspended).toBe(false);

      // 조정 로그 확인
      const log = await testPrisma.penaltyLog.findFirst({
        where: { user_id: USER_ID.PENALTY },
        orderBy: { created_at: 'desc' },
      });
      expect(log).not.toBeNull();
      expect(log!.score).toBe(-4); // 4 -> 0 = -4 차이
      expect(log!.reason).toContain('관리자 수동 조정');
    });
  });

  // ─── 사용자 목록 ───
  describe('GET /api/admin/users', () => {
    test('사용자 목록 조회', async () => {
      const adminCookies = await loginAs(app, 'admin@test.com');

      const res = await request(app)
        .get('/api/admin/users')
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(5);
      expect(res.body.data.total).toBeGreaterThanOrEqual(5);
    });
  });
});
