# Frontend — 패키지 지침

> Orchestration Agent가 서브 에이전트를 이 패키지에서 작업시킬 때 참고하는 파일

## 패키지 개요
Next.js 14 App Router (port 3000)

## 주요 의존성
- `next` 14 — React 프레임워크
- `msw` — Mock Service Worker (목업 API)
- `zustand` 또는 React Context — 클라이언트 상태 관리

## 라우팅 구조
| 경로 그룹 | 설명 |
|----------|------|
| `(auth)/` | 비인증 전용 (로그인, 회원가입) |
| `(user)/` | 일반 사용자 전용 |
| `(admin)/` | 관리자 전용 |

## 개발 순서 핵심 원칙
Phase 4 기간 중 MSW 목업으로 선개발.
백엔드 완성 후 Step 4-9에서 실 API로 교체.
→ `../../agents/frontend-agent.md` 상세 참고

## API 클라이언트 위치
`src/lib/api/` — 모든 API 호출 함수가 여기 있음.
컴포넌트에서 직접 `fetch` 사용 금지.

## MSW 설정 위치
`mocks/browser.ts` — 브라우저 환경 MSW 초기화
`mocks/handlers/` — API별 목업 핸들러
`mocks/fixtures/` — 목업 응답 데이터

## 환경변수 키 목록
```
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_WS_URL
NEXT_PUBLIC_USE_MOCK    # "true"이면 MSW 활성화
```

## 참고 문서
- `../../interfaces/api/` — API 계약
- `../../agents/frontend-agent.md` — 에이전트 지침
