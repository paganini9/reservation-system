import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { RESERVATION_LIMIT } from '@reservation/shared';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { emailService } from './email.service';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const SALT_ROUNDS = 12;
const VERIFICATION_TOKEN_EXPIRES_MINUTES = 3;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7일

// ---------- helpers ----------

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getReservationLimit(
  role: string,
  studentType: string | null,
  startupClubApproved: boolean,
): number {
  if (role === 'STUDENT' && studentType === 'STARTUP_CLUB' && startupClubApproved) {
    return RESERVATION_LIMIT.STARTUP_CLUB_APPROVED;
  }
  if (role === 'STUDENT') {
    return RESERVATION_LIMIT.NORMAL_STUDENT;
  }
  return RESERVATION_LIMIT.GENERAL;
}

// ---------- service ----------

export class AuthService {
  // ---- register ----
  async register(body: {
    name: string;
    email: string;
    password: string;
    role: 'STUDENT' | 'GENERAL';
    university?: string;
    studentId?: string;
    studentType?: 'NORMAL' | 'STARTUP_CLUB';
    clubName?: string;
  }) {
    // 중복 이메일 확인
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      const err: any = new Error('이미 등록된 이메일입니다.');
      err.statusCode = 409;
      err.code = 'ALREADY_EXISTS';
      throw err;
    }

    // validation
    if (body.role === 'STUDENT') {
      if (!body.university || !body.studentId || !body.studentType) {
        const err: any = new Error('학생 회원은 university, studentId, studentType이 필수입니다.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      if (body.studentType === 'STARTUP_CLUB' && !body.clubName) {
        const err: any = new Error('창업동아리 학생은 clubName이 필수입니다.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
    }

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: body.name,
          email: body.email,
          password_hash: passwordHash,
          role: body.role,
          university: body.role === 'STUDENT' ? body.university : undefined,
          student_id: body.role === 'STUDENT' ? body.studentId : undefined,
          student_type: body.role === 'STUDENT' ? body.studentType : undefined,
          club_name: body.studentType === 'STARTUP_CLUB' ? body.clubName : undefined,
        },
      });

      // 창업동아리 학생은 StartupClubApproval 레코드 생성
      if (body.role === 'STUDENT' && body.studentType === 'STARTUP_CLUB') {
        await tx.startupClubApproval.create({
          data: {
            user_id: newUser.id,
            status: 'PENDING',
          },
        });
      }

      // 인증 토큰 생성
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRES_MINUTES * 60 * 1000);

      await tx.emailVerificationToken.create({
        data: {
          user_id: newUser.id,
          token,
          expires_at: expiresAt,
        },
      });

      // 이메일 발송 (트랜잭션 밖에서 해도 되지만, 토큰은 트랜잭션 내에서 생성)
      await emailService.sendVerificationEmail(newUser.email, token);

      return newUser;
    });

    return {
      userId: user.id,
      email: user.email,
      message: '인증 이메일이 발송되었습니다.',
    };
  }

  // ---- verify email ----
  async verifyEmail(token: string) {
    if (!token) {
      const err: any = new Error('토큰이 필요합니다.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!record) {
      const err: any = new Error('유효하지 않은 인증 토큰입니다.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (record.used_at || record.invalidated_at) {
      const err: any = new Error('이미 사용되었거나 무효화된 토큰입니다.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (record.expires_at < new Date()) {
      const err: any = new Error('만료된 인증 토큰입니다.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { used_at: new Date() },
      }),
      prisma.user.update({
        where: { id: record.user_id },
        data: { email_verified: true },
      }),
    ]);

    return { message: '이메일 인증이 완료되었습니다.' };
  }

  // ---- resend verification ----
  async resendVerification(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    // 보안: 존재하지 않는 이메일이어도 같은 응답
    if (!user) {
      return { message: '인증 이메일이 재발송되었습니다.' };
    }

    // 기존 미사용 토큰 모두 무효화
    await prisma.emailVerificationToken.updateMany({
      where: {
        user_id: user.id,
        used_at: null,
        invalidated_at: null,
      },
      data: { invalidated_at: new Date() },
    });

    // 새 토큰 생성
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRES_MINUTES * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: {
        user_id: user.id,
        token,
        expires_at: expiresAt,
      },
    });

    await emailService.sendVerificationEmail(user.email, token);

    return { message: '인증 이메일이 재발송되었습니다.' };
  }

  // ---- login ----
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const err: any = new Error('이메일 또는 비밀번호가 일치하지 않습니다.');
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const err: any = new Error('이메일 또는 비밀번호가 일치하지 않습니다.');
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    if (!user.email_verified) {
      const err: any = new Error('이메일 인증이 완료되지 않았습니다.');
      err.statusCode = 403;
      err.code = 'EMAIL_NOT_VERIFIED';
      throw err;
    }

    // JWT 발급
    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id });

    // Redis에 refresh token 저장
    await redis.set(`refresh:${user.id}`, refreshToken, 'EX', REFRESH_TOKEN_TTL_SECONDS);

    const loginData = {
      userId: user.id,
      name: user.name,
      role: user.role,
      studentType: user.student_type,
      startupClubApproved: user.startup_club_approved,
      isTempPassword: user.is_temp_password,
      penaltyScore: user.penalty_score,
      isSuspended: user.is_suspended,
    };

    return { accessToken, refreshToken, loginData };
  }

  // ---- logout ----
  async logout(userId: string) {
    await redis.del(`refresh:${userId}`);
    return { message: '로그아웃 되었습니다.' };
  }

  // ---- refresh ----
  async refresh(refreshTokenValue: string) {
    let payload: any;
    try {
      payload = verifyRefreshToken(refreshTokenValue);
    } catch {
      const err: any = new Error('유효하지 않은 리프레시 토큰입니다.');
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    const userId = payload.userId;

    // Redis에서 현재 저장된 토큰 확인
    const stored = await redis.get(`refresh:${userId}`);
    if (!stored || stored !== refreshTokenValue) {
      const err: any = new Error('유효하지 않은 리프레시 토큰입니다.');
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    // 사용자 정보 조회 (role 필요)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const err: any = new Error('사용자를 찾을 수 없습니다.');
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    // Rotation: 기존 삭제 -> 새로 발급
    const newAccessToken = signAccessToken({ userId: user.id, role: user.role });
    const newRefreshToken = signRefreshToken({ userId: user.id });

    await redis.set(`refresh:${user.id}`, newRefreshToken, 'EX', REFRESH_TOKEN_TTL_SECONDS);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      message: '토큰이 갱신되었습니다.',
    };
  }

  // ---- forgot password ----
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    // 보안: 존재하지 않는 이메일이어도 같은 응답
    if (!user) {
      return { message: '임시 비밀번호가 이메일로 발송되었습니다.' };
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        is_temp_password: true,
      },
    });

    await emailService.sendTempPasswordEmail(user.email, tempPassword);

    return { message: '임시 비밀번호가 이메일로 발송되었습니다.' };
  }

  // ---- me ----
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      const err: any = new Error('사용자를 찾을 수 없습니다.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      university: user.university,
      studentId: user.student_id,
      studentType: user.student_type,
      startupClubApproved: user.startup_club_approved,
      penaltyScore: user.penalty_score,
      isSuspended: user.is_suspended,
      suspendedUntil: user.suspended_until,
      reservationLimit: getReservationLimit(user.role, user.student_type, user.startup_club_approved),
    };
  }

  // ---- change password ----
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      const err: any = new Error('사용자를 찾을 수 없습니다.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      const err: any = new Error('현재 비밀번호가 일치하지 않습니다.');
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password_hash: newHash,
        is_temp_password: false,
      },
    });

    return { message: '비밀번호가 변경되었습니다.' };
  }
}

export const authService = new AuthService();
