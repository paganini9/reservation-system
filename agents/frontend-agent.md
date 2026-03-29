# Frontend Agent 지침

## 작업 공간 (git worktree)
- **worktree 경로**: `../worktrees/frontend-agent/`
- **브랜치**: `feature/phase4-frontend`
- **생성 명령** (Orchestration Agent 실행):
  ```bash
  git worktree add ../worktrees/frontend-agent -b feature/phase4-frontend develop
  ```

⚠ 이 에이전트는 반드시 `../worktrees/frontend-agent/` 디렉터리에서만 파일을 수정한다.
다른 에이전트의 worktree 디렉터리는 절대 접근하지 않는다.


## 담당 범위
`packages/frontend/` 전체

## 활성 Phase
Phase 4 (Step 4-1 ~ 4-9)

## 개발 순서 원칙 — 목업 우선, 실 API 후 교체

### Step 4-1 ~ 4-8: 목업 기반 개발
1. MSW(Mock Service Worker)로 모든 API를 목업 처리하여 개발한다.
2. 목업 핸들러: `packages/frontend/mocks/handlers/` 에 작성
3. 목업 데이터: `packages/frontend/mocks/fixtures/` 에 작성
4. 목업 응답 형식은 `interfaces/api/*.api.md`와 동일하게 유지한다.

### Step 4-9: 실 API 교체 (백엔드 Phase 1~3 완료 후)
1. MSW를 비활성화한다 (`browser.ts`에서 조건부 실행 해제)
2. `src/lib/api/` 의 API 클라이언트 함수가 실 백엔드를 바라보도록 확인
3. 목업 기반으로 통과했던 동일 테스트 시나리오를 실 API 대상으로 재실행
4. 결과 차이가 있으면 Orchestration Agent에 보고

## API 호출 규칙
- 모든 API 호출은 `packages/frontend/src/lib/api/` 함수를 통해서만 한다.
- `fetch` 직접 호출 금지. API 클라이언트 래퍼 사용.
- 공유 타입은 `packages/shared`에서 import한다.
- API 응답 형식 → `interfaces/api/common.api.md` 참고

## 인증 상태 관리
- 쿠키 기반이므로 별도 토큰 저장 불필요
- `src/middleware.ts`에서 인증 체크 후 미인증 시 `/login` 리다이렉트
- 관리자 전용 경로(`/admin/*`) 접근 시 role 검증 후 리다이렉트

## 달력 날짜 유형 색상
| 유형 | 색상 | 선택 가능 여부 |
|------|------|--------------|
| 예약 가능 | `#1D9E75` (초록) | O |
| 예약 완료 | `#E24B4A` (빨강) | X |
| 공휴일·주말·운영불가 | `#888780` (회색) | X |
| 관리자 등록 운영불가 | `#EF9F27` 테두리 (주황) | X (관리자만 O) |

## 화면 구성
| 경로 | 설명 |
|------|------|
| `/login` | 로그인 |
| `/register` | 회원가입 |
| `/forgot-password` | 비밀번호 재설정 |
| `/reservations` | 예약 달력 + 내 예약 목록 |
| `/profile` | 내 정보 + 패널티 현황 |
| `/admin/dashboard` | 관리자 대시보드 |
| `/admin/reservations` | 전체 예약 현황 |
| `/admin/users` | 사용자·패널티·창업동아리 관리 |
| `/admin/schedule` | 운영 불가일 관리 |

## 테스트
- 목업 기간: MSW 목업 데이터 기반 컴포넌트 테스트
- 실 API 교체 후: 동일 시나리오를 실 API로 재검증
- `tests/components/` — 컴포넌트 단위 테스트
- `tests/integration/` — 주요 사용자 시나리오 흐름 테스트

## 참고 문서
- `interfaces/api/*.api.md` — 전체 API 계약
- `docs/requirements/scenarios_v5.md` — 사용자별 시나리오
