# Architecture Decision Records

## ADR-001: WSL2에 Docker Engine 직접 설치
- **날짜**: Phase 0
- **상태**: 확정
- **결정**: Docker Desktop 대신 WSL2 Ubuntu에 Docker Engine을 직접 설치한다.
- **이유**: 파일 I/O 성능 우수, Docker Desktop 라이선스 이슈 없음.

## ADR-002: 선착순 처리 — PostgreSQL 단독
- **날짜**: Phase 0
- **상태**: 확정
- **결정**: Redis 분산 락 없이 PostgreSQL `SELECT FOR UPDATE SKIP LOCKED`로 처리한다.
- **이유**: 동시 폭증 상황을 고려하지 않는 소규모 시스템. 단일 서버에서 PostgreSQL 단독으로 충분.

## ADR-003: JWT 인증 — HttpOnly Cookie + Refresh Token Rotation
- **날짜**: Phase 0
- **상태**: 확정
- **결정**: HttpOnly Secure Cookie + JWT refresh token rotation 방식 사용.
- **이유**: XSS 방어, Next.js SSR 서버 컴포넌트 인증 상태 접근 용이.

## ADR-004: 이메일 — 개발 Mailtrap, 프로덕션 Gmail SMTP
- **날짜**: Phase 0
- **상태**: 확정
- **결정**: 개발·테스트 환경은 Mailtrap, 프로덕션은 Gmail SMTP.
- **이유**: 환경변수로 전환 가능. 소규모 발송량에 Gmail 무료 플랜 충분.

## ADR-005: 프론트엔드 — MSW 목업 선개발 후 실 API 교체
- **날짜**: Phase 0
- **상태**: 확정
- **결정**: Phase 4에서 MSW로 선개발 후 백엔드 완성 시 실 API 교체.
- **이유**: 백엔드 완성을 기다리지 않고 프론트엔드 개발 병렬 진행 가능.
