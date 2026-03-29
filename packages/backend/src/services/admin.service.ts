import { PrismaClient, Prisma } from '@prisma/client';
import { RESERVATION_LIMIT, PENALTY, ReservationSummary } from '@reservation/shared';
import { emailService } from './email.service';

const prisma = new PrismaClient();

/**
 * Time 문자열("HH:MM")을 Prisma @db.Time() 호환 Date로 변환
 */
function timeToDate(time: string): Date {
  return new Date(`1970-01-01T${time}:00Z`);
}

/**
 * Date(Time 필드)에서 "HH:MM" 문자열 추출
 */
function dateToTime(d: Date): string {
  return d.toISOString().slice(11, 16);
}

class AdminService {
  // ──────────────────────────────────────────
  // 예약 관리
  // ──────────────────────────────────────────

  /**
   * GET /api/admin/reservations — 전체 예약 현황
   */
  async getReservations(query: {
    date?: string;
    spaceId?: string;
    userId?: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.ReservationWhereInput = { deleted_at: null };

    if (query.date) {
      where.date = new Date(query.date);
    }
    if (query.spaceId) {
      where.space_id = query.spaceId;
    }
    if (query.userId) {
      where.user_id = query.userId;
    }

    const [items, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: { user: true, space: true },
        orderBy: { date: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.reservation.count({ where }),
    ]);

    return {
      items: items.map((r) => ({
        reservationId: r.id,
        reservationNumber: r.reservation_number,
        spaceId: r.space_id,
        spaceName: r.space.name,
        date: r.date.toISOString().split('T')[0],
        startTime: dateToTime(r.start_time),
        endTime: dateToTime(r.end_time),
        status: r.status,
        cancelledByAdmin: r.cancelled_by_admin,
        adminReason: r.admin_reason,
        createdAt: r.created_at.toISOString(),
        user: {
          userId: r.user.id,
          name: r.user.name,
          email: r.user.email,
          role: r.user.role,
          penaltyScore: r.user.penalty_score,
        },
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /**
   * POST /api/admin/reservations — 관리자 직접 예약 생성
   * reservation-guard 미적용. 동일 시간대 중복만 검사.
   */
  async createReservation(adminUserId: string, spaceId: string, date: string, startTime: string, endTime: string) {
    const requestedAt = new Date();

    return prisma.$transaction(async (tx) => {
      // SELECT FOR UPDATE SKIP LOCKED — 동시 예약 방어
      const existing: any[] = await tx.$queryRaw`
        SELECT id FROM reservations
        WHERE space_id = ${spaceId}
          AND date = ${date}::date
          AND start_time = ${startTime}::time
          AND status = 'CONFIRMED'
          AND deleted_at IS NULL
        FOR UPDATE SKIP LOCKED
      `;

      if (existing.length > 0) {
        const err: any = new Error('이미 예약된 시간대입니다.');
        err.statusCode = 409;
        err.code = 'CONFLICT';
        throw err;
      }

      // reservation_number 생성
      const maxSeq: any[] = await tx.$queryRaw`
        SELECT COALESCE(MAX(CAST(RIGHT(reservation_number, 5) AS INTEGER)), 0) + 1 AS next_seq
        FROM reservations
        WHERE date = ${date}::date AND deleted_at IS NULL
      `;
      const seq = Number(maxSeq[0].next_seq);
      const dateStr = date.replace(/-/g, '');
      const reservationNumber = `R${dateStr}${String(seq).padStart(5, '0')}`;

      const reservation = await tx.reservation.create({
        data: {
          reservation_number: reservationNumber,
          user_id: adminUserId,
          space_id: spaceId,
          date: new Date(date),
          start_time: timeToDate(startTime),
          end_time: timeToDate(endTime),
          status: 'CONFIRMED',
          requested_at: requestedAt,
        },
        include: { space: true },
      });

      return {
        reservationId: reservation.id,
        reservationNumber: reservation.reservation_number,
        spaceId: reservation.space_id,
        spaceName: reservation.space.name,
        date,
        startTime,
        endTime,
        status: reservation.status,
        createdAt: reservation.created_at.toISOString(),
      };
    });
  }

  /**
   * PUT /api/admin/reservations/:id — 예약 강제 수정
   * 원자적 교체: 기존 CANCELLED + 새 CONFIRMED, 패널티 미부과
   */
  async updateReservation(
    reservationId: string,
    spaceId: string,
    date: string,
    startTime: string,
    endTime: string,
    reason: string,
  ) {
    const requestedAt = new Date();

    return prisma.$transaction(async (tx) => {
      const existing = await tx.reservation.findFirst({
        where: {
          id: reservationId,
          status: 'CONFIRMED',
          deleted_at: null,
        },
        include: { space: true, user: true },
      });

      if (!existing) {
        const err: any = new Error('예약을 찾을 수 없습니다.');
        err.statusCode = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      // 기존 예약 취소 (관리자 취소)
      await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: 'CANCELLED',
          cancelled_by_admin: true,
          admin_reason: reason,
          updated_at: new Date(),
        },
      });

      // 새 시간대 충돌 검사
      const conflict: any[] = await tx.$queryRaw`
        SELECT id FROM reservations
        WHERE space_id = ${spaceId}
          AND date = ${date}::date
          AND start_time = ${startTime}::time
          AND status = 'CONFIRMED'
          AND deleted_at IS NULL
        FOR UPDATE SKIP LOCKED
      `;

      if (conflict.length > 0) {
        const err: any = new Error('이미 예약된 시간대입니다.');
        err.statusCode = 409;
        err.code = 'CONFLICT';
        throw err;
      }

      // 새 reservation_number 생성
      const maxSeq: any[] = await tx.$queryRaw`
        SELECT COALESCE(MAX(CAST(RIGHT(reservation_number, 5) AS INTEGER)), 0) + 1 AS next_seq
        FROM reservations
        WHERE date = ${date}::date AND deleted_at IS NULL
      `;
      const seq = Number(maxSeq[0].next_seq);
      const dateStr = date.replace(/-/g, '');
      const reservationNumber = `R${dateStr}${String(seq).padStart(5, '0')}`;

      const newReservation = await tx.reservation.create({
        data: {
          reservation_number: reservationNumber,
          user_id: existing.user_id,
          space_id: spaceId,
          date: new Date(date),
          start_time: timeToDate(startTime),
          end_time: timeToDate(endTime),
          status: 'CONFIRMED',
          requested_at: requestedAt,
        },
        include: { space: true },
      });

      // 예약자에게 수정 이메일
      const summary: ReservationSummary = {
        reservationId: newReservation.id,
        reservationNumber: newReservation.reservation_number,
        spaceName: newReservation.space.name,
        date,
        startTime,
        endTime,
      };
      emailService.sendReservationModifiedEmail(existing.user.email, summary, reason).catch(() => {});

      return {
        reservationId: newReservation.id,
        reservationNumber: newReservation.reservation_number,
        spaceName: newReservation.space.name,
        date,
        startTime,
        endTime,
        status: newReservation.status,
        modifiedByAdmin: true,
      };
    });
  }

  /**
   * DELETE /api/admin/reservations/:id — 예약 강제 취소
   * 패널티 미부과, cancelled_by_admin = true
   */
  async cancelReservation(reservationId: string, reason: string) {
    const reservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        status: 'CONFIRMED',
        deleted_at: null,
      },
      include: { space: true, user: true },
    });

    if (!reservation) {
      const err: any = new Error('예약을 찾을 수 없습니다.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'CANCELLED',
        cancelled_by_admin: true,
        admin_reason: reason,
        updated_at: new Date(),
      },
    });

    // 예약자에게 취소 이메일 (패널티 0)
    const summary: ReservationSummary = {
      reservationId: reservation.id,
      reservationNumber: reservation.reservation_number,
      spaceName: reservation.space.name,
      date: reservation.date.toISOString().split('T')[0],
      startTime: dateToTime(reservation.start_time),
      endTime: dateToTime(reservation.end_time),
    };
    emailService.sendReservationCancelledEmail(reservation.user.email, summary, 0).catch(() => {});

    return {
      reservationId: reservation.id,
      status: 'CANCELLED' as const,
      penaltyApplied: false,
      cancelledByAdmin: true,
    };
  }

  // ──────────────────────────────────────────
  // 창업동아리 승인
  // ──────────────────────────────────────────

  /**
   * GET /api/admin/startup-clubs — 승인 대기 목록
   */
  async getStartupClubs() {
    const items = await prisma.startupClubApproval.findMany({
      where: { status: 'PENDING' },
      include: { user: true },
      orderBy: { created_at: 'asc' },
    });

    return {
      items: items.map((a) => ({
        approvalId: a.id,
        userId: a.user_id,
        userName: a.user.name,
        email: a.user.email,
        clubName: a.user.club_name,
        studentId: a.user.student_id,
        university: a.user.university,
        status: a.status,
        createdAt: a.created_at.toISOString(),
      })),
      pendingCount: items.length,
    };
  }

  /**
   * PATCH /api/admin/startup-clubs/:approvalId — 승인/반려
   */
  async processStartupClub(approvalId: string, action: 'APPROVE' | 'REJECT', reason?: string) {
    const approval = await prisma.startupClubApproval.findUnique({
      where: { id: approvalId },
      include: { user: true },
    });

    if (!approval) {
      const err: any = new Error('승인 요청을 찾을 수 없습니다.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (approval.status !== 'PENDING') {
      const err: any = new Error('이미 처리된 승인 요청입니다.');
      err.statusCode = 400;
      err.code = 'ALREADY_PROCESSED';
      throw err;
    }

    if (action === 'REJECT' && !reason) {
      const err: any = new Error('반려 시 사유는 필수입니다.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const now = new Date();

    if (action === 'APPROVE') {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: approval.user_id },
          data: { startup_club_approved: true },
        }),
        prisma.startupClubApproval.update({
          where: { id: approvalId },
          data: { status: 'APPROVED', processed_at: now },
        }),
      ]);
    } else {
      await prisma.startupClubApproval.update({
        where: { id: approvalId },
        data: {
          status: 'REJECTED',
          rejected_reason: reason!,
          processed_at: now,
        },
      });
    }

    const approved = action === 'APPROVE';
    emailService.sendStartupClubResultEmail(approval.user.email, approved, reason).catch(() => {});

    return {
      approvalId,
      action,
      reservationLimit: approved
        ? RESERVATION_LIMIT.STARTUP_CLUB_APPROVED
        : RESERVATION_LIMIT.NORMAL_STUDENT,
    };
  }

  // ──────────────────────────────────────────
  // 운영 불가일
  // ──────────────────────────────────────────

  /**
   * GET /api/admin/unavailable-dates — 연도별 목록
   */
  async getUnavailableDates(year: number) {
    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year}-12-31`);

    const items = await prisma.unavailableDate.findMany({
      where: {
        start_date: { gte: startOfYear },
        end_date: { lte: endOfYear },
      },
      include: { creator: true },
      orderBy: { start_date: 'asc' },
    });

    return items.map((d) => ({
      unavailableDateId: d.id,
      startDate: d.start_date.toISOString().split('T')[0],
      endDate: d.end_date.toISOString().split('T')[0],
      reason: d.reason,
      createdBy: {
        userId: d.creator.id,
        name: d.creator.name,
      },
      createdAt: d.created_at.toISOString(),
      updatedAt: d.updated_at?.toISOString() ?? null,
    }));
  }

  /**
   * POST /api/admin/unavailable-dates — 운영 불가일 등록
   */
  async createUnavailableDate(adminUserId: string, startDate: string, endDate: string, reason: string) {
    // 해당 기간에 CONFIRMED 예약 존재 여부 확인
    const conflictingReservations = await prisma.reservation.count({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        status: 'CONFIRMED',
        deleted_at: null,
      },
    });

    const record = await prisma.unavailableDate.create({
      data: {
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        reason,
        created_by: adminUserId,
      },
    });

    const result: any = {
      unavailableDateId: record.id,
      startDate,
      endDate,
      reason,
    };

    if (conflictingReservations > 0) {
      result.warning = `해당 기간에 ${conflictingReservations}건의 확정 예약이 존재합니다.`;
    }

    return result;
  }

  /**
   * PUT /api/admin/unavailable-dates/:id — 수정
   */
  async updateUnavailableDate(id: string, adminUserId: string, startDate: string, endDate: string, reason: string) {
    const existing = await prisma.unavailableDate.findUnique({ where: { id } });
    if (!existing) {
      const err: any = new Error('운영 불가일을 찾을 수 없습니다.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const updated = await prisma.unavailableDate.update({
      where: { id },
      data: {
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        reason,
        updated_by: adminUserId,
        updated_at: new Date(),
      },
    });

    return {
      unavailableDateId: updated.id,
      startDate,
      endDate,
      reason,
    };
  }

  /**
   * DELETE /api/admin/unavailable-dates/:id — 삭제
   */
  async deleteUnavailableDate(id: string) {
    const existing = await prisma.unavailableDate.findUnique({ where: { id } });
    if (!existing) {
      const err: any = new Error('운영 불가일을 찾을 수 없습니다.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    await prisma.unavailableDate.delete({ where: { id } });

    return { unavailableDateId: id };
  }

  // ──────────────────────────────────────────
  // 사용자 관리
  // ──────────────────────────────────────────

  /**
   * GET /api/admin/users — 사용자 목록
   */
  async getUsers(query: { search?: string; role?: string; page: number; limit: number }) {
    const where: Prisma.UserWhereInput = { deleted_at: null };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.role = query.role as any;
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => ({
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        studentType: u.student_type,
        university: u.university,
        studentId: u.student_id,
        clubName: u.club_name,
        startupClubApproved: u.startup_club_approved,
        emailVerified: u.email_verified,
        penaltyScore: u.penalty_score,
        isSuspended: u.is_suspended,
        suspendedUntil: u.suspended_until?.toISOString() ?? null,
        createdAt: u.created_at.toISOString(),
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /**
   * GET /api/admin/users/:userId/penalty — 패널티 이력
   */
  async getUserPenalty(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const err: any = new Error('사용자를 찾을 수 없습니다.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const logs = await prisma.penaltyLog.findMany({
      where: { user_id: userId },
      include: { reservation: true },
      orderBy: { created_at: 'desc' },
    });

    return {
      userId: user.id,
      name: user.name,
      penaltyScore: user.penalty_score,
      isSuspended: user.is_suspended,
      suspendedUntil: user.suspended_until?.toISOString() ?? null,
      logs: logs.map((l) => ({
        logId: l.id,
        reservationId: l.reservation_id,
        reservationNumber: l.reservation?.reservation_number ?? null,
        score: l.score,
        reason: l.reason,
        createdAt: l.created_at.toISOString(),
      })),
    };
  }

  /**
   * PATCH /api/admin/users/:userId/penalty — 패널티 수동 조정
   */
  async adjustPenalty(userId: string, score: number, reason: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      const err: any = new Error('사용자를 찾을 수 없습니다.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const diff = score - user.penalty_score;

    // 차이를 penalty_logs에 기록
    await prisma.penaltyLog.create({
      data: {
        user_id: userId,
        reservation_id: null,
        score: diff,
        reason: `[관리자 수동 조정] ${reason}`,
      },
    });

    // 정지 처리
    const isSuspended = score >= PENALTY.SUSPENSION_THRESHOLD;
    const now = new Date();
    const suspendedUntil = isSuspended
      ? new Date(now.getTime() + PENALTY.SUSPENSION_DAYS * 24 * 60 * 60 * 1000)
      : null;

    await prisma.user.update({
      where: { id: userId },
      data: {
        penalty_score: score,
        is_suspended: isSuspended,
        suspended_at: isSuspended ? now : null,
        suspended_until: suspendedUntil,
      },
    });

    return {
      userId,
      penaltyScore: score,
      isSuspended,
      suspendedUntil: suspendedUntil?.toISOString() ?? null,
    };
  }

  /**
   * POST /api/admin/users/:userId/grant-admin — 관리자 권한 부여
   */
  async grantAdmin(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      const err: any = new Error('사용자를 찾을 수 없습니다.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' },
    });

    return { userId, role: 'ADMIN' as const };
  }

  // ──────────────────────────────────────────
  // PDF 보고서
  // ──────────────────────────────────────────

  /**
   * GET /api/admin/reports/reservations — 예약 보고서 PDF 생성
   */
  async generateReservationReport(dates: string[]) {
    // 지정 날짜들의 예약 조회
    const reservations = await prisma.reservation.findMany({
      where: {
        date: { in: dates.map((d) => new Date(d)) },
        deleted_at: null,
      },
      include: { user: true, space: true },
      orderBy: [{ date: 'asc' }, { start_time: 'asc' }],
    });

    const reportData = reservations.map((r) => ({
      reservationNumber: r.reservation_number,
      userName: r.user.name,
      email: r.user.email,
      spaceName: r.space.name,
      date: r.date.toISOString().split('T')[0],
      startTime: dateToTime(r.start_time),
      endTime: dateToTime(r.end_time),
      status: r.status,
    }));

    // pdfkit이 있으면 PDF, 없으면 JSON
    try {
      const PDFDocument = require('pdfkit');
      return { type: 'pdf' as const, doc: this.buildPdf(PDFDocument, reportData, dates) };
    } catch {
      return { type: 'json' as const, data: reportData };
    }
  }

  private buildPdf(PDFDocument: any, data: any[], dates: string[]) {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // 한글 지원을 위해 기본 폰트 사용 (Helvetica)
    doc.fontSize(18).text('Reservation Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Dates: ${dates.join(', ')}`, { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toISOString().split('T')[0]}`, { align: 'center' });
    doc.moveDown(1);

    // 테이블 헤더
    const headers = ['No.', 'Reservation#', 'Name', 'Space', 'Date', 'Time', 'Status'];
    const colWidths = [30, 110, 70, 80, 80, 80, 60];
    let y = doc.y;

    doc.fontSize(8).font('Helvetica-Bold');
    let x = 50;
    headers.forEach((h, i) => {
      doc.text(h, x, y, { width: colWidths[i], align: 'left' });
      x += colWidths[i];
    });

    y += 15;
    doc.moveTo(50, y).lineTo(560, y).stroke();
    y += 5;

    // 데이터 행
    doc.font('Helvetica');
    data.forEach((row, idx) => {
      if (y > 750) {
        doc.addPage();
        y = 50;
      }

      x = 50;
      const cols = [
        String(idx + 1),
        row.reservationNumber,
        row.userName,
        row.spaceName,
        row.date,
        `${row.startTime}-${row.endTime}`,
        row.status,
      ];

      cols.forEach((col, i) => {
        doc.text(col, x, y, { width: colWidths[i], align: 'left' });
        x += colWidths[i];
      });
      y += 14;
    });

    if (data.length === 0) {
      doc.text('No reservations found for the specified dates.', 50, y);
    }

    doc.end();
    return doc;
  }
}

export const adminService = new AdminService();
