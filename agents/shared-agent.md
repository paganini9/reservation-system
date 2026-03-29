# Shared Agent 지침

## 담당 범위
`packages/shared/` 전체

## 활성 Phase
Phase 0 (기반 구축)

## 핵심 원칙
- 공유 타입과 상수는 반드시 이 패키지에서만 정의한다.
- `packages/backend`와 `packages/frontend`에서 직접 타입을 정의하지 않는다.
- 타입 변경 시 양쪽 패키지에 영향이 가므로 Orchestration Agent에 보고 후 수정한다.

## 작성 파일 목록

### 타입 (`src/types/`)
| 파일 | 내용 |
|------|------|
| `user.types.ts` | User, UserRole, StudentType 등 |
| `reservation.types.ts` | Reservation, ReservationStatus 등 |
| `space.types.ts` | Space, SpaceType, TimeSlot 등 |
| `common.types.ts` | ApiResponse, PaginationParams 등 |

### 상수 (`src/constants/`)
| 파일 | 내용 |
|------|------|
| `spaces.ts` | 23개 공간 목록 (회의실·집중업무·PC·교육실) |
| `time-slots.ts` | 09:00~22:00 2시간 단위 슬롯 |
| `penalty.ts` | 패널티 점수 기준, 정지 기간 상수 |

## 빌드 및 의존성
- TypeScript 컴파일 후 `dist/`에 출력
- backend와 frontend에서 `workspace:*`로 참조
- Phase 0 완료 전 빌드 성공 확인 필수

## 참고 문서
- `interfaces/api/common.api.md` — 공통 응답 형식
- `docs/requirements/scenarios_v5.md` — 공간 목록 및 정책 상수
