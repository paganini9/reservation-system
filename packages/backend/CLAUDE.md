# Backend — 패키지 지침

> Orchestration Agent가 서브 에이전트를 이 패키지에서 작업시킬 때 참고하는 파일

## 패키지 개요
Express.js REST API + WebSocket 서버 (port 4000)

## 주요 의존성
- `express` — HTTP 서버
- `prisma` — PostgreSQL ORM
- `ioredis` — Redis 클라이언트
- `jsonwebtoken` — JWT 발급·검증
- `nodemailer` — 이메일 발송
- `node-cron` — 스케줄러 (패널티 리셋)
- `socket.io` — WebSocket

## 디렉터리 구조 규칙
| 디렉터리 | 역할 |
|----------|------|
| `routes/` | 경로 정의만. 로직 없음. |
| `controllers/` | 요청 파싱, 응답 반환. 비즈니스 로직 없음. |
| `services/` | 비즈니스 로직 전담. DB 직접 접근. |
| `middleware/` | 인증·권한·에러 처리 미들웨어. |
| `jobs/` | cron 스케줄러. |
| `utils/` | JWT, 쿠키 등 순수 유틸리티. |

## 에러 처리
모든 에러는 `middleware/error-handler.ts`에서 일괄 처리.
`common.api.md`의 에러 코드 형식을 반환한다.

## 환경변수 키 목록
```
DATABASE_URL
TEST_DATABASE_URL
REDIS_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
PUBLIC_HOLIDAY_API_KEY
```

## 참고 문서
- `../../interfaces/api/` — API 계약
- `../../interfaces/db/schema-overview.md` — 스키마
- `../../agents/` — 각 담당 에이전트 지침
