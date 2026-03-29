# 인증 API 계약

> 공통 응답 형식 및 에러 코드 → `common.api.md` 참고

---

## POST /api/auth/register
회원가입

### Request Body
```json
{
  "name": "홍길동",
  "email": "user@example.com",
  "password": "password123",
  "role": "STUDENT" | "GENERAL",

  // role이 STUDENT인 경우 필수
  "university": "대구대학교",
  "studentId": "2024001234",
  "studentType": "NORMAL" | "STARTUP_CLUB",

  // studentType이 STARTUP_CLUB인 경우 필수
  "clubName": "창업동아리명"
}
```

### Response 201
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "message": "인증 이메일이 발송되었습니다."
  }
}
```

### Errors
| 코드 | 상황 |
|------|------|
| `ALREADY_EXISTS` | 이미 가입된 이메일 |
| `VALIDATION_ERROR` | 필수 필드 누락 또는 형식 오류 |

---

## POST /api/auth/verify-email
이메일 인증

### Request Body
```json
{
  "token": "인증토큰(UUID)"
}
```

### Response 200
```json
{
  "success": true,
  "data": {
    "message": "이메일 인증이 완료되었습니다."
  }
}
```

### Errors
| 코드 | 상황 |
|------|------|
| `NOT_FOUND` | 유효하지 않은 토큰 |
| `VALIDATION_ERROR` | 만료된 토큰 (3분 초과) |

---

## POST /api/auth/resend-verification
인증 이메일 재발송

### Request Body
```json
{
  "email": "user@example.com"
}
```

### Response 200
```json
{
  "success": true,
  "data": {
    "message": "인증 이메일이 재발송되었습니다."
  }
}
```

---

## POST /api/auth/login
로그인

### Request Body
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Response 200
쿠키에 `access_token`, `refresh_token` 설정됨.
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "name": "홍길동",
    "role": "STUDENT",
    "studentType": "STARTUP_CLUB",
    "startupClubApproved": true,
    "penaltyScore": 0,
    "isSuspended": false
  }
}
```

### Errors
| 코드 | 상황 |
|------|------|
| `UNAUTHORIZED` | 이메일 또는 비밀번호 불일치 |
| `EMAIL_NOT_VERIFIED` | 이메일 인증 미완료 |

---

## POST /api/auth/logout
로그아웃. 쿠키 삭제 및 Redis refresh token 무효화.

### Response 200
```json
{
  "success": true,
  "data": { "message": "로그아웃 되었습니다." }
}
```

---

## POST /api/auth/refresh
Access token 갱신. Refresh token rotation 수행.

### Response 200
새 `access_token`, `refresh_token` 쿠키 설정됨.
```json
{
  "success": true,
  "data": { "message": "토큰이 갱신되었습니다." }
}
```

---

## POST /api/auth/forgot-password
임시 비밀번호 발송

### Request Body
```json
{
  "email": "user@example.com"
}
```

### Response 200
```json
{
  "success": true,
  "data": {
    "message": "임시 비밀번호가 이메일로 발송되었습니다."
  }
}
```

---

## GET /api/auth/me
내 정보 조회 (인증 필요)

### Response 200
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "name": "홍길동",
    "email": "user@example.com",
    "role": "STUDENT",
    "university": "대구대학교",
    "studentId": "2024001234",
    "studentType": "STARTUP_CLUB",
    "startupClubApproved": true,
    "penaltyScore": 2,
    "isSuspended": false,
    "suspendedUntil": null,
    "reservationLimit": 6
  }
}
```

---

## PATCH /api/auth/password
비밀번호 변경 (인증 필요)

### Request Body
```json
{
  "currentPassword": "현재비밀번호",
  "newPassword": "새비밀번호"
}
```

### Response 200
```json
{
  "success": true,
  "data": { "message": "비밀번호가 변경되었습니다." }
}
```
