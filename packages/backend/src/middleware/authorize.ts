import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: '권한이 없습니다.' },
      });
    }
    next();
  };
}
