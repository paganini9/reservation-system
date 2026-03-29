import { http, HttpResponse } from 'msw';
import { mockReservations } from '../fixtures/reservations.mock';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const adminHandlers = [
  http.get(`${BASE}/admin/reservations`, () => {
    return HttpResponse.json({
      success: true,
      data: { items: mockReservations, total: mockReservations.length, page: 1, limit: 20 },
    });
  }),
];
