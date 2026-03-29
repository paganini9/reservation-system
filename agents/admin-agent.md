# Admin Agent 지침

## 작업 공간 (git worktree)
- **worktree 경로**: `../worktrees/admin-agent/`
- **브랜치**: `feature/phase3-admin`
- **생성 명령** (Orchestration Agent 실행):
  ```bash
  git worktree add ../worktrees/admin-agent -b feature/phase3-admin develop
  ```

⚠ 이 에이전트는 반드시 `../worktrees/admin-agent/` 디렉터리에서만 파일을 수정한다.
다른 에이전트의 worktree 디렉터리는 절대 접근하지 않는다.


## 담당 범위
```
packages/backend/src/routes/admin.routes.ts
packages/backend/src/controllers/admin.controller.ts
packages/backend/src/services/admin.service.ts
```

## 활성 Phase
Phase 3 (Step 3-1 ~ 3-7)
선행 조건: Phase 2 완료

## 관리자 권한 처리
- `authorize.ts` 미들웨어에서 `user.role === 'ADMIN'` 검증
- 기본 관리자 계정: `paganini9@gmail.com` (seed.ts에서 초기 생성)

## 관리자 전용 허용 사항
일반 사용자와 달리 관리자는 아래 제약을 우회한다.

| 제약 | 관리자 적용 여부 |
|------|----------------|
| 예약 기간 제한 (D+30, D+14) | 제한 없음 |
| 공휴일·주말·운영불가일 예약 불가 | 예약 가능 |
| 예약 건수 한도 | 한도 초과 허용 (강제 수정 시) |
| 취소 시 패널티 부과 | 부과하지 않음 |

## 강제 수정·취소 처리 규칙
- 강제 수정: 기존 예약자의 건수가 한도를 초과해도 허용. 단 동일 시간대·공간 중복은 불가.
- 강제 취소: 패널티 미부과. 취소 사유를 예약자에게 이메일 발송.
- 수정·취소 사유 입력 필수 (`reason` 필드).

## 운영 불가일 등록 시 주의사항
- 해당 날짜에 이미 예약된 건이 있을 경우 경고 응답 포함 (강제 취소는 하지 않음)
- 경고 응답 예시:
  ```json
  {
    "success": true,
    "data": { "unavailableDateId": "..." },
    "warning": "해당 날짜에 기존 예약 3건이 있습니다. 예약자에게 별도 안내가 필요합니다."
  }
  ```

## API 계약
→ `interfaces/api/admin.api.md` 반드시 준수

## 테스트
- `packages/backend/tests/unit/admin.service.test.ts`
- 테스트 DB 격리 및 목업 데이터 사용 (test-agent 지침 참고)

## 참고 문서
- `interfaces/api/admin.api.md` — 관리자 API 계약
- `docs/requirements/scenarios_v5.md` — SC-A1 ~ SC-A10 시나리오
