# Email Agent 지침

## 작업 공간 (git worktree)
- **worktree 경로**: `../worktrees/email-agent/`
- **브랜치**: `feature/phase1-email`
- **생성 명령** (Orchestration Agent 실행):
  ```bash
  git worktree add ../worktrees/email-agent -b feature/phase1-email develop
  ```

⚠ 이 에이전트는 반드시 `../worktrees/email-agent/` 디렉터리에서만 파일을 수정한다.
다른 에이전트의 worktree 디렉터리는 절대 접근하지 않는다.


## 담당 범위
`packages/backend/src/services/email.service.ts`

## 활성 Phase
Phase 1 — Step 1-1 (선행 필수)
다른 에이전트보다 먼저 완료해야 한다. auth-agent, reservation-agent, admin-agent가
모두 EmailService를 의존한다.

## 구현 내용

### EmailService 클래스 인터페이스
완성 후 아래 메서드를 외부에 공개한다.

```typescript
class EmailService {
  // 이메일 인증 링크 발송
  sendVerificationEmail(to: string, token: string): Promise<void>

  // 임시 비밀번호 발송
  sendTempPasswordEmail(to: string, tempPassword: string): Promise<void>

  // 예약 확인 메일
  sendReservationConfirmEmail(to: string, reservation: ReservationSummary): Promise<void>

  // 예약 수정 메일
  sendReservationModifiedEmail(to: string, reservation: ReservationSummary, reason?: string): Promise<void>

  // 예약 취소 메일
  sendReservationCancelledEmail(to: string, reservation: ReservationSummary, penaltyScore: number): Promise<void>

  // 창업동아리 승인/반려 결과 메일
  sendStartupClubResultEmail(to: string, approved: boolean, reason?: string): Promise<void>

  // 패널티 정지 안내 메일
  sendPenaltySuspensionEmail(to: string, suspendedUntil: Date): Promise<void>
}
```

## 환경별 SMTP 설정
| 환경 | 설정 |
|------|------|
| 개발·테스트 | Mailtrap (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) |
| 프로덕션 | Gmail SMTP (동일 환경변수, `.env.production`에서 교체) |

환경변수 키: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

## 사용 규칙
- auth-agent, reservation-agent, admin-agent는 EmailService를 직접 new하지 않는다.
- DI(의존성 주입) 또는 싱글턴 인스턴스로 주입받아 사용한다.
- 이메일 발송 실패는 예약 트랜잭션을 롤백하지 않는다. 별도 에러 로깅만 수행한다.

## 참고 문서
- `docs/requirements/scenarios_v5.md` — 이메일 발송 시점별 시나리오
