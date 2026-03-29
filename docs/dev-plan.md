# 창업공간 예약시스템 — 전체 개발 계획

> 대구대학교 비호관 3층 창업공간 예약시스템
> 개발 방식: Claude Code Multi-Agent (Orchestration + Sub-agents)
> 격리 전략: git worktree (에이전트별 독립 작업 디렉터리)

---

## 개발 원칙

1. 각 Phase는 순서대로 진행한다. 이전 Phase 완료 전 다음 Phase 시작 불가.
2. Phase 0은 Orchestration Agent가 직접 수행하고 검수 후 freeze 선언한다.
3. 상세 스펙은 `agents/*.md`에 넣지 않고 `interfaces/`와 `docs/`에 분리한다.
4. 스키마 변경 시 db-agent는 즉시 Orchestration Agent에 보고한다.
5. 각 에이전트는 **자신의 worktree 디렉터리에서만** 작업한다.
6. **테스트 시작 전 반드시 해당 Phase의 모든 worktree를 develop에 병합한다.**
7. 각 Phase 완료 시 develop 브랜치를 GitHub에 push한다.
8. 모든 Phase 완료 보고서는 한글로 작성한다.

---

## GitHub 브랜치 전략

```
main                              ← 항상 배포 가능한 상태
├── develop                       ← 통합 브랜치 (테스트·검수 기준)
│   ├── feature/phase1-email      ← email-agent worktree 브랜치
│   ├── feature/phase1-auth       ← auth-agent worktree 브랜치
│   ├── feature/phase2-reservation← reservation-agent worktree 브랜치
│   ├── feature/phase3-admin      ← admin-agent worktree 브랜치
│   └── feature/phase4-frontend   ← frontend-agent worktree 브랜치
└── release/v1.0.0                ← 프로덕션 배포 태그
```

### worktree 디렉터리 구조

```
~/project/
├── reservation-system/           ← develop (Orchestration Agent)
└── worktrees/
    ├── email-agent/              ← feature/phase1-email
    ├── auth-agent/               ← feature/phase1-auth
    ├── reservation-agent/        ← feature/phase2-reservation
    ├── admin-agent/              ← feature/phase3-admin
    └── frontend-agent/           ← feature/phase4-frontend
```

> 상세 worktree 운영 방법 → `docs/git-worktree-guide.md` 참고

---

## Phase 0 — 프로젝트 기반 구축

**목표**: 이후 모든 에이전트가 작업할 수 있는 공통 기반 확립
**담당**: Orchestration Agent (직접 수행, worktree 불필요)
**⚠ Phase 0 전체는 Orchestration Agent가 직접 수행하고 검수 후 freeze한다. Phase 1은 freeze 확인 후에만 시작한다.**

| Step | 작업 내용 | 담당 |
|------|-----------|------|
| 0-1 | 모노레포 초기화 (pnpm workspace, tsconfig 공유 설정) | Orchestration |
| 0-2 | WSL2 Docker Engine 설치 및 docker-compose 구성 | Orchestration |
| 0-3 | Prisma 스키마 설계 및 초기 마이그레이션 (전체 테이블 확정) | Orchestration |
| 0-4 | `packages/shared` 타입 패키지 설정 (타입, 공통 상수) | Orchestration |
| 0-5 | 환경변수 템플릿 작성 (`.env.example`) | Orchestration |
| 0-6 | GitHub 저장소 초기화 및 develop 브랜치 생성, 초기 커밋 push | Orchestration |
| **0-7** | **검수 및 Phase 0 freeze 선언 → 한글 보고서 작성** | Orchestration |

### Phase 0 freeze 체크리스트
- [ ] 모노레포 workspace 정상 작동 확인
- [ ] Docker Compose 전체 서비스 기동 확인
- [ ] Prisma 스키마 마이그레이션 성공 확인
- [ ] `packages/shared` 빌드 성공 확인
- [ ] `.env.example` 모든 필수 항목 포함 확인
- [ ] GitHub 저장소 및 develop 브랜치 확인
- [ ] 위 항목 전체 통과 시 freeze 선언

---

## Phase 1 — 인증 및 계정 관리

**목표**: 사용자 식별과 세션 관리의 완전한 구현
**선행 조건**: Phase 0 freeze 완료

### worktree 준비 (Orchestration Agent)
```bash
# Phase 1 시작 시 worktree 생성
git worktree add ../worktrees/email-agent -b feature/phase1-email develop
git worktree add ../worktrees/auth-agent  -b feature/phase1-auth  develop
```

### 병렬 작업 가능 여부
- Step 1-1(email-agent) 완료 전까지 auth-agent 작업 시작 불가
- Step 1-1 완료 후 email-agent worktree는 **읽기 전용** 유지 (auth-agent가 EmailService import만 함)

| Step | 작업 내용 | 담당 에이전트 | worktree |
|------|-----------|--------------|---------|
| 1-1 | EmailService 클래스 구현 및 인터페이스 공개 **(선행 필수)** | email-agent | `../worktrees/email-agent` |
| 1-2 | 회원가입 API (학생/일반인, 이메일 중복 검사) | auth-agent | `../worktrees/auth-agent` |
| 1-3 | 이메일 인증 (3분 링크, Redis TTL, Mailtrap 연동) | auth-agent | `../worktrees/auth-agent` |
| 1-4 | 로그인 / JWT 발급 (HttpOnly Secure Cookie + rotation) | auth-agent | `../worktrees/auth-agent` |
| 1-5 | 임시 비밀번호 재설정 | auth-agent | `../worktrees/auth-agent` |
| 1-6 | 인증 미들웨어 (access token 검증, refresh 자동 갱신) | auth-agent | `../worktrees/auth-agent` |
| 1-7 | 내 정보 조회 / 비밀번호 변경 API | auth-agent | `../worktrees/auth-agent` |
| **1-8** | **⚠ worktree 병합** → develop에 email → auth 순서로 merge | Orchestration | `reservation-system/` |
| 1-9 | 인증 단위 테스트 (병합된 develop, 격리 테스트 DB) | test-agent | `reservation-system/` |
| 1-10 | GitHub push (develop) | Orchestration | |
| **1-11** | **Orchestration Agent 검수 → 한글 보고서 작성** | Orchestration | |

### Phase 1 worktree 병합 절차 (Step 1-8)
```bash
cd ~/project/reservation-system   # develop 브랜치
git merge --no-ff feature/phase1-email -m "merge: email-agent Phase 1"
git merge --no-ff feature/phase1-auth  -m "merge: auth-agent Phase 1"
git worktree remove ../worktrees/email-agent
git worktree remove ../worktrees/auth-agent
```

---

## Phase 2 — 예약 핵심 기능

**목표**: 선착순 예약 생성·수정·취소와 패널티 시스템 구현
**선행 조건**: Phase 1 완료

### worktree 준비
```bash
git worktree add ../worktrees/reservation-agent -b feature/phase2-reservation develop
```

| Step | 작업 내용 | 담당 에이전트 | worktree |
|------|-----------|--------------|---------|
| 2-1 | 공간 목록 및 시간대 조회 API | reservation-agent | `../worktrees/reservation-agent` |
| 2-2 | 공공데이터 공휴일 API 연동 | reservation-agent | `../worktrees/reservation-agent` |
| 2-3 | 예약 가능일 달력 조회 API | reservation-agent | `../worktrees/reservation-agent` |
| 2-4 | 예약 생성 API (`SELECT FOR UPDATE SKIP LOCKED` + 1/100초) | reservation-agent | `../worktrees/reservation-agent` |
| 2-5 | 예약 수정 API (원자적 교체) | reservation-agent | `../worktrees/reservation-agent` |
| 2-6 | 예약 취소 API + 패널티 부과 로직 | reservation-agent | `../worktrees/reservation-agent` |
| 2-7 | 패널티 1개월 자동 리셋 cron | reservation-agent | `../worktrees/reservation-agent` |
| 2-8 | 예약 건수 한도 검증 미들웨어 | reservation-agent | `../worktrees/reservation-agent` |
| **2-9** | **⚠ worktree 병합** → develop에 reservation-agent merge | Orchestration | `reservation-system/` |
| 2-10 | 예약 단위 테스트 + 선착순 동시성 테스트 (병합된 develop) | test-agent | `reservation-system/` |
| 2-11 | GitHub push (develop) | Orchestration | |
| **2-12** | **Orchestration Agent 검수 → 한글 보고서 작성** | Orchestration | |

### Phase 2 worktree 병합 절차 (Step 2-9)
```bash
cd ~/project/reservation-system
git merge --no-ff feature/phase2-reservation -m "merge: reservation-agent Phase 2"
git worktree remove ../worktrees/reservation-agent
```

---

## Phase 3 — 관리자 기능

**목표**: 관리자 전용 기능 및 운영 도구 구현
**선행 조건**: Phase 2 완료

### worktree 준비
```bash
git worktree add ../worktrees/admin-agent -b feature/phase3-admin develop
```

| Step | 작업 내용 | 담당 에이전트 | worktree |
|------|-----------|--------------|---------|
| 3-1 | 관리자 권한 미들웨어 및 권한 부여 API | admin-agent | `../worktrees/admin-agent` |
| 3-2 | 전체 예약 현황 조회 API | admin-agent | `../worktrees/admin-agent` |
| 3-3 | 예약 강제 수정·취소 API | admin-agent | `../worktrees/admin-agent` |
| 3-4 | 창업동아리 학생 승인·반려 API | admin-agent | `../worktrees/admin-agent` |
| 3-5 | 운영 불가일 등록·수정·삭제 API | admin-agent | `../worktrees/admin-agent` |
| 3-6 | 예약 현황 PDF 출력 | admin-agent | `../worktrees/admin-agent` |
| 3-7 | 패널티 조회·수동 조정 API | admin-agent | `../worktrees/admin-agent` |
| **3-8** | **⚠ worktree 병합** → develop에 admin-agent merge | Orchestration | `reservation-system/` |
| 3-9 | 관리자 기능 단위 테스트 (병합된 develop) | test-agent | `reservation-system/` |
| 3-10 | GitHub push (develop) | Orchestration | |
| **3-11** | **Orchestration Agent 검수 → 한글 보고서 작성** | Orchestration | |

### Phase 3 worktree 병합 절차 (Step 3-8)
```bash
cd ~/project/reservation-system
git merge --no-ff feature/phase3-admin -m "merge: admin-agent Phase 3"
git worktree remove ../worktrees/admin-agent
```

---

## Phase 4 — 프론트엔드

**목표**: 사용자·관리자 화면 구현. 목업 데이터로 선개발 후 실 API 교체
**선행 조건**: Phase 0 freeze 완료 (worktree 생성은 Phase 1 시작과 동시에 가능)

### worktree 준비
```bash
# Phase 1 시작과 동시에 생성 가능 (백엔드와 병렬 진행)
git worktree add ../worktrees/frontend-agent -b feature/phase4-frontend develop
```

### 병렬 진행 전략
- Step 4-1 ~ 4-8: MSW 목업 기반으로 백엔드와 **완전 병렬** 진행 가능
- Step 4-9(실 API 교체): Phase 3 병합 완료 후에만 수행 가능
  - 이 시점에 frontend worktree에서 develop의 최신 백엔드 코드를 merge-base로 rebase 또는 merge 수행

| Step | 작업 내용 | 담당 에이전트 | worktree |
|------|-----------|--------------|---------|
| 4-1 | 공통 레이아웃, API 클라이언트 래퍼 + MSW 목업 설정 | frontend-agent | `../worktrees/frontend-agent` |
| 4-2 | 회원가입 / 로그인 / 비밀번호 재설정 화면 (목업) | frontend-agent | `../worktrees/frontend-agent` |
| 4-3 | 예약 달력 컴포넌트 (목업 데이터) | frontend-agent | `../worktrees/frontend-agent` |
| 4-4 | 공간 선택 및 예약 확정 화면 (목업) | frontend-agent | `../worktrees/frontend-agent` |
| 4-5 | 내 예약 목록·상세·수정·취소 화면 (목업) | frontend-agent | `../worktrees/frontend-agent` |
| 4-6 | 관리자 대시보드 및 예약 관리 화면 (목업) | frontend-agent | `../worktrees/frontend-agent` |
| 4-7 | 운영 불가일 관리 화면 (목업) | frontend-agent | `../worktrees/frontend-agent` |
| 4-8 | 프론트엔드 컴포넌트 단위 테스트 (목업 기반) | test-agent | `../worktrees/frontend-agent` |
| **4-9** | **Phase 3 병합 완료 후**: frontend worktree에 develop 최신 반영 → MSW → 실 API 교체 | frontend-agent | `../worktrees/frontend-agent` |
| **4-10** | **⚠ worktree 병합** → develop에 frontend-agent merge | Orchestration | `reservation-system/` |
| 4-11 | 실 API 교체 후 동일 시나리오 재검증 (병합된 develop) | test-agent | `reservation-system/` |
| 4-12 | GitHub push (develop) | Orchestration | |
| **4-13** | **Orchestration Agent 검수 → 한글 보고서 작성** | Orchestration | |

### Phase 4 worktree 병합 절차 (Step 4-10)
```bash
cd ~/project/reservation-system
# 먼저 frontend worktree에 develop 최신 반영 (Step 4-9에서 수행)
cd ../worktrees/frontend-agent
git merge develop -m "chore: develop 최신 코드 반영 (실 API 교체 전)"

# 병합 후 메인 디렉터리에서 최종 merge
cd ~/project/reservation-system
git merge --no-ff feature/phase4-frontend -m "merge: frontend-agent Phase 4"
git worktree remove ../worktrees/frontend-agent
```

---

## Phase 5 — 통합 테스트 및 배포

**목표**: 전체 시스템 검증 및 프로덕션 배포
**선행 조건**: Phase 4 완료, 모든 worktree 병합 완료
**worktree 없음**: develop 브랜치에서 직접 진행

| Step | 작업 내용 | 담당 에이전트 |
|------|-----------|--------------|
| 5-1 | FE·BE 통합 테스트 (주요 시나리오 전 흐름, 격리 DB) | test-agent |
| 5-2 | 선착순 동시 예약 부하 테스트 | test-agent |
| 5-3 | Nginx SSL 설정 (Let's Encrypt Certbot) | infra-agent |
| 5-4 | 프로덕션 환경변수 설정 (Gmail SMTP 전환) | infra-agent |
| 5-5 | GitHub push (develop → main merge, `release/v1.0.0` 태그) | Orchestration |
| 5-6 | 최종 배포 및 스모크 테스트 | infra-agent |
| **5-7** | **Orchestration Agent 최종 검수 → 한글 최종 보고서 작성** | Orchestration |

---

## 에이전트 역할 및 worktree 요약

| 에이전트 | worktree 경로 | 브랜치 | 활성 Phase |
|----------|--------------|--------|-----------|
| Orchestration | `reservation-system/` (develop) | develop | 전체 |
| email-agent | `worktrees/email-agent` | feature/phase1-email | 1 |
| auth-agent | `worktrees/auth-agent` | feature/phase1-auth | 1 |
| reservation-agent | `worktrees/reservation-agent` | feature/phase2-reservation | 2 |
| admin-agent | `worktrees/admin-agent` | feature/phase3-admin | 3 |
| frontend-agent | `worktrees/frontend-agent` | feature/phase4-frontend | 4 |
| test-agent | `reservation-system/` (develop) | develop | 1~5 |
| infra-agent | `reservation-system/` (develop) | develop | 0, 5 |
| db-agent | `reservation-system/` (develop) | develop | 0 |
| shared-agent | `reservation-system/` (develop) | develop | 0 |

> test-agent, infra-agent, db-agent, shared-agent는 worktree 없이
> **병합 완료된 develop 브랜치**에서 작업한다.

---

## 참고 문서 위치

| 문서 | 경로 |
|------|------|
| **Git Worktree 운영 가이드** | `docs/git-worktree-guide.md` |
| 사용자 시나리오 | `docs/requirements/reservation_scenarios_v5.html` |
| 아키텍처 설명 | `docs/requirements/architecture.md` |
| Architecture Decision Records | `docs/decisions/adr.md` |
| 공통 API 계약 | `interfaces/api/common.api.md` |
| 인증 API 계약 | `interfaces/api/auth.api.md` |
| 예약 API 계약 | `interfaces/api/reservation.api.md` |
| 관리자 API 계약 | `interfaces/api/admin.api.md` |
| DB 스키마 개요 | `interfaces/db/schema-overview.md` |
