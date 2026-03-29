import { PrismaClient, Prisma } from '@prisma/client';
import {
  TIME_SLOTS,
  PENALTY,
  RESERVATION_LIMIT,
  BOOKING_RANGE_DAYS,
  TimeSlot,
  ReservationSummary,
} from '@reservation/shared';
import { penaltyService } from './penalty.service';
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

class ReservationService {
  /**
   * 시간대별 예약 현황 조회
   */
  async getSlots(date: string, spaceId: string): Promise<TimeSlot[]> {
    const reservations = await prisma.reservation.findMany({
      where: {
        space_id: spaceId,
        date: new Date(date),
        status: 'CONFIRMED',
        deleted_at: null,
      },
      select: { start_time: true, end_time: true },
    });

    const bookedStarts = new Set(
      reservations.map((r) => dateToTime(r.start_time)),
    );

    return TIME_SLOTS.map((slot) => ({
      startTime: slot.start,
      endTime: slot.end,
      status: bookedStarts.has(slot.start) ? ('BOOKED' as const) : ('AVAILABLE' as const),
    }));
  }

  /**
   * 예약 생성 (선착순)
   */
  async createReservation(
    userId: string,
    spaceId: string,
    date: string,
    startTime: string,
    endTime: string,
  ) {
    const requestedAt = new Date();

    return prisma.$transaction(async (tx) => {
      // SELECT FOR UPDATE SKIP LOCKED — 동시 예약 방어
      const existing: any[] = await tx.$queryRaw`
        SELECT id FROM reservations
        WHERE space_id = ${spaceId}::uuid
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

      // reservation_number 생성: R + YYYYMMDD + 5자리 순번
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
          user_id: userId,
          space_id: spaceId,
          date: new Date(date),
          start_time: timeToDate(startTime),
          end_time: timeToDate(endTime),
          status: 'CONFIRMED',
          requested_at: requestedAt,
        },
        include: { space: true },
      });

      // 예약 확인 이메일
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (user) {
        const summary: ReservationSummary = {
          reservationId: reservation.id,
          reservationNumber: reservation.reservation_number,
          spaceName: reservation.space.name,
          date,
          startTime,
          endTime,
        };
        emailService.sendReservationConfirmEmail(user.email, summary).catch(() => {});
      }

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
   * 내 예약 목록 (페이지네이션)
   */
  async getMyReservations(
    userId: string,
    status: string,
    page: number,
    limit: number,
  ) {
    const where: Prisma.ReservationWhereInput = {
      user_id: userId,
      deleted_at: null,
    };

    if (status && status !== 'all') {
      where.status = status as any;
    }

    const [items, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: { space: true },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
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
        createdAt: r.created_at.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * 예약 수정 (원자적 교체: 기존 CANCELLED + 새 CONFIRMED)
   */
  async updateReservation(
    reservationId: string,
    userId: string,
    spaceId: string,
    date: string,
    startTime: string,
    endTime: string,
  ) {
    const requestedAt = new Date();

    return prisma.$transaction(async (tx) => {
      // 기존 예약 조회
      const existing = await tx.reservation.findFirst({
        where: {
          id: reservationId,
          user_id: userId,
          status: 'CONFIRMED',
          deleted_at: null,
        },
        include: { space: true },
      });

      if (!existing) {
        const err: any = new Error('예약을 찾을 수 없습니다.');
        err.statusCode = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      // 당일 수정 → 패널티 (당일 취소로 간주)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const reservationDate = new Date(existing.date);
      reservationDate.setHours(0, 0, 0, 0);
      const isSameDay = reservationDate.getTime() === today.getTime();

      // 기존 예약 취소
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: 'CANCELLED', updated_at: new Date() },
      });

      // 새 시간대 선착순 잠금
      const conflict: any[] = await tx.$queryRaw`
        SELECT id FROM reservations
        WHERE space_id = ${spaceId}::uuid
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
          user_id: userId,
          space_id: spaceId,
          date: new Date(date),
          start_time: timeToDate(startTime),
          end_time: timeToDate(endTime),
          status: 'CONFIRMED',
          requested_at: requestedAt,
        },
        include: { space: true },
      });

      // 당일 수정 시 패널티 부과
      let penaltyApplied = false;
      let penaltyResult = null;
      if (isSameDay) {
        penaltyResult = await penaltyService.applyPenalty(
          userId,
          reservationId,
          PENALTY.SAME_DAY_CANCEL_SCORE,
          '당일 예약 수정 (당일 취소 간주)',
        );
        penaltyApplied = true;
      }

      // 수정 이메일
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (user) {
        const summary: ReservationSummary = {
          reservationId: newReservation.id,
          reservationNumber: newReservation.reservation_number,
          spaceName: newReservation.space.name,
          date,
          startTime,
          endTime,
        };
        emailService.sendReservationModifiedEmail(user.email, summary).catch(() => {});
      }

      return {
        reservationId: newReservation.id,
        reservationNumber: newReservation.reservation_number,
        spaceId: newReservation.space_id,
        spaceName: newReservation.space.name,
        date,
        startTime,
        endTime,
        status: newReservation.status,
        penaltyApplied,
        currentTotalPenalty: penaltyResult?.totalScore ?? null,
        createdAt: newReservation.created_at.toISOString(),
      };
    });
  }

  /**
   * 예약 취소
   */
  async cancelReservation(reservationId: string, userId: string) {
    const reservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        user_id: userId,
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

    // 취소 처리
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: 'CANCELLED', updated_at: new Date() },
    });

    // 당일 취소 판정
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reservationDate = new Date(reservation.date);
    reservationDate.setHours(0, 0, 0, 0);
    const isSameDay = reservationDate.getTime() === today.getTime();

    let penaltyApplied = false;
    let penaltyScore = 0;
    let currentTotalPenalty = reservation.user.penalty_score;

    if (isSameDay) {
      const result = await penaltyService.applyPenalty(
        userId,
        reservationId,
        PENALTY.SAME_DAY_CANCEL_SCORE,
        '당일 예약 취소',
      );
      penaltyApplied = true;
      penaltyScore = PENALTY.SAME_DAY_CANCEL_SCORE;
      currentTotalPenalty = result.totalScore;
    }

    // 취소 이메일
    const summary: ReservationSummary = {
      reservationId: reservation.id,
      reservationNumber: reservation.reservation_number,
      spaceName: reservation.space.name,
      date: reservation.date.toISOString().split('T')[0],
      startTime: dateToTime(reservation.start_time),
      endTime: dateToTime(reservation.end_time),
    };
    emailService
      .sendReservationCancelledEmail(reservation.user.email, summary, currentTotalPenalty)
      .catch(() => {});

    return {
      reservationId: reservation.id,
      status: 'CANCELLED' as const,
      penaltyApplied,
      penaltyScore,
      currentTotalPenalty,
    };
  }
}

export const reservationService = new ReservationService();
