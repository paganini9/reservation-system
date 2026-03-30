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

  /**
   * 이메일 인증 링크 발송
   */
  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verifyUrl = `${process.env.VERIFY_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/verify-email?token=${token}`;

    await this.send(to, '창업공간 예약시스템 — 이메일 인증', `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">이메일 인증 안내</h2>
        <p>안녕하세요, 창업공간 예약시스템에 가입해 주셔서 감사합니다.</p>
        <p>아래 버튼을 클릭하여 이메일 인증을 완료해 주세요.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}"
             style="background-color: #2563eb; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            이메일 인증하기
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">버튼이 작동하지 않을 경우, 아래 링크를 브라우저에 직접 입력해 주세요.</p>
        <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${verifyUrl}</p>
      </div>
    `);
  }

  /**
   * 임시 비밀번호 발송
   */
  async sendTempPasswordEmail(to: string, tempPassword: string): Promise<void> {
    await this.send(to, '창업공간 예약시스템 — 임시 비밀번호 안내', `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">임시 비밀번호 안내</h2>
        <p>요청하신 임시 비밀번호가 발급되었습니다.</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #1f2937;">${tempPassword}</span>
        </div>
        <p>로그인 후 반드시 비밀번호를 변경해 주세요.</p>
        <p style="color: #ef4444; font-size: 14px;">⚠ 본인이 요청하지 않은 경우, 이 메일을 무시해 주세요.</p>
      </div>
    `);
  }

  /**
   * 예약 확인 메일
   */
  async sendReservationConfirmEmail(to: string, reservation: ReservationSummary): Promise<void> {
    await this.send(to, '창업공간 예약시스템 — 예약 확인', `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">예약이 확인되었습니다</h2>
        <p>아래 내용으로 예약이 완료되었습니다.</p>
        ${this.reservationDetailHtml(reservation)}
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">예약 시간을 꼭 지켜 주세요. 미사용 시 패널티가 부과될 수 있습니다.</p>
      </div>
    `);
  }

  /**
   * 예약 수정 메일
   */
  async sendReservationModifiedEmail(to: string, reservation: ReservationSummary, reason?: string): Promise<void> {
    await this.send(to, '창업공간 예약시스템 — 예약 변경 안내', `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f59e0b;">예약이 변경되었습니다</h2>
        <p>예약 내용이 아래와 같이 변경되었습니다.</p>
        ${this.reservationDetailHtml(reservation)}
        ${reason ? `<p style="margin-top: 16px;"><strong>변경 사유:</strong> ${reason}</p>` : ''}
      </div>
    `);
  }

  /**
   * 예약 취소 메일
   */
  async sendReservationCancelledEmail(to: string, reservation: ReservationSummary, penaltyScore: number): Promise<void> {
    await this.send(to, '창업공간 예약시스템 — 예약 취소 안내', `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ef4444;">예약이 취소되었습니다</h2>
        <p>아래 예약이 취소 처리되었습니다.</p>
        ${this.reservationDetailHtml(reservation)}
        <div style="background-color: #fef2f2; padding: 12px 16px; border-radius: 8px; margin-top: 20px;">
          <p style="color: #991b1b; margin: 0;">
            <strong>현재 패널티 점수:</strong> ${penaltyScore}점
          </p>
        </div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 16px;">
          패널티 점수가 기준치를 초과하면 일정 기간 예약이 제한될 수 있습니다.
        </p>
      </div>
    `);
  }

  /**
   * 창업동아리 승인/반려 결과 메일
   */
  async sendStartupClubResultEmail(to: string, approved: boolean, reason?: string): Promise<void> {
    const statusText = approved ? '승인' : '반려';
    const statusColor = approved ? '#10b981' : '#ef4444';

    await this.send(to, `창업공간 예약시스템 — 창업동아리 ${statusText} 안내`, `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: ${statusColor};">창업동아리 신청이 ${statusText}되었습니다</h2>
        ${approved
          ? '<p>축하합니다! 창업동아리 전용 공간을 이용하실 수 있습니다.</p>'
          : '<p>안타깝게도 이번 신청은 반려되었습니다.</p>'
        }
        ${reason ? `<p><strong>사유:</strong> ${reason}</p>` : ''}
        ${!approved ? '<p style="color: #6b7280; font-size: 14px;">자세한 내용은 관리자에게 문의해 주세요.</p>' : ''}
      </div>
    `);
  }

  /**
   * 패널티 정지 안내 메일
   */
  async sendPenaltySuspensionEmail(to: string, suspendedUntil: Date): Promise<void> {
    const formattedDate = `${suspendedUntil.getFullYear()}년 ${suspendedUntil.getMonth() + 1}월 ${suspendedUntil.getDate()}일`;

    await this.send(to, '창업공간 예약시스템 — 이용 정지 안내', `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ef4444;">예약 이용이 정지되었습니다</h2>
        <p>패널티 점수 누적으로 인해 예약 이용이 일시 정지되었습니다.</p>
        <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #991b1b; margin: 0; font-size: 18px; font-weight: bold;">
            정지 해제일: ${formattedDate}
          </p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          정지 기간 동안 새로운 예약을 할 수 없습니다. 문의 사항은 관리자에게 연락해 주세요.
        </p>
      </div>
    `);
  }

  /**
   * 예약 상세 정보 HTML 조각
   */
  private reservationDetailHtml(reservation: ReservationSummary): string {
    return `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 12px; color: #6b7280; width: 120px;">예약번호</td>
          <td style="padding: 8px 12px; font-weight: bold;">${reservation.reservationNumber}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 12px; color: #6b7280;">공간</td>
          <td style="padding: 8px 12px;">${reservation.spaceName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 12px; color: #6b7280;">날짜</td>
          <td style="padding: 8px 12px;">${reservation.date}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; color: #6b7280;">시간</td>
          <td style="padding: 8px 12px;">${reservation.startTime} ~ ${reservation.endTime}</td>
        </tr>
      </table>
    `;
  }

  /**
   * 관리자 커스텀 이메일 발송
   */
  async sendCustomEmail(to: string, subject: string, body: string): Promise<void> {
    await this.send(to, `창업공간 예약시스템 — ${subject}`, `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">${subject}</h2>
        <div style="white-space: pre-wrap; line-height: 1.6;">${body}</div>
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #6b7280; font-size: 12px;">본 메일은 대구대학교 창업공간 예약시스템에서 발송되었습니다.</p>
      </div>
    `);
  }

  /**
   * 공통 발송 메서드 — 실패 시 예외를 throw하지 않고 로깅만 수행
   */
  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error(`[EmailService] 이메일 발송 실패 (to: ${to}, subject: ${subject})`, error);
    }
  }
}

export const emailService = new EmailService();
