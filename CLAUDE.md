# 창업공간 예약시스템 — Orchestration Agent

## 프로젝트 개요
대구대학교 비호관 3층 창업공간 예약시스템.
Node.js 모노레포 (pnpm workspaces).

## 기술 스택
- Frontend: Next.js 14 (App Router), TypeScript, MSW (목업)
- Backend: Express.js, TypeScript
- DB: PostgreSQL (Prisma ORM), Redis
- Gateway: Nginx
- 환경: WSL2 Ubuntu + Docker Engine (Docker Desktop 아님)
- 버전 관리: GitHub + git worktree (에이전트 격리)

## 전체 개발 계획
→ `docs/dev-plan.md` 참고

## Git Worktree 운영 원칙

### Orchestration Agent의 worktree 관리 책임
1. **생성**: 각 에이전트 작업 시작 전 worktree를 만들고 경로를 에이전트에 전달한다.
2. **격리**: 각 에이전트는 자신의 worktree 디렉터리에서만 작업한다. 다른 worktree 접근 금지.
3. **병합**: 테스트 시작 전 해당 Phase의 모든 worktree를 develop에 병합한다.
   - 병합은 의존성 순서를 따른다 (email → auth, shared → backend 등)
   - 충돌 발생 시 Orchestration Agent가 직접 해결 후 커밋
4. **제거**: 병합 완료 후 해당 worktree를 즉시 제거한다.
5. **테스트**: test-agent는 반드시 병합 완료된 develop 브랜치에서 실행한다.

### worktree 생성 명령 패턴
```bash
git worktree add ../worktrees/{agent-name} -b feature/{phase}-{name} develop
```

### 병합 전 체크리스트
- [ ] 해당 Phase 모든 에이전트 작업 완료 확인
- [ ] 각 worktree에서 로컬 커밋 완료 확인
- [ ] 병합 순서 결정 (의존성 역방향 없이)
- [ ] 병합 후 빌드 성공 확인
- [ ] worktree 제거

### worktree 상태 확인
```bash
git worktree list
```

> 상세 운영 방법 → `docs/git-worktree-guide.md`

## Phase 0 운영 원칙
- Phase 0는 Orchestration Agent가 직접 수행한다. worktree 불필요.
- 완료 후 스키마·타입·환경변수 템플릿을 검수하고 freeze를 선언한다.
- freeze 선언 전까지 Phase 1을 시작하지 않는다.
- freeze 선언 후 한글 보고서를 작성한다.

## 공통 작업 원칙
1. 각 Phase는 순서대로 진행한다.
2. 서브 에이전트 호출 시 반드시 `agents/*.md`를 읽혀서 컨텍스트를 제공한다.
3. 에이전트에게 **worktree 경로**를 명시적으로 전달한다.
4. 인터페이스 변경 시 `interfaces/` 폴더의 해당 파일을 먼저 수정하고 에이전트에 전달한다.
5. 공유 타입은 `packages/shared`에서만 정의한다.
6. 에이전트 지침 파일(`agents/*.md`)에는 "무엇을, 어디에, 어떤 규칙으로"만 담는다.
   상세 스펙은 `interfaces/`와 `docs/`에 분리한다.
7. 스키마 변경이 발생하면 db-agent는 즉시 Orchestration Agent에 보고한다.

## 보고 원칙
- 모든 Phase 완료 보고서는 한글로 작성한다.
- 보고서 항목:
  1. 완료된 작업 목록
  2. 테스트 결과 요약
  3. 발생한 이슈 및 해결 방법
  4. worktree 병합 결과 (충돌 여부, 해결 방법)
  5. 다음 Phase 시작 가능 여부

## GitHub 브랜치 전략
- `main`: 항상 배포 가능한 상태
- `develop`: 통합 브랜치 (테스트·검수 기준 브랜치)
- `feature/phase{N}-{name}`: 각 에이전트 worktree 브랜치
- `release/v1.0.0`: 프로덕션 배포 태그

## 에이전트 역할 및 worktree 요약
| 에이전트 | worktree | 활성 Phase |
|----------|----------|-----------|
| infra-agent | 없음 (develop) | 0, 5 |
| db-agent | 없음 (develop) | 0 |
| shared-agent | 없음 (develop) | 0 |
| email-agent | `worktrees/email-agent` | 1 (선행) |
| auth-agent | `worktrees/auth-agent` | 1 |
| reservation-agent | `worktrees/reservation-agent` | 2 |
| admin-agent | `worktrees/admin-agent` | 3 |
| frontend-agent | `worktrees/frontend-agent` | 4 |
| test-agent | 없음 (develop) | 1~5 |

## 환경변수 위치
- 개발: `packages/backend/.env.development`
- 프로덕션: `packages/backend/.env.production`
- 템플릿: `.env.example`

## 참고 문서
- `docs/dev-plan.md` — 전체 개발 계획
- `docs/git-worktree-guide.md` — worktree 운영 가이드
- `docs/requirements/` — 원본 요구사항 문서
- `interfaces/` — API 계약 및 인터페이스 표준
