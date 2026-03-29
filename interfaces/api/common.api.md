# 공통 API 계약

## 기본 URL
| 환경 | URL |
|------|-----|
| 개발 | `http://localhost:4000/api` |
| 프로덕션 | `https://{domain}/api` |

---

## 공통 응답 형식

### 성공
```json
{
  "success": true,
  "data": { ... }
}
```

### 성공 (목록 + 페이지네이션)
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

### 실패
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사람이 읽을 수 있는 설명"
  }
}
```

### 성공 + 경고 (운영불가일 등록 등)
```json
{
  "success": true,
  "data": { ... },
  "warning": "경고 메시지"
}
```

---

## 공통 에러 코드

| 코드 | HTTP 상태 | 의미 |
|------|-----------|------|
| `UNAUTHORIZED` | 401 | 미인증 또는 토큰 만료 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `CONFLICT` | 409 | 동시 예약 충돌 (선착순 탈락) |
| `LIMIT_EXCEEDED` | 422 | 예약 건수 한도 초과 |
| `PENALTY_BLOCKED` | 422 | 패널티로 인한 예약 차단 |
| `VALIDATION_ERROR` | 400 | 입력값 오류 |
| `EMAIL_NOT_VERIFIED` | 403 | 이메일 인증 미완료 |
| `ALREADY_EXISTS` | 409 | 중복 데이터 (이메일 중복 등) |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 |

---

## 인증 방식
쿠키 기반. 별도 `Authorization` 헤더 불필요.

| 쿠키 | 설명 |
|------|------|
| `access_token` | JWT access token (15분 만료) |
| `refresh_token` | JWT refresh token (7일 만료) |

쿠키 설정: `httpOnly: true`, `secure: true`, `sameSite: 'strict'`

---

## 날짜 형식
| 형식 | 사용처 |
|------|--------|
| `YYYY-MM-DDTHH:mm:ss.sssZ` | ISO 8601, 모든 datetime 필드 |
| `YYYY-MM-DD` | 날짜만 필요한 필드 (예약일 등) |
| `HH:mm` | 시간대 표현 (예: `"09:00"`, `"11:00"`) |

---

## 공통 쿼리 파라미터 (목록 조회)
| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `page` | number | 1 | 페이지 번호 |
| `limit` | number | 20 | 페이지당 항목 수 |
| `sort` | string | - | 정렬 기준 필드 |
| `order` | `asc` \| `desc` | `desc` | 정렬 방향 |
