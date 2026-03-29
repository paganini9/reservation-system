# Auth Agent 지침

## 작업 공간 (git worktree)
- **worktree 경로**: `../worktrees/auth-agent/`
- **브랜치**: `feature/phase1-auth`
- **생성 명령** (Orchestration Agent 실행):
  ```bash
  git worktree add ../worktrees/auth-agent -b feature/phase1-auth develop
  ```

⚠ 이 에이전트는 반드시 `../worktrees/auth-agent/` 디렉터리에서만 파일을 수정한다.
다른 에이전트의 worktree 디렉터리는 절대 접근하지 않는다.


## 담당 범위
```
packages/backend/src/routes/auth.routes.ts
packages/backend/src/controllers/auth.controller.ts
packages/backend/src/services/auth.service.ts
packages/backend/src/middleware/authenticate.ts
packages/backend/src/middleware/authorize.ts
packages/backend/src/utils/jwt.ts
packages/backend/src/utils/cookie.ts
packages/frontend/src/app/(auth)/
packages/frontend/src/middleware.ts
```

## 활성 Phase
Phase 1 (Step 1-2 ~ 1-7)
선행 조건: email-agent Step 1-1 완료

## 인증 방식
HttpOnly Secure Cookie + JWT refresh token rotation
- **Access token**: 15분 만료, httpOnly cookie로 전달
- **Refresh token**: 7일 만료, httpOnly cookie로 전달, Redis에 저장
- **Rotation**: refresh 요청 시 기존 토큰 Redis에서 삭제 후 신규 발급
- **강제 로그아웃**: Redis에서 refresh token 삭제로 즉시 무효화

## API 계약
→ `interfaces/api/auth.api.md` 반드시 준수

## 이메일 발송 규칙
EmailService 인터페이스를 통해서만 발송한다. Nodemailer 직접 호출 금지.

## 쿠키 설정
```
httpOnly: true
secure: true (프로덕션)
sameSite: 'strict'
path: '/'
```

## 테스트
- `packages/backend/tests/unit/auth.service.test.ts`
- `packages/backend/tests/integration/auth.integration.test.ts`
- 테스트 DB 격리 및 목업 데이터 사용 (test-agent 지침 참고)

## 참고 문서
- `interfaces/api/auth.api.md` — 인증 API 계약
- `interfaces/db/schema-overview.md` — users 테이블 구조
