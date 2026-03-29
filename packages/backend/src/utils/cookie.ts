import { Response } from 'express';

const IS_PROD = process.env.NODE_ENV === 'production';

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15분
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
}
