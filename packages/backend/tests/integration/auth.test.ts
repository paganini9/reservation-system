/**
 * Auth Integration Tests
 * 시나리오 3: 이메일 인증 링크 만료
 * 시나리오 4 일부: 로그인/회원가입 기본 테스트
 */
import request from 'supertest';
import { createApp } from '../../src/app';
import { resetAndSeedDatabase, testPrisma } from '../setup';
import { loginAs } from '../helpers/auth.helper';
import { USER_ID } from '../fixtures/users.fixture';

// 이메일 발송 모킹
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
  // DATABASE_URL을 테스트 DB로 설정 (서비스의 PrismaClient가 사용)
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://user:password@localhost:5433/reservation_test_db';
});

beforeEach(async () => {
  await resetAndSeedDatabase();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe('Auth Integration', () => {
  // ─── 회원가입 ───
  describe('POST /api/auth/register', () => {
    test('회원가입 성공 후 이메일 인증 토큰 생성', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: '테스트유저',
          email: 'newuser@test.com',
          password: 'Test1234!',
          role: 'GENERAL',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('newuser@test.com');
      expect(res.body.data.message).toContain('인증 이메일');

      // DB에 토큰이 생성되었는지 확인
      const token = await testPrisma.emailVerificationToken.findFirst({
        where: { user: { email: 'newuser@test.com' } },
      });
      expect(token).not.toBeNull();
      expect(token!.used_at).toBeNull();
      expect(token!.invalidated_at).toBeNull();
    });

    test('중복 이메일 회원가입 거부(409)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: '중복',
          email: 'student@test.com', // 이미 존재
          password: 'Test1234!',
          role: 'GENERAL',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_EXISTS');
    });

    test('학생 회원가입 시 필수 필드 누락(400)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: '학생',
          email: 'newstudent@test.com',
          password: 'Test1234!',
          role: 'STUDENT',
          // university, studentId, studentType 누락
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ─── 이메일 인증 ───
  describe('POST /api/auth/verify-email', () => {
    test('유효한 토큰으로 이메일 인증 성공', async () => {
      // 1. 회원가입
      await request(app)
        .post('/api/auth/register')
        .send({
          name: '인증테스트',
          email: 'verify@test.com',
          password: 'Test1234!',
          role: 'GENERAL',
        });

      // 2. 생성된 토큰 조회
      const tokenRecord = await testPrisma.emailVerificationToken.findFirst({
        where: { user: { email: 'verify@test.com' } },
      });
      expect(tokenRecord).not.toBeNull();

      // 3. 인증 요청
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: tokenRecord!.token });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // 4. DB에서 email_verified 확인
      const user = await testPrisma.user.findFirst({
        where: { email: 'verify@test.com' },
      });
      expect(user!.email_verified).toBe(true);
    });

    test('만료된 토큰으로 인증 실패(400)', async () => {
      // 1. 회원가입
      await request(app)
        .post('/api/auth/register')
        .send({
          name: '만료테스트',
          email: 'expired@test.com',
          password: 'Test1234!',
          role: 'GENERAL',
        });

      // 2. 토큰 만료 시간을 과거로 설정
      const tokenRecord = await testPrisma.emailVerificationToken.findFirst({
        where: { user: { email: 'expired@test.com' } },
      });
      await testPrisma.emailVerificationToken.update({
        where: { id: tokenRecord!.id },
        data: { expires_at: new Date('2020-01-01') },
      });

      // 3. 인증 요청
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: tokenRecord!.token });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('만료');
    });
  });

  // ─── 인증 토큰 재발송 ───
  describe('POST /api/auth/resend-verification', () => {
    test('재발송 시 기존 토큰 무효화', async () => {
      // 1. 회원가입
      await request(app)
        .post('/api/auth/register')
        .send({
          name: '재발송',
          email: 'resend@test.com',
          password: 'Test1234!',
          role: 'GENERAL',
        });

      const firstToken = await testPrisma.emailVerificationToken.findFirst({
        where: { user: { email: 'resend@test.com' } },
      });

      // 2. 재발송 요청
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'resend@test.com' });

      expect(res.status).toBe(200);

      // 3. 기존 토큰 무효화 확인
      const oldToken = await testPrisma.emailVerificationToken.findUnique({
        where: { id: firstToken!.id },
      });
      expect(oldToken!.invalidated_at).not.toBeNull();

      // 4. 새 토큰 생성 확인
      const tokens = await testPrisma.emailVerificationToken.findMany({
        where: {
          user: { email: 'resend@test.com' },
          invalidated_at: null,
          used_at: null,
        },
      });
      expect(tokens.length).toBe(1);
      expect(tokens[0].id).not.toBe(firstToken!.id);
    });
  });

  // ─── 로그인 ───
  describe('POST /api/auth/login', () => {
    test('이메일 인증 완료된 사용자 로그인 성공', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'student@test.com', password: 'Test1234!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(USER_ID.STUDENT);
      expect(res.body.data.role).toBe('STUDENT');

      // 쿠키에 access_token, refresh_token 설정 확인
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain('access_token');
      expect(cookieStr).toContain('refresh_token');
    });

    test('이메일 미인증 시 로그인 거부(403)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unverified@test.com', password: 'Test1234!' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    test('잘못된 비밀번호(401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'student@test.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // ─── 임시 비밀번호 ───
  describe('POST /api/auth/forgot-password', () => {
    test('임시 비밀번호 발급 후 isTempPassword=true', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'student@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('임시 비밀번호');

      // DB에서 is_temp_password 확인
      const user = await testPrisma.user.findUnique({
        where: { id: USER_ID.STUDENT },
      });
      expect(user!.is_temp_password).toBe(true);
    });
  });

  // ─── 인증 필요 라우트 보호 ───
  describe('GET /api/auth/me', () => {
    test('로그인 쿠키 없이 접근 시 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    test('로그인 후 내 정보 조회 성공', async () => {
      const cookies = await loginAs(app, 'student@test.com');

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.userId).toBe(USER_ID.STUDENT);
      expect(res.body.data.email).toBe('student@test.com');
    });
  });
});
