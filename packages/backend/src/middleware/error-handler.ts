import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';

  console.error(`[Error] ${code}:`, err.message);

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: err.message ?? '서버 오류가 발생했습니다.',
    },
  });
}
