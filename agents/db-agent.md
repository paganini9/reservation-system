# DB Agent 지침

## 담당 범위
`packages/backend/prisma/` 전체

## 활성 Phase
Phase 0 (Orchestration Agent 지휘 하에 수행)

## 핵심 테이블 목록
| 테이블 | 설명 |
|--------|------|
| users | 학생·일반인·관리자 계정 |
| reservations | 예약 내역 |
| spaces | 예약 가능 공간 23개 |
| unavailable_dates | 관리자 등록 운영 불가일 |
| holidays | 공공데이터 포털 공휴일 |
| penalty_logs | 패널티 부과 이력 |
| startup_club_approvals | 창업동아리 승인 내역 |

## 스키마 설계 제약사항
- `reservations.requested_at` 필드는 `TIMESTAMPTZ(6)` — 1/100초 정밀도 필수
- 삭제는 soft delete 패턴 사용 (`deleted_at TIMESTAMPTZ nullable`)
- 마이그레이션 파일은 절대 수동 편집하지 않는다. `prisma migrate dev`만 사용
- 모든 스키마 변경은 `interfaces/db/schema-overview.md`를 먼저 업데이트한다

## 스키마 변경 보고 규칙 ⚠
스키마를 변경할 때는 다음 절차를 반드시 따른다.

1. **변경 전**: Orchestration Agent에 변경 내용 보고
   - 보고 항목: 변경 테이블명, 변경 내용(추가/수정/삭제), 영향받는 서비스 목록
2. **승인 후**: `prisma migrate dev` 실행
3. **변경 후**: `interfaces/db/schema-overview.md` 최신화 및 Orchestration Agent에 완료 보고

승인 없이 마이그레이션을 실행하지 않는다.

## 참고 문서
- `interfaces/db/schema-overview.md` — 테이블 관계 및 필드 상세
- `docs/requirements/scenarios_v5.md` — 예약 정책 및 비즈니스 규칙
