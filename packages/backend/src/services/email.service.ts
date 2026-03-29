import nodemailer, { Transporter } from 'nodemailer';
import { ReservationSummary } from '@reservation/shared';

class EmailService {
  private transporter: Transporter;
  private from: string;

  constructor() {
    this.from = process.env.SMTP_FROM || 'noreply@reservation.dgu.ac.kr';
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verifyUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/verify-email?token=${token}`;
    await this.send(to, '창업공간 예약시스템 — 이메일 인증', `<p><a href="${verifyUrl}">이메일 인증하기</a></p>`);
  }

  async sendTempPasswordEmail(to: string, tempPassword: string): Promise<void> {
    await this.send(to, '창업공간 예약시스템 — 임시 비밀번호', `<p>임시 비밀번호: <strong>${tempPassword}</strong></p>`);
  }

  async sendReservationConfirmEmail(to: string, reservation: ReservationSummary): Promise<void> {
    await this.send(to, '예약 확인', `<p>${reservation.reservationNumber}</p>`);
  }

  async sendReservationModifiedEmail(to: string, reservation: ReservationSummary, reason?: string): Promise<void> {
    await this.send(to, '예약 수정', `<p>${reservation.reservationNumber} ${reason || ''}</p>`);
  }

  async sendReservationCancelledEmail(to: string, reservation: ReservationSummary, penaltyScore: number): Promise<void> {
    await this.send(to, '예약 취소', `<p>${reservation.reservationNumber} 패널티: ${penaltyScore}</p>`);
  }

  async sendStartupClubResultEmail(to: string, approved: boolean, reason?: string): Promise<void> {
    await this.send(to, `창업동아리 ${approved ? '승인' : '반려'}`, `<p>${reason || ''}</p>`);
  }

  async sendPenaltySuspensionEmail(to: string, suspendedUntil: Date): Promise<void> {
    await this.send(to, '이용 정지 안내', `<p>정지 해제일: ${suspendedUntil.toISOString()}</p>`);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (error) {
      console.error(`[EmailService] 발송 실패 (to: ${to}, subject: ${subject})`, error);
    }
  }
}

export const emailService = new EmailService();
