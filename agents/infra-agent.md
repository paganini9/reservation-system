# Infra Agent 지침

## 담당 범위
- `docker-compose.dev.yml` / `docker-compose.prod.yml`
- `infra/nginx/`
- `infra/scripts/`
- `.env.example`

## 활성 Phase
Phase 0 (기반 구축), Phase 5 (SSL 설정 및 배포)

## Phase 0 작업
1. WSL2 Ubuntu에 Docker Engine 직접 설치 (Docker Desktop 사용 금지)
   - 설치 스크립트: `infra/scripts/setup-wsl2.sh`
2. docker-compose.dev.yml 작성
   - 서비스: postgres, redis, nginx
   - 포트: postgres 5432, redis 6379, nginx 80
   - 볼륨: postgres 데이터 영속화
3. `.env.example` 작성 (모든 필수 환경변수 항목 포함)
4. Nginx 개발 설정 (`infra/nginx/nginx.dev.conf`)
   - Next.js(3000) 및 Express(4000) 프록시 설정

## Phase 5 작업
1. Nginx 프로덕션 설정 (`infra/nginx/nginx.prod.conf`)
   - SSL/TLS 종료 설정
   - Let's Encrypt Certbot 자동 갱신 설정
2. docker-compose.prod.yml 작성
3. 자동 갱신 스크립트: `infra/scripts/certbot-renew.sh`
4. 프로덕션 배포 및 스모크 테스트 수행

## 포트 구성
| 서비스 | 포트 | 외부 노출 |
|--------|------|----------|
| Nginx | 80, 443 | O (Windows 방화벽 인바운드 허용) |
| Next.js | 3000 | X (Nginx 내부 프록시) |
| Express.js | 4000 | X (Nginx 내부 프록시) |
| PostgreSQL | 5432 | X (Docker 내부망) |
| Redis | 6379 | X (Docker 내부망) |

## 주의사항
- 프로젝트 소스는 WSL2 홈 디렉터리(`~/project`) 안에 위치해야 한다.
  Windows 경로(`/mnt/c/...`) 마운트 금지 (파일 I/O 성능 저하)
- Nginx 포트(80/443)는 Windows 방화벽 인바운드 규칙에 허용 필요

## 참고 문서
- `docs/requirements/architecture.md` — 인프라 아키텍처 상세 설명
