## 시스템 인프라 아키텍처 — 텍스트 설명 (업데이트)

---

### 전체 구조 개요

대구대학교 비호관 3층 창업공간 예약시스템은 5개 레이어로 구성됩니다. 모든 서버 컴포넌트는 Windows Server(고정 IP, 도메인 보유) 위에서 WSL2 환경으로 실행됩니다.

---

### 레이어별 구성

**1. Client layer**
사용자의 웹 브라우저가 진입점입니다. HTTPS로 서버에 접속합니다.

**2. Gateway — Nginx (port 80 / 443)**
모든 요청의 단일 진입점입니다. 역할은 세 가지입니다. SSL/TLS 종료(HTTPS 복호화), 요청 경로에 따라 프론트엔드와 백엔드로 분기, WebSocket 프록시 처리. Let's Encrypt Certbot으로 SSL 인증서를 자동 갱신합니다.

**3. App layer**
Nginx 하위에 두 서비스가 나란히 실행됩니다.

- **Next.js frontend (port 3000)** — React 기반 App Router 구조. 달력 UI, 예약 폼, 관리자 대시보드 등 모든 화면을 담당합니다. SSR(서버사이드 렌더링)로 초기 로딩 속도를 확보합니다.
- **Express.js API (port 4000)** — REST API와 WebSocket 서버를 함께 제공합니다. 예약 생성·수정·취소, 인증, 패널티 계산 등 모든 비즈니스 로직이 여기서 처리됩니다.

**4. Data layer**
백엔드 하위에 두 데이터 저장소가 연결됩니다.

- **PostgreSQL (port 5432)** — 메인 데이터베이스. Prisma ORM으로 접근합니다. 예약 데이터, 사용자 정보, 패널티 이력이 저장됩니다. 선착순 처리는 `SELECT FOR UPDATE SKIP LOCKED` + 서버 수신 타임스탬프(1/100초) 비교를 PostgreSQL 트랜잭션 안에서 처리합니다. 동시 폭증 상황은 고려하지 않으므로 별도의 Redis 분산 락 없이 PostgreSQL 단독으로 충분합니다.
- **Redis** — 세션 저장소 전용으로 사용합니다. JWT refresh token을 저장하며, 강제 로그아웃(토큰 무효화) 구현에 활용됩니다.

**5. External (컨테이너 외부)**
백엔드에서 점선 화살표로 연결되는 외부 서비스 두 가지입니다.

- **공공데이터 포털 공휴일 API** — 매년 1월 1일 자동 갱신. 대체 공휴일 포함. API 장애 시 관리자가 수동으로 보완 입력합니다.
- **SMTP 이메일 서버** — Nodemailer 라이브러리로 연동. 개발·테스트 환경은 Mailtrap(실제 발송 없이 수신함 확인), 프로덕션 환경은 Gmail SMTP를 사용합니다. 환경변수(`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`)로 분리해 환경별 전환이 가능합니다.

---

### 인증 방식

HttpOnly Secure Cookie + JWT refresh token rotation 방식을 사용합니다.

- **Access token** — 짧은 만료 시간(예: 15분). 메모리 또는 httpOnly 쿠키로 전달합니다.
- **Refresh token** — 긴 만료 시간(예: 7일). HttpOnly Secure Cookie로만 전달해 XSS 공격으로부터 보호합니다. Redis에 저장하며, 토큰이 갱신될 때마다 새 토큰으로 교체(rotation)됩니다.
- **강제 로그아웃** — Redis에서 해당 refresh token을 삭제하면 즉시 무효화됩니다.
- **Next.js SSR 호환** — 쿠키 기반이므로 서버 컴포넌트에서도 자연스럽게 인증 상태를 읽을 수 있습니다.

---

### 개발 환경 구성

Docker Desktop(WSL2 backend) 방식 대신 **WSL2(Ubuntu)에 Docker Engine을 직접 설치**하는 방식을 사용합니다. 이 방식이 파일 I/O 성능이 더 우수하고 Docker Desktop 라이선스 이슈에서 자유롭습니다. 프로젝트 소스는 WSL2 홈 디렉터리(`~/project`) 안에 두어 Windows 경로(`/mnt/c/...`) 마운트로 인한 성능 저하를 방지합니다. Nginx 포트(80/443)는 Windows 방화벽 인바운드 규칙에 허용하고, 나머지 서비스는 Docker 내부 네트워크로 격리합니다.

---

### 데이터 흐름 요약

```
브라우저
  → Nginx (SSL 종료, 라우팅)
      → Next.js (페이지 요청)
      → Express.js (API 요청)
            → PostgreSQL (예약/사용자 CRUD, 선착순 트랜잭션)
            → Redis (refresh token 저장 및 무효화)
            → 공휴일 API (외부 HTTP)
            → SMTP (Mailtrap 개발 / Gmail 프로덕션)
```

---

### 포트 및 환경 요약

| 서비스 | 포트 | 비고 |
|--------|------|------|
| Nginx | 80, 443 | 외부 노출 유일 포트 |
| Next.js | 3000 | Nginx 내부 프록시 |
| Express.js | 4000 | Nginx 내부 프록시 |
| PostgreSQL | 5432 | Docker 내부망 |
| Redis | 6379 | Docker 내부망 |

---

### 환경별 설정 분리

| 항목 | 개발 환경 | 프로덕션 환경 |
|------|-----------|---------------|
| 이메일 | Mailtrap | Gmail SMTP |
| SSL | 로컬 self-signed 또는 미적용 | Let's Encrypt (Certbot 자동 갱신) |
| Docker | WSL2 직접 설치 Docker Engine | 동일 |
| 환경변수 | `.env.development` | `.env.production` |