# DB 스키마 개요

> Prisma ORM 기반 PostgreSQL 스키마
> 변경 시 db-agent는 반드시 Orchestration Agent에 보고 후 수정한다.
> 최종 업데이트: 시나리오 v5 전체 대조 검토 완료 (v1.1)

---

## 테이블 관계도

```
users
  ├── reservations (1:N)
  ├── penalty_logs (1:N)
  ├── startup_club_approvals (1:1)
  └── email_verification_tokens (1:N)

spaces
  └── reservations (1:N)

holidays           (독립 테이블)
unavailable_dates  (created_by, updated_by → users)
```

---

## users

| 필드 | 타입 | 설명 | 관련 시나리오 |
|------|------|------|--------------|
| `id` | `UUID` PK | 사용자 ID | |
| `name` | `VARCHAR(50)` | 이름 | |
| `email` | `VARCHAR(255)` UNIQUE | 이메일 (로그인 ID) | |
| `password_hash` | `VARCHAR(255)` | bcrypt 해시 | |
| `role` | `ENUM('STUDENT','GENERAL','ADMIN')` | 역할 | SC-A2 |
| `student_type` | `ENUM('NORMAL','STARTUP_CLUB')` nullable | 학생 유형 | SC-S1 |
| `university` | `VARCHAR(100)` nullable | 대학명 (학생만) | SC-S1 |
| `student_id` | `VARCHAR(20)` nullable | 학번 (학생만) | SC-S1 |
| `club_name` | `VARCHAR(100)` nullable | 동아리명 (창업동아리만) | SC-S1, SC-S7 |
| `startup_club_approved` | `BOOLEAN` default false | 창업동아리 승인 여부 | SC-S7, SC-A3 |
| `email_verified` | `BOOLEAN` default false | 이메일 인증 여부 | SC-S1, SC-G1 |
| `is_temp_password` | `BOOLEAN` default false | ✅ 임시 비밀번호 상태 여부 | SC-S0, SC-G0 |
| `penalty_score` | `INTEGER` default 0 | 현재 패널티 점수 | SC-S3, SC-A8 |
| `is_suspended` | `BOOLEAN` default false | 예약 정지 여부 | SC-S3, SC-S6 |
| `suspended_at` | `TIMESTAMPTZ` nullable | ✅ 정지 시작일 | SC-A8 |
| `suspended_until` | `TIMESTAMPTZ` nullable | 정지 해제 예정일 | SC-S4, SC-A8 |
| `created_at` | `TIMESTAMPTZ` | 생성일시 | |
| `updated_at` | `TIMESTAMPTZ` | 수정일시 | |
| `deleted_at` | `TIMESTAMPTZ` nullable | soft delete | |

### is_temp_password 처리 규칙 (SC-S0, SC-G0)
- 임시 비밀번호 발급 시 → `true`
- 사용자가 '내 정보'에서 직접 비밀번호 변경 완료 시 → `false`
- 로그인 응답에 `isTempPassword: true` 포함 → 프론트에서 변경 안내 배너 표시

### suspended_at + suspended_until 처리 규칙 (SC-A8)
- penalty_score 5점 도달 시 동시 업데이트:
  `suspended_at = NOW()`, `suspended_until = NOW() + INTERVAL '1 month'`
- SC-A8: "5점 도달 사용자는 예약 정지 **시작일**·종료 예정일 표시"

---

## spaces

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `UUID` PK | 공간 ID |
| `name` | `VARCHAR(50)` | 공간명 (예: 회의실 1) |
| `type` | `ENUM('MEETING_ROOM','FOCUS','PC','EDUCATION')` | 공간 유형 |
| `capacity` | `INTEGER` | 최대 수용 인원 |
| `is_active` | `BOOLEAN` default true | 예약 가능 여부 |

> 23개 공간은 `prisma/seed.ts`에서 초기 삽입. `is_active`로 운영 중 비활성화 처리.

---

## reservations

| 필드 | 타입 | 설명 | 관련 시나리오 |
|------|------|------|--------------|
| `id` | `UUID` PK | 예약 ID | |
| `reservation_number` | `VARCHAR(20)` UNIQUE | 예약 번호 | SC-S3, SC-A5 |
| `user_id` | `UUID` FK → users | 예약자 | |
| `space_id` | `UUID` FK → spaces | 공간 | |
| `date` | `DATE` | 예약일 | |
| `start_time` | `TIME` | 시작 시간 | |
| `end_time` | `TIME` | 종료 시간 | |
| `status` | `ENUM('CONFIRMED','CANCELLED')` | 예약 상태 | |
| `cancelled_by_admin` | `BOOLEAN` default false | 관리자 강제 취소 여부 | SC-A7 |
| `admin_reason` | `TEXT` nullable | 관리자 수정·취소 사유 | SC-A6, SC-A7 |
| `requested_at` | `TIMESTAMPTZ(6)` | 요청 수신 시각 (1/100초 정밀도) | SC-S3, SC-G3 |
| `created_at` | `TIMESTAMPTZ` | 생성일시 | |
| `updated_at` | `TIMESTAMPTZ` | 수정일시 | |
| `deleted_at` | `TIMESTAMPTZ` nullable | soft delete | |

**인덱스**: `(space_id, date, start_time, status)` — 선착순 처리 성능

### ✅ reservation_number 생성 규칙 변경 (전역 시퀀스 → 날짜별 MAX+1)

형식: `R` + `YYYYMMDD` + `NNNNN` (5자리 순번, **날짜별 리셋**)

```
예시:
R2025031000001  ← 3월 10일 첫 번째 예약
R2025031000002  ← 3월 10일 두 번째 예약
R2025031100001  ← 3월 11일 첫 번째 예약 (날짜 바뀌면 1번부터)
```

서비스 레이어에서 트랜잭션 내 생성 (동시성 안전):

```sql
-- 트랜잭션 안에서 실행 (이미 FOR UPDATE 잠금 상태)
SELECT COALESCE(MAX(
  CAST(RIGHT(reservation_number, 5) AS INTEGER)
), 0) + 1 AS next_seq
FROM reservations
WHERE date = $1
  AND deleted_at IS NULL;

-- reservation_number = 'R' || TO_CHAR($date, 'YYYYMMDD') || LPAD(next_seq::TEXT, 5, '0')
```

### 선착순 처리 트랜잭션 흐름 (SC-S3, SC-G3)

```sql
BEGIN;
  SELECT * FROM reservations
  WHERE space_id = $1 AND date = $2
    AND start_time = $3 AND status = 'CONFIRMED'
    AND deleted_at IS NULL
  FOR UPDATE SKIP LOCKED;
  -- 잠금 획득 성공 → 순번 계산 → INSERT
  -- 잠금 획득 실패 → 409 CONFLICT 반환
COMMIT;
```

---

## penalty_logs

| 필드 | 타입 | 설명 | 관련 시나리오 |
|------|------|------|--------------|
| `id` | `UUID` PK | 로그 ID | |
| `user_id` | `UUID` FK → users | 사용자 | |
| `reservation_id` | `UUID` FK → reservations nullable | 관련 예약 (수동 조정 시 null) | SC-A8 |
| `score` | `INTEGER` | 부과/차감 점수 (+1, -N) | SC-S6, SC-A8 |
| `reason` | `VARCHAR(100)` | 사유 (당일취소, 수동조정 등) | SC-A8 |
| `created_at` | `TIMESTAMPTZ` | 부과일시 | |

> `users.penalty_score`는 이 테이블의 합산값과 항상 일치해야 함.
> 트랜잭션으로 두 곳을 동시에 업데이트.

---

## startup_club_approvals

| 필드 | 타입 | 설명 | 관련 시나리오 |
|------|------|------|--------------|
| `id` | `UUID` PK | 승인 ID | |
| `user_id` | `UUID` FK → users UNIQUE | 신청자 | |
| `status` | `ENUM('PENDING','APPROVED','REJECTED')` | 처리 상태 | SC-A3, SC-S7 |
| `rejected_reason` | `TEXT` nullable | 반려 사유 (반려 시 필수) | SC-A3 |
| `processed_at` | `TIMESTAMPTZ` nullable | 처리일시 | |
| `created_at` | `TIMESTAMPTZ` | 신청일시 | |

---

## holidays

| 필드 | 타입 | 설명 | 관련 시나리오 |
|------|------|------|--------------|
| `id` | `UUID` PK | ID | |
| `date` | `DATE` UNIQUE | 공휴일 날짜 | SC-S2, SC-A10 |
| `name` | `VARCHAR(100)` | 공휴일명 | |
| `year` | `INTEGER` | 연도 | SC-A10 |
| `is_substitute` | `BOOLEAN` | 대체공휴일 여부 | SC-A10 |
| `source` | `ENUM('API','MANUAL')` | 데이터 출처 | SC-A10 |

---

## unavailable_dates

| 필드 | 타입 | 설명 | 관련 시나리오 |
|------|------|------|--------------|
| `id` | `UUID` PK | ID | |
| `start_date` | `DATE` | 시작일 | SC-A10 |
| `end_date` | `DATE` | 종료일 | SC-A10 |
| `reason` | `VARCHAR(200)` | 사유 | SC-A10 |
| `created_by` | `UUID` FK → users | 등록 관리자 | |
| `created_at` | `TIMESTAMPTZ` | 등록일시 | |
| `updated_at` | `TIMESTAMPTZ` nullable | ✅ 수정일시 | SC-A10 |
| `updated_by` | `UUID` FK → users nullable | ✅ 수정 관리자 | SC-A10 |

> SC-A10: "등록된 운영 불가일은 목록에서 확인하고, 필요시 **수정** 또는 삭제할 수 있다"

---

## email_verification_tokens

| 필드 | 타입 | 설명 | 관련 시나리오 |
|------|------|------|--------------|
| `id` | `UUID` PK | ID | |
| `user_id` | `UUID` FK → users | 사용자 | |
| `token` | `VARCHAR(255)` UNIQUE | 인증 토큰 | SC-S1, SC-G1 |
| `expires_at` | `TIMESTAMPTZ` | 만료일시 (발급 후 3분) | SC-S1, SC-G1 |
| `used_at` | `TIMESTAMPTZ` nullable | 정상 인증 완료일시 | SC-S1 |
| `invalidated_at` | `TIMESTAMPTZ` nullable | ✅ 재발송으로 인한 무효화일시 | SC-S1, SC-G1 |
| `created_at` | `TIMESTAMPTZ` | 생성일시 | |

### 토큰 유효성 검사 조건

```sql
WHERE token = $1
  AND expires_at > NOW()       -- 3분 이내
  AND used_at IS NULL          -- 미사용
  AND invalidated_at IS NULL   -- 무효화 안 됨
```

### 재발송 무효화 처리 (SC-S1, SC-G1)

```sql
-- 1. 기존 미사용 토큰 모두 무효화
UPDATE email_verification_tokens
SET invalidated_at = NOW()
WHERE user_id = $1
  AND used_at IS NULL
  AND invalidated_at IS NULL;

-- 2. 새 토큰 INSERT (expires_at = NOW() + INTERVAL '3 minutes')
```

> used_at(정상 인증)과 invalidated_at(재발송 무효화)을 분리해 이력 명확히 구분.
> Redis는 refresh_token 전용으로만 사용.

---

## 변경 이력

| 버전 | 변경 내용 | 근거 시나리오 |
|------|-----------|--------------|
| v1.0 | 최초 설계 | - |
| v1.1 | users: `is_temp_password` 추가 | SC-S0, SC-G0 |
| v1.1 | users: `suspended_at` 추가 | SC-A8 |
| v1.1 | reservations: `reservation_number` 생성 방식 변경 (전역 시퀀스 → 날짜별 MAX+1) | SC-S3, SC-A5 |
| v1.1 | unavailable_dates: `updated_at`, `updated_by` 추가 | SC-A10 |
| v1.1 | email_verification_tokens: `invalidated_at` 추가, used_at과 역할 분리 | SC-S1, SC-G1 |
