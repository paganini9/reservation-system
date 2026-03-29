import { http, HttpResponse } from 'msw';
import { mockReservations } from '../fixtures/reservations.mock';
import { mockSpaces } from '../fixtures/spaces.mock';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const reservationHandlers = [
  http.get(`${BASE}/spaces`, () => {
    return HttpResponse.json({ success: true, data: { spaces: mockSpaces } });
  }),

  http.get(`${BASE}/reservations/me`, () => {
    return HttpResponse.json({
      success: true,
      data: { items: mockReservations, total: mockReservations.length, page: 1, limit: 20 },
    });
  }),

  http.post(`${BASE}/reservations`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        reservationId: 'new-res-001',
        reservationNumber: 'R202503100001',
        spaceName: '회의실 1',
        date: '2025-03-10',
        startTime: '09:00',
        endTime: '11:00',
        status: 'CONFIRMED',
      },
    }, { status: 201 });
  }),
];
