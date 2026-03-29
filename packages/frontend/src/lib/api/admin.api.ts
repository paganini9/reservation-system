import { api } from './client';

export const adminApi = {
  getReservations: (params?: any) =>
    api.get<any>('/admin/reservations', { params }),

  createReservation: (data: any) =>
    api.post<any>('/admin/reservations', data),

  modifyReservation: (id: string, data: any) =>
    api.put<any>(`/admin/reservations/${id}`, data),

  cancelReservation: (id: string, reason: string) =>
    api.delete<any>(`/admin/reservations/${id}`, {
      body: JSON.stringify({ reason }),
      headers: { 'Content-Type': 'application/json' },
    } as any),

  getStartupClubs: () =>
    api.get<any>('/admin/startup-clubs'),

  processStartupClub: (approvalId: string, data: { action: string; reason?: string }) =>
    api.patch<any>(`/admin/startup-clubs/${approvalId}`, data),

  getUnavailableDates: (year?: number) =>
    api.get<any>('/admin/unavailable-dates', { params: { year } }),

  createUnavailableDate: (data: any) =>
    api.post<any>('/admin/unavailable-dates', data),

  updateUnavailableDate: (id: string, data: any) =>
    api.put<any>(`/admin/unavailable-dates/${id}`, data),

  deleteUnavailableDate: (id: string) =>
    api.delete<any>(`/admin/unavailable-dates/${id}`),

  getUsers: (params?: any) =>
    api.get<any>('/admin/users', { params }),

  getUserPenalty: (userId: string) =>
    api.get<any>(`/admin/users/${userId}/penalty`),

  adjustPenalty: (userId: string, data: { score: number; reason: string }) =>
    api.patch<any>(`/admin/users/${userId}/penalty`, data),

  grantAdmin: (userId: string) =>
    api.post<any>(`/admin/users/${userId}/grant-admin`),
};
