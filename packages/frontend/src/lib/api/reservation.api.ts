import { api } from './client';
import type {
  Space, CalendarDay, TimeSlot,
  Reservation, CreateReservationRequest, UpdateReservationRequest,
} from '@reservation/shared';

export const reservationApi = {
  getSpaces:    () =>
                  api.get<{ spaces: Space[] }>('/spaces'),
  getCalendar:  (month: string) =>
                  api.get<{ year: number; month: number; days: CalendarDay[] }>(
                    '/calendar', { params: { month } }
                  ),
  getSlots:     (date: string, spaceId: string) =>
                  api.get<{ date: string; spaceId: string; slots: TimeSlot[] }>(
                    '/reservations/slots', { params: { date, spaceId } }
                  ),
  getMyList:    (params?: { status?: string; page?: number; limit?: number }) =>
                  api.get<{ items: Reservation[]; total: number; page: number; limit: number }>(
                    '/reservations/me', { params }
                  ),
  create:       (data: CreateReservationRequest) =>
                  api.post<Reservation>('/reservations', data),
  update:       (id: string, data: UpdateReservationRequest) =>
                  api.put<Reservation>(`/reservations/${id}`, data),
  cancel:       (id: string) =>
                  api.delete<{ reservationId: string; penaltyApplied: boolean; currentTotalPenalty: number }>(
                    `/reservations/${id}`
                  ),
};
