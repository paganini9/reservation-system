# 관리자 API 계약

> 공통 응답 형식 및 에러 코드 → `common.api.md` 참고
> 모든 엔드포인트는 관리자 인증 필요 (role: ADMIN)

---

## GET /api/admin/reservations
전체 예약 현황 조회

### Query Parameters
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `date` | `YYYY-MM-DD` | 특정 날짜 필터 |
| `spaceId` | uuid | 공간 필터 |
| `userId` | uuid | 사용자 필터 |
| `page`, `limit` | number | 페이지네이션 |

### Response 200
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "reservationId": "uuid",
        "reservationNumber": "R2025031000001",
        "user": {
          "userId": "uuid",
          "name": "홍길동",
          "email": "user@example.com",
          "role": "STUDENT",
          "penaltyScore": 2
        },
        "spaceName": "회의실 1",
        "date": "2025-03-10",
        "startTime": "09:00",
        "endTime": "11:00",
        "status": "CONFIRMED"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

---

## PUT /api/admin/reservations/:id
예약 강제 수정

### Request Body
```json
{
  "spaceId": "uuid",
  "date": "2025-03-11",
  "startTime": "11:00",
  "endTime": "13:00",
  "reason": "시설 점검으로 인한 공간 변경"
}
```

### Response 200
```json
{
  "success": true,
  "data": {
    "reservationId": "새uuid",
    "reservationNumber": "R2025031100002",
    "spaceName": "회의실 2",
    "date": "2025-03-11",
    "startTime": "11:00",
    "endTime": "13:00",
    "status": "CONFIRMED",
    "modifiedByAdmin": true
  }
}
```

---

## DELETE /api/admin/reservations/:id
예약 강제 취소 (패널티 미부과)

### Request Body
```json
{
  "reason": "시설 긴급 점검으로 인한 강제 취소"
}
```

### Response 200
```json
{
  "success": true,
  "data": {
    "reservationId": "uuid",
    "status": "CANCELLED",
    "penaltyApplied": false,
    "cancelledByAdmin": true
  }
}
```

---

## POST /api/admin/reservations
관리자 직접 예약 (기간·공휴일 제한 없음)

### Request Body
```json
{
  "spaceId": "uuid",
  "date": "2025-03-15",
  "startTime": "09:00",
  "endTime": "11:00"
}
```

---

## GET /api/admin/startup-clubs
창업동아리 승인 대기 목록

### Response 200
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "approvalId": "uuid",
        "userId": "uuid",
        "name": "홍길동",
        "university": "대구대학교",
        "studentId": "2024001234",
        "clubName": "스타트업클럽",
        "requestedAt": "2025-03-01T09:00:00.000Z"
      }
    ],
    "pendingCount": 3
  }
}
```

---

## PATCH /api/admin/startup-clubs/:approvalId
창업동아리 승인·반려

### Request Body
```json
{
  "action": "APPROVE" | "REJECT",
  "reason": "반려 시 필수 입력"
}
```

### Response 200
```json
{
  "success": true,
  "data": {
    "approvalId": "uuid",
    "action": "APPROVE",
    "reservationLimit": 6
  }
}
```

---

## GET /api/admin/unavailable-dates
운영 불가일 목록

### Query Parameters
| 파라미터 | 설명 |
|----------|------|
| `year` | 연도 필터 (기본: 현재 연도) |

---

## POST /api/admin/unavailable-dates
운영 불가일 등록

### Request Body
```json
{
  "startDate": "2025-03-20",
  "endDate": "2025-03-21",
  "reason": "시설 점검"
}
```

### Response 201
기존 예약이 있을 경우 warning 포함.
```json
{
  "success": true,
  "data": {
    "unavailableDateId": "uuid",
    "startDate": "2025-03-20",
    "endDate": "2025-03-21",
    "reason": "시설 점검"
  },
  "warning": "해당 기간에 기존 예약 3건이 있습니다. 예약자에게 별도 안내가 필요합니다."
}
```

---

## DELETE /api/admin/unavailable-dates/:id
운영 불가일 삭제

---

## GET /api/admin/users
사용자 목록 조회

### Query Parameters
| 파라미터 | 설명 |
|----------|------|
| `search` | 이름·이메일 검색 |
| `role` | `STUDENT` \| `GENERAL` \| `ADMIN` |

---

## GET /api/admin/users/:userId/penalty
사용자 패널티 이력 조회

### Response 200
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "name": "홍길동",
    "penaltyScore": 3,
    "isSuspended": false,
    "suspendedUntil": null,
    "logs": [
      {
        "logId": "uuid",
        "score": 1,
        "reason": "당일 취소",
        "reservationNumber": "R2025031000001",
        "createdAt": "2025-03-10T14:00:00.000Z"
      }
    ]
  }
}
```

---

## PATCH /api/admin/users/:userId/penalty
패널티 점수 수동 조정

### Request Body
```json
{
  "score": 0,
  "reason": "오류로 인한 패널티 초기화"
}
```

---

## POST /api/admin/users/:userId/grant-admin
관리자 권한 부여

---

## GET /api/admin/reports/reservations?dates[]=YYYY-MM-DD
예약 현황 보고서 (PDF 다운로드)

### Response
`Content-Type: application/pdf`
파일명: `reservation-report-{date}.pdf`
