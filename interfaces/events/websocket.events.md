# WebSocket 이벤트 정의

> Express.js (port 4000)에서 Socket.IO로 제공
> 실시간 예약 현황 업데이트에 사용

---

## 연결 및 인증

클라이언트 연결 시 쿠키의 access_token으로 자동 인증.
인증 실패 시 연결 거부.

```javascript
// 클라이언트 연결 예시
const socket = io('http://localhost:4000', {
  withCredentials: true  // 쿠키 포함
})
```

---

## 클라이언트 → 서버 이벤트

### `join:date`
특정 날짜의 예약 현황 구독 시작

```json
{
  "date": "2025-03-10"
}
```

### `leave:date`
특정 날짜 구독 해제

```json
{
  "date": "2025-03-10"
}
```

---

## 서버 → 클라이언트 이벤트

### `slot:updated`
특정 날짜의 시간대 예약 상태 변경 시 발송

```json
{
  "date": "2025-03-10",
  "spaceId": "uuid",
  "spaceName": "회의실 1",
  "startTime": "09:00",
  "endTime": "11:00",
  "status": "BOOKED" | "AVAILABLE"
}
```

### `reservation:confirmed`
내 예약 확정 알림 (해당 사용자에게만)

```json
{
  "reservationId": "uuid",
  "reservationNumber": "R2025031000001",
  "spaceName": "회의실 1",
  "date": "2025-03-10",
  "startTime": "09:00",
  "endTime": "11:00"
}
```

### `reservation:cancelled`
내 예약 취소 알림 (관리자 강제 취소 포함, 해당 사용자에게만)

```json
{
  "reservationId": "uuid",
  "reservationNumber": "R2025031000001",
  "reason": "시설 점검으로 인한 강제 취소",
  "cancelledByAdmin": true
}
```

---

## 룸(Room) 구조

| 룸 이름 | 설명 |
|---------|------|
| `date:{YYYY-MM-DD}` | 날짜별 예약 현황 구독자 |
| `user:{userId}` | 사용자별 개인 알림 |

서버에서 예약 생성·취소 시 해당 날짜 룸 전체에 `slot:updated` 이벤트 브로드캐스트.
