import { api } from './client';
import type {
  Space, CalendarDay, TimeSlot,
  Reservation, CreateReservationRequest, PaginatedResponse,
} from '@reservation/shared';

export const reservationApi = {
  getSpaces: () =>
    api.get<{ spaces: Space[] }>('/spaces'),

  getCalendar: (month: string) =>
    api.get<{ year: number; month: number; days: CalendarDay[] }>(
      '/calendar', { params: { month } },
    ),

  getSlots: (date: string, spaceId: string) =>
    api.get<{ date: string; spaceId: string; slots: TimeSlot[] }>(
      '/reservations/slots', { params: { date, spaceId } },
    ),

  create: (data: CreateReservationRequest) =>
    api.post<Reservation>('/reservations', data),

  getMyReservations: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Reservation>>('/reservations/me', { params: params as any }),

  update: (id: string, data: CreateReservationRequest) =>
    api.put<Reservation>(`/reservations/${id}`, data),

  cancel: (id: string) =>
    api.delete<{
      reservationId: string;
      status: string;
      penaltyApplied: boolean;
      penaltyScore: number;
      currentTotalPenalty: number;
    }>(`/reservations/${id}`),
};
