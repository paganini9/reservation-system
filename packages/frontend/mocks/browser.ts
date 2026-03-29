import { setupWorker } from 'msw/browser';
import { authHandlers } from './handlers/auth.handlers';
import { reservationHandlers } from './handlers/reservation.handlers';
import { adminHandlers } from './handlers/admin.handlers';

export const worker = setupWorker(
  ...authHandlers,
  ...reservationHandlers,
  ...adminHandlers,
);
