import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password'];
const ADMIN_PATHS = ['/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token')?.value;

  // 공개 경로는 통과
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    // 이미 로그인된 경우 예약 페이지로
    if (accessToken) return NextResponse.redirect(new URL('/reservations', request.url));
    return NextResponse.next();
  }

  // 미인증 → 로그인 페이지
  if (!accessToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 관리자 경로 권한 체크는 서버 컴포넌트에서 추가 처리
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
