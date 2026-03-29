# DB 스키마 개요

> Prisma ORM 기반 PostgreSQL 스키마
> 변경 시 db-agent는 반드시 Orchestration Agent에 보고 후 수정한다.

---

## 테이블 관계도

```
users
  ├── reservations (1:N)
  ├── penalty_logs (1:N)
  └── startup_club_approvals (1:1)

spaces
  └── reservations (1:N)

holidays (독립 테이블)
unavailable_dates (독립 테이블)
```

---

## users

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `UUID` PK | 사용자 ID |
| `name` | `VARCHAR(50)` | 이름 |
| `email` | `VARCHAR(255)` UNIQUE | 이메일 (로그인 ID) |
| `password_hash` | `VARCHAR(255)` | bcrypt 해시 |
| `role` | `ENUM('STUDENT','GENERAL','ADMIN')` | 역할 |
| `student_type` | `ENUM('NORMAL','STARTUP_CLUB')` nullable | 학생 유형 |
| `university` | `VARCHAR(100)` nullable | 대학명 (학생만) |
| `student_id` | `VARCHAR(20)` nullable | 학번 (학생만) |
| `club_name` | `VARCHAR(100)` nullable | 동아리명 (창업동아리만) |
| `startup_club_approved` | `BOOLEAN` default false | 창업동아리 승인 여부 |
| `email_verified` | `BOOLEAN` default false | 이메일 인증 여부 |
| `penalty_score` | `INTEGER` default 0 | 현재 패널티 점수 |
| `is_suspended` | `BOOLEAN` default false | 예약 정지 여부 |
| `suspended_until` | `TIMESTAMPTZ` nullable | 정지 해제 예정일 |
| `created_at` | `TIMESTAMPTZ` | 생성일시 |
| `updated_at` | `TIMESTAMPTZ` | 수정일시 |
| `deleted_at` | `TIMESTAMPTZ` nullable | soft delete |

---

## spaces

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `UUID` PK | 공간 ID |
| `name` | `VARCHAR(50)` | 공간명 (예: 회의실 1) |
| `type` | `ENUM('MEETING_ROOM','FOCUS','PC','EDUCATION')` | 공간 유형 |
| `capacity` | `INTEGER` | 최대 수용 인원 |
| `is_active` | `BOOLEAN` default true | 예약 가능 여부 |

---

## reservations

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `UUID` PK | 예약 ID |
| `reservation_number` | `VARCHAR(20)` UNIQUE | 예약 번호 (R+날짜+순번) |
| `user_id` | `UUID` FK → users | 예약자 |
| `space_id` | `UUID` FK → spaces | 공간 |
| `date` | `DATE` | 예약일 |
| `start_time` | `TIME` | 시작 시간 |
| `end_time` | `TIME` | 종료 시간 |
| `status` | `ENUM('CONFIRMED','CANCELLED')` | 예약 상태 |
| `cancelled_by_admin` | `BOOLEAN` default false | 관리자 강제 취소 여부 |
| `admin_reason` | `TEXT` nullable | 관리자 수정·취소 사유 |
| `requested_at` | `TIMESTAMPTZ(6)` | 요청 수신 시각 (1/100초 정밀도) |
| `created_at` | `TIMESTAMPTZ` | 생성일시 |
| `updated_at` | `TIMESTAMPTZ` | 수정일시 |
| `deleted_at` | `TIMESTAMPTZ` nullable | soft delete |

**인덱스**: `(space_id, date, start_time, status)` — 선착순 처리 성능

---

## penalty_logs

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `UUID` PK | 로그 ID |
| `user_id` | `UUID` FK → users | 사용자 |
| `reservation_id` | `UUID` FK → reservations nullable | 관련 예약 |
| `score` | `INTEGER` | 부과/차감 점수 |
| `reason` | `VARCHAR(100)` | 사유 (당일취소, 수동조정 등) |
| `created_at` | `TIMESTAMPTZ` | 부과일시 |

---

## startup_club_approvals

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `UUID` PK | 승인 ID |
| `user_id` | `UUID` FK → users UNIQUE | 신청자 |
| `status` | `ENUM('PENDING','APPROVED','REJECTED')` | 처리 상태 |
| `rejected_reason` | `TEXT` nullable | 반려 사유 |
| `processed_at` | `TIMESTAMPTZ` nullable | 처리일시 |
| `created_at` | `TIMESTAMPTZ` | 신청일시 |

---

## holidays

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `UUID` PK | ID |
| `date` | `DATE` UNIQUE | 공휴일 날짜 |
| `name` | `VARCHAR(100)` | 공휴일명 |
| `year` | `INTEGER` | 연도 |
| `is_substitute` | `BOOLEAN` | 대체공휴일 여부 |
| `source` | `ENUM('API','MANUAL')` | 데이터 출처 |

---

## unavailable_dates

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `UUID` PK | ID |
| `start_date` | `DATE` | 시작일 |
| `end_date` | `DATE` | 종료일 |
| `reason` | `VARCHAR(200)` | 사유 |
| `created_by` | `UUID` FK → users | 등록 관리자 |
| `created_at` | `TIMESTAMPTZ` | 등록일시 |

---

## email_verification_tokens

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `UUID` PK | ID |
| `user_id` | `UUID` FK → users | 사용자 |
| `token` | `VARCHAR(255)` UNIQUE | 인증 토큰 |
| `expires_at` | `TIMESTAMPTZ` | 만료일시 (3분) |
| `used_at` | `TIMESTAMPTZ` nullable | 사용일시 |
| `created_at` | `TIMESTAMPTZ` | 생성일시 |

> Redis 대신 DB 저장을 선택하여 토큰 이력 관리 가능하도록 설계.
> Redis는 refresh_token 전용으로만 사용.
