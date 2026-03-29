# 예약 API 계약

> 공통 응답 형식 및 에러 코드 → `common.api.md` 참고
> 모든 엔드포인트는 인증 필요 (쿠키 기반)

---

## GET /api/spaces
공간 목록 조회

### Response 200
```json
{
  "success": true,
  "data": {
    "spaces": [
      {
        "spaceId": "uuid",
        "name": "회의실 1",
        "type": "MEETING_ROOM",
        "capacity": 6,
        "isReservable": true
      }
    ]
  }
}
```

### 공간 type 목록
| type | 설명 |
|------|------|
| `MEETING_ROOM` | 회의실 1~3, 상담실 |
| `FOCUS` | 집중업무공간 1~4 |
| `PC` | PC 1~12 |
| `EDUCATION` | 교육실 1~3 |

---

## GET /api/calendar?month=YYYY-MM
월별 달력 데이터 조회

### Response 200
```json
{
  "success": true,
  "data": {
    "year": 2025,
    "month": 3,
    "days": [
      {
        "date": "2025-03-10",
        "type": "AVAILABLE",
        "isSelectable": true
      },
      {
        "date": "2025-03-15",
        "type": "HOLIDAY",
        "isSelectable": false,
        "label": "3·1절 대체공휴일"
      },
      {
        "date": "2025-03-20",
        "type": "UNAVAILABLE",
        "isSelectable": false,
        "label": "시설 점검"
      }
    ]
  }
}
```

### 날짜 type
| type | 설명 | 선택 가능 |
|------|------|----------|
| `AVAILABLE` | 예약 가능 | O |
| `HOLIDAY` | 공휴일·주말 | X |
| `UNAVAILABLE` | 관리자 등록 운영불가일 | X (관리자만 O) |

---

## GET /api/reservations/slots?date=YYYY-MM-DD&spaceId=uuid
특정 날짜·공간의 시간대별 예약 현황

### Response 200
```json
{
  "success": true,
  "data": {
    "date": "2025-03-10",
    "spaceId": "uuid",
    "slots": [
      {
        "startTime": "09:00",
        "endTime": "11:00",
        "status": "AVAILABLE"
      },
      {
        "startTime": "11:00",
        "endTime": "13:00",
        "status": "BOOKED"
      }
    ]
  }
}
```

---

## POST /api/reservations
예약 생성

### Request Body
```json
{
  "spaceId": "uuid",
  "date": "2025-03-10",
  "startTime": "09:00",
  "endTime": "11:00"
}
```

### Response 201
```json
{
  "success": true,
  "data": {
    "reservationId": "uuid",
    "reservationNumber": "R2025031000001",
    "spaceId": "uuid",
    "spaceName": "회의실 1",
    "date": "2025-03-10",
    "startTime": "09:00",
    "endTime": "11:00",
    "status": "CONFIRMED",
    "createdAt": "2025-03-01T09:00:00.000Z"
  }
}
```

### Errors
| 코드 | 상황 |
|------|------|
| `CONFLICT` | 동시 요청 선착순 탈락 |
| `LIMIT_EXCEEDED` | 예약 건수 한도 초과 |
| `PENALTY_BLOCKED` | 패널티 정지 중 |
| `VALIDATION_ERROR` | 예약 불가일·불가 시간대 |

---

## GET /api/reservations/me
내 예약 목록

### Query Parameters
| 파라미터 | 설명 |
|----------|------|
| `status` | `CONFIRMED` \| `CANCELLED` \| `all` |
| `page`, `limit` | 페이지네이션 |

### Response 200
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "reservationId": "uuid",
        "reservationNumber": "R2025031000001",
        "spaceName": "회의실 1",
        "date": "2025-03-10",
        "startTime": "09:00",
        "endTime": "11:00",
        "status": "CONFIRMED"
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 20
  }
}
```

---

## PUT /api/reservations/:id
예약 수정 (기존 취소 → 신규 생성 원자적 처리)

### Request Body
```json
{
  "spaceId": "uuid",
  "date": "2025-03-11",
  "startTime": "11:00",
  "endTime": "13:00"
}
```

### Response 200
새 예약 정보 반환. 기존 예약은 `CANCELLED` 처리됨.
```json
{
  "success": true,
  "data": {
    "reservationId": "새uuid",
    "reservationNumber": "R2025031100001",
    "spaceName": "회의실 1",
    "date": "2025-03-11",
    "startTime": "11:00",
    "endTime": "13:00",
    "status": "CONFIRMED"
  }
}
```

---

## DELETE /api/reservations/:id
예약 취소

### Response 200
```json
{
  "success": true,
  "data": {
    "reservationId": "uuid",
    "status": "CANCELLED",
    "penaltyApplied": true,
    "penaltyScore": 1,
    "currentTotalPenalty": 3
  }
}
```

### 패널티 부과 여부
| 취소 시점 | `penaltyApplied` |
|-----------|-----------------|
| 하루 전 이전 | `false` |
| 당일 | `true` |
