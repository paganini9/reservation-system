# Git Worktree 운영 가이드

> Multi-agent 개발에서 에이전트 간 코드 충돌을 방지하고
> 테스트 전 안전한 통합을 위해 git worktree를 활용한다.

---

## 왜 git worktree를 사용하는가

일반적인 브랜치 전환 방식은 한 번에 하나의 작업 디렉터리만 체크아웃한다.
여러 서브 에이전트가 동시에 같은 저장소에서 작업하면:

- 에이전트 A가 `packages/backend/src/app.ts`를 수정하는 동안
  에이전트 B도 같은 파일을 수정하면 충돌 발생
- 에이전트마다 브랜치를 바꾸면 다른 에이전트의 작업 중인 파일이 사라짐

**git worktree**는 하나의 저장소에서 여러 브랜치를 **각각 다른 디렉터리**에
동시에 체크아웃할 수 있게 한다. 에이전트마다 독립된 파일 시스템을 가지므로
서로 간섭하지 않는다.

---

## 디렉터리 구조

```
~/project/
├── reservation-system/          ← main 브랜치 (Orchestration Agent 작업 공간)
└── worktrees/
    ├── email-agent/             ← feature/phase1-email 브랜치
    ├── auth-agent/              ← feature/phase1-auth 브랜치
    ├── reservation-agent/       ← feature/phase2-reservation 브랜치
    ├── admin-agent/             ← feature/phase3-admin 브랜치
    └── frontend-agent/          ← feature/phase4-frontend 브랜치
```

---

## Orchestration Agent의 worktree 생명주기 관리

### 1. 에이전트 작업 시작 전 — worktree 생성

```bash
# develop 브랜치에서 새 브랜치를 만들면서 worktree 생성
git worktree add ../worktrees/auth-agent -b feature/phase1-auth develop

# 에이전트에게 작업 디렉터리 지정
# auth-agent는 ../worktrees/auth-agent 에서만 작업한다
```

### 2. 에이전트 작업 중 — 격리 유지

- 각 에이전트는 **자신의 worktree 디렉터리에서만** 파일을 수정한다.
- 다른 에이전트의 worktree 디렉터리는 절대 건드리지 않는다.
- 커밋은 자신의 브랜치에만 한다.

```bash
# auth-agent가 자신의 worktree에서 커밋하는 예시
cd ../worktrees/auth-agent
git add .
git commit -m "feat(auth): 회원가입 API 구현"
```

### 3. 테스트 전 — worktree 병합 (⚠ 필수)

**모든 에이전트 작업이 완료된 후, test-agent가 테스트를 시작하기 전에
Orchestration Agent가 아래 절차로 병합을 수행한다.**

```bash
# 메인 작업 디렉터리로 이동
cd ~/project/reservation-system

# develop 브랜치로 전환
git checkout develop

# 의존성 순서에 따라 순차 병합
# Phase 1 예시: email → auth 순서
git merge --no-ff feature/phase1-email -m "merge: email-agent Phase 1"
git merge --no-ff feature/phase1-auth  -m "merge: auth-agent Phase 1"

# 충돌 발생 시 Orchestration Agent가 직접 해결 후 커밋
# git add . && git commit -m "fix: Phase 1 병합 충돌 해결"

# 병합 완료 후 worktree 제거
git worktree remove ../worktrees/email-agent
git worktree remove ../worktrees/auth-agent

# 병합된 브랜치 삭제 (선택)
git branch -d feature/phase1-email
git branch -d feature/phase1-auth
```

### 4. 테스트 — 병합된 develop에서 실행

test-agent는 **병합 완료된 develop 브랜치의 메인 작업 디렉터리**에서 테스트를 실행한다.
개별 worktree에서 테스트를 실행하지 않는다.

### 5. Phase 완료 — GitHub push

```bash
git push origin develop
# 필요시 PR → main
```

---

## Phase별 worktree 운영 계획

### Phase 0
Orchestration Agent가 직접 수행. worktree 불필요.

### Phase 1
| 에이전트 | worktree 경로 | 브랜치 | 생성 시점 |
|----------|--------------|--------|----------|
| email-agent | `../worktrees/email-agent` | `feature/phase1-email` | Phase 1 시작 |
| auth-agent | `../worktrees/auth-agent` | `feature/phase1-auth` | Step 1-1 완료 후 |

**병합 순서**: email-agent → auth-agent (auth가 EmailService에 의존)
**병합 시점**: Step 1-7 완료 후, Step 1-8(테스트) 시작 전

### Phase 2
| 에이전트 | worktree 경로 | 브랜치 | 생성 시점 |
|----------|--------------|--------|----------|
| reservation-agent | `../worktrees/reservation-agent` | `feature/phase2-reservation` | Phase 2 시작 |

**병합 시점**: Step 2-8 완료 후, Step 2-9(테스트) 시작 전

### Phase 3
| 에이전트 | worktree 경로 | 브랜치 | 생성 시점 |
|----------|--------------|--------|----------|
| admin-agent | `../worktrees/admin-agent` | `feature/phase3-admin` | Phase 3 시작 |

**병합 시점**: Step 3-7 완료 후, Step 3-8(테스트) 시작 전

### Phase 4
| 에이전트 | worktree 경로 | 브랜치 | 생성 시점 |
|----------|--------------|--------|----------|
| frontend-agent | `../worktrees/frontend-agent` | `feature/phase4-frontend` | Phase 4 시작 |

**특이사항**: frontend-agent는 Phase 1~3 백엔드 개발과 **병렬로** 진행 가능.
단, Step 4-9(실 API 교체)는 Phase 3 병합 완료 후 수행.
**병합 시점**: Step 4-9 완료 후, Step 4-10(테스트) 시작 전

### Phase 5
worktree 없음. develop 브랜치에서 통합 테스트 및 배포 진행.

---

## 충돌이 자주 발생하는 파일과 예방책

| 파일 | 충돌 원인 | 예방책 |
|------|-----------|--------|
| `packages/backend/src/app.ts` | 여러 에이전트가 라우터 등록 | 에이전트별 섹션 주석으로 구분. 병합 시 Orchestration이 통합 |
| `packages/backend/src/server.ts` | cron 등록 등 | reservation-agent만 수정하도록 명시 |
| `packages/shared/src/index.ts` | 타입 export 추가 | shared-agent가 Phase 0에서 완성. 이후 수정 시 Orchestration 승인 필수 |
| `package.json` (각 패키지) | 의존성 추가 | 에이전트별 담당 package.json이 다르므로 충돌 적음. 동일 파일 수정 시 Orchestration 조율 |

---

## 현재 worktree 상태 확인

```bash
git worktree list
```

출력 예시:
```
/home/user/project/reservation-system        abc1234 [develop]
/home/user/project/worktrees/auth-agent      def5678 [feature/phase1-auth]
/home/user/project/worktrees/frontend-agent  ghi9012 [feature/phase4-frontend]
```

---

## 비상 시 worktree 강제 제거

```bash
# worktree 디렉터리가 이미 삭제된 경우
git worktree prune

# 강제 제거
git worktree remove --force ../worktrees/auth-agent
```
