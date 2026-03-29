import { http, HttpResponse } from 'msw';
import { mockUsers } from '../fixtures/users.mock';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const authHandlers = [
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string };
    const user = mockUsers.find(u => u.email === body.email);
    if (!user) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '이메일 또는 비밀번호가 올바르지 않습니다.' } },
        { status: 401 }
      );
    }
    return HttpResponse.json({ success: true, data: user });
  }),

  http.get(`${BASE}/auth/me`, () => {
    return HttpResponse.json({ success: true, data: mockUsers[0] });
  }),

  http.post(`${BASE}/auth/logout`, () => {
    return HttpResponse.json({ success: true, data: { message: '로그아웃 되었습니다.' } });
  }),
];
