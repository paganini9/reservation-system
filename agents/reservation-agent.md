# Reservation Agent 지침

## 작업 공간 (git worktree)
- **worktree 경로**: `../worktrees/reservation-agent/`
- **브랜치**: `feature/phase2-reservation`
- **생성 명령** (Orchestration Agent 실행):
  ```bash
  git worktree add ../worktrees/reservation-agent -b feature/phase2-reservation develop
  ```

⚠ 이 에이전트는 반드시 `../worktrees/reservation-agent/` 디렉터리에서만 파일을 수정한다.
다른 에이전트의 worktree 디렉터리는 절대 접근하지 않는다.


## 담당 범위
```
packages/backend/src/routes/reservation.routes.ts
packages/backend/src/routes/space.routes.ts
packages/backend/src/controllers/reservation.controller.ts
packages/backend/src/controllers/space.controller.ts
packages/backend/src/services/reservation.service.ts
packages/backend/src/services/penalty.service.ts
packages/backend/src/services/holiday.service.ts
packages/backend/src/jobs/penalty-reset.cron.ts
packages/backend/src/middleware/ (예약 건수 한도 검증)
```

## 활성 Phase
Phase 2 (Step 2-1 ~ 2-8)
선행 조건: Phase 1 완료

## 선착순 처리 핵심 로직
반드시 아래 순서를 따른다.

1. 예약 요청 수신 즉시 `Date.now()` 기록 → `requested_at` (TIMESTAMPTZ(6))
2. PostgreSQL 트랜잭션 시작
3. `SELECT FOR UPDATE SKIP LOCKED`로 해당 공간·시간대 레코드 잠금
4. `requested_at` 비교로 최선착순 확정
5. 후순위 요청 → 409 Conflict + `"CONFLICT"` 에러 코드 반환
6. 커밋

Redis 분산 락은 사용하지 않는다. PostgreSQL 단독으로 처리한다.

## 패널티 정책
→ `packages/shared/src/constants/penalty.ts` 상수 사용

| 상황 | 처리 |
|------|------|
| 하루 전 이전 취소 | 패널티 없음 |
| 당일 취소 | +1점 |
| 당일 수정 (= 당일 취소로 간주) | +1점 |
| 5점 누적 | 1개월 예약 정지 |
| 1개월 경과 | cron으로 자동 0점 리셋 |
| 관리자 강제 취소 | 패널티 없음 |

## 예약 가능 조건 검증 (미들웨어)
1. 인증된 사용자인지 확인
2. 패널티 정지 상태인지 확인 (5점 이상 + 정지 기간 내)
3. 동시 예약 건수 한도 확인
   - 일반 학생: 3건
   - 창업동아리 학생(승인 완료): 6건
   - 일반인: 3건
4. 예약 가능일 확인 (평일, 공휴일·운영불가일 제외)
5. 예약 가능 기간 확인 (학생: D+30, 일반인: D+14)

## API 계약
→ `interfaces/api/reservation.api.md` 반드시 준수

## 테스트
- `packages/backend/tests/unit/reservation.service.test.ts`
- `packages/backend/tests/unit/penalty.service.test.ts`
- `packages/backend/tests/integration/concurrent.test.ts` ← 동시 10개 요청 시나리오 필수

## 참고 문서
- `interfaces/api/reservation.api.md` — 예약 API 계약
- `interfaces/db/schema-overview.md` — reservations, spaces 테이블
- `docs/requirements/scenarios_v5.md` — SC-S3, SC-G3 시나리오
