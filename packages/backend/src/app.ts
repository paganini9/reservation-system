import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { errorHandler } from './middleware/error-handler';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Routes (각 Phase에서 에이전트가 등록)
  // app.use('/api/auth', authRouter);
  // app.use('/api/reservations', reservationRouter);
  // app.use('/api/spaces', spaceRouter);
  // app.use('/api/admin', adminRouter);

  app.use(errorHandler);

  return app;
}

export function createHttpServer() {
  const app = createApp();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', credentials: true },
  });
  return { app, httpServer, io };
}
