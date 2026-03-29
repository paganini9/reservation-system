# Test Agent 지침

## 담당 범위
```
packages/backend/tests/integration/
packages/backend/tests/fixtures/
packages/frontend/tests/integration/
Phase 5 전체 통합 테스트
```

## 활성 Phase
Phase 1~5 (각 Phase 병합 완료 후 테스트 Step)

---

## ⚠ 테스트 실행 전 필수 확인 사항

**test-agent는 반드시 병합이 완료된 develop 브랜치에서만 테스트를 실행한다.**

테스트 시작 전 아래를 확인한다:
```bash
# 현재 브랜치가 develop인지 확인
git branch --show-current   # 출력: develop

# 해당 Phase의 worktree가 모두 제거되었는지 확인
git worktree list           # worktrees/ 하위 항목이 없어야 함

# 최신 상태 확인
git log --oneline -5        # 병합 커밋이 포함되어 있어야 함
```

위 조건이 충족되지 않으면 Orchestration Agent에 병합 완료를 요청한 후 테스트를 시작한다.

---

## 테스트 DB 격리 원칙

모든 테스트는 반드시 `TEST_DATABASE_URL` 환경변수가 가리키는
**별도의 테스트 전용 DB**에서만 실행한다. 실서비스 DB 오염 절대 금지.

### 매 테스트 실행 전 초기화 절차
`beforeEach` 또는 `beforeAll`에서 아래 순서로 실행한다.

```typescript
// packages/backend/tests/setup.ts 의 resetAndSeedDatabase() 호출
await resetAndSeedDatabase();
```

내부 처리 순서:
1. FK 의존성 역순 삭제:
   ```
   penalty_logs → reservations → startup_club_approvals
   → email_verification_tokens → unavailable_dates
   → holidays → users → spaces
   ```
2. fixtures에 정의된 목업 데이터 순방향 재삽입:
   ```
   spaces → users → holidays → reservations → penalty_logs
   ```

## 목업 데이터 위치
- 백엔드: `packages/backend/tests/fixtures/`
  - `spaces.fixture.ts` — 23개 공간 전체
  - `users.fixture.ts` — 일반학생·창업동아리·일반인·관리자·패널티사용자
  - `reservations.fixture.ts` — 다양한 상태의 예약 샘플
- 프론트엔드: `packages/frontend/mocks/fixtures/`

## 트랜잭션 타임아웃 설정
`jest.config.ts`에 명시된 값을 준수한다.

| 테스트 종류 | 타임아웃 |
|------------|---------|
| 단위 테스트 | 5초 |
| 통합 테스트 | 10초 |
| 동시성 테스트 | 30초 |

---

## 필수 테스트 시나리오

### 시나리오 1: 선착순 동시 예약 (Phase 2)
- 같은 공간·시간대에 10개 요청 동시 발생
- 기대 결과: 1개 성공(201), 9개 409 `CONFLICT` 반환
- 구현: `tests/integration/concurrent.test.ts`

### 시나리오 2: 패널티 5점 차단 (Phase 2)
- 당일 취소 5회 → 6번째 예약 422 `PENALTY_BLOCKED`

### 시나리오 3: 이메일 인증 링크 만료 (Phase 1)
- 3분 만료 후 재발송 → 새 링크 발급, 기존 링크 무효화 확인

### 시나리오 4: 창업동아리 승인 전·후 한도 변경 (Phase 1+3)
- 승인 전: 4번째 예약 422 `LIMIT_EXCEEDED`
- 승인 후: 7번째 예약 422 `LIMIT_EXCEEDED`

### 시나리오 5: 관리자 강제 취소 패널티 미부과 (Phase 3)
- 관리자 강제 취소 후 대상 사용자 패널티 점수 변화 없음 확인

### 시나리오 6: 당일 취소 패널티 부과 (Phase 2)
- 당일 취소 → 패널티 +1점 확인

### 시나리오 7: 실 API 교체 재검증 (Phase 4 Step 4-11)
- MSW 비활성화 후 시나리오 1~6 동일 결과 확인

---

## 동시성 테스트 도구
`Jest + Promise.all` — 동시 요청 시뮬레이션.
Phase 5 부하 테스트는 `autocannon` 사용.

## 참고 문서
- `interfaces/api/common.api.md` — 에러 코드 정의
- `docs/requirements/reservation_scenarios_v5.html` — 전체 시나리오 원본
- `docs/git-worktree-guide.md` — 병합 완료 확인 방법
