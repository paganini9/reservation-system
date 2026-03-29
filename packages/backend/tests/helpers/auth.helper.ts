import request from 'supertest';
import type { Express } from 'express';

/**
 * 로그인하여 set-cookie 헤더(access_token, refresh_token)를 반환.
 * supertest 요청 시 .set('Cookie', cookies) 로 사용.
 */
export async function loginAs(
  app: Express,
  email: string,
  password: string = 'Test1234!',
): Promise<string[]> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }

  const cookies = res.headers['set-cookie'];
  if (!cookies) {
    throw new Error(`No set-cookie header returned for ${email}`);
  }

  return Array.isArray(cookies) ? cookies : [cookies];
}

/**
 * 로컬 날짜를 YYYY-MM-DD 문자열로 변환
 * (toISOString은 UTC 기준이라 시간대 차이로 날짜가 어긋날 수 있음)
 */
function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 내일 날짜 문자열 (YYYY-MM-DD, 로컬 기준)
 */
export function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toLocalDateString(d);
}

/**
 * 오늘 날짜 문자열 (YYYY-MM-DD, 로컬 기준)
 */
export function getTodayDate(): string {
  return toLocalDateString(new Date());
}

/**
 * N일 후 날짜 문자열 (로컬 기준)
 */
export function getFutureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return toLocalDateString(d);
}
