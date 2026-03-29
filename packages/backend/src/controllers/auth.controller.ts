import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { setAuthCookies, clearAuthCookies } from '../utils/cookie';
import { AuthRequest } from '../middleware/authenticate';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.register(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.body;
    const data = await authService.verifyEmail(token);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const data = await authService.resendVerification(email);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const { accessToken, refreshToken, loginData } = await authService.login(email, password);
    setAuthCookies(res, accessToken, refreshToken);
    res.status(200).json({ success: true, data: loginData });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (userId) {
      await authService.logout(userId);
    }
    clearAuthCookies(res);
    res.status(200).json({ success: true, data: { message: '로그아웃 되었습니다.' } });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshTokenValue = req.cookies?.refresh_token;
    if (!refreshTokenValue) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '리프레시 토큰이 없습니다.' },
      });
    }
    const { accessToken, refreshToken, message } = await authService.refresh(refreshTokenValue);
    setAuthCookies(res, accessToken, refreshToken);
    res.status(200).json({ success: true, data: { message } });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const data = await authService.forgotPassword(email);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const data = await authService.getMe(userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;
    const data = await authService.changePassword(userId, currentPassword, newPassword);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
