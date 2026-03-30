import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token')?.value;

  // 공개 경로는 통과
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    if (accessToken) {
      return NextResponse.redirect(new URL('/reservation/reservations', request.url));
    }
    return NextResponse.next();
  }

  // 루트 경로 → 로그인 또는 예약 페이지로
  if (pathname === '/') {
    if (accessToken) {
      return NextResponse.redirect(new URL('/reservation/reservations', request.url));
    }
    return NextResponse.redirect(new URL('/reservation/login', request.url));
  }

  // 미인증 → 로그인 페이지
  if (!accessToken) {
    return NextResponse.redirect(new URL('/reservation/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
