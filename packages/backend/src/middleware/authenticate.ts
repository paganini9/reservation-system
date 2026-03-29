import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.access_token;
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' },
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '토큰이 만료되었습니다.' },
    });
  }
}
