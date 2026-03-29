import { api } from './client';

export const adminApi = {
  getReservations:      (params?: Record<string, string | number | undefined>) =>
                          api.get('/admin/reservations', { params }),
  forceUpdate:          (id: string, data: object) =>
                          api.put(`/admin/reservations/${id}`, data),
  forceCancel:          (id: string, reason: string) =>
                          api.delete(`/admin/reservations/${id}`, {
                            body: JSON.stringify({ reason }),
                          }),
  getStartupClubs:      () =>
                          api.get('/admin/startup-clubs'),
  processStartupClub:   (approvalId: string, action: 'APPROVE' | 'REJECT', reason?: string) =>
                          api.patch(`/admin/startup-clubs/${approvalId}`, { action, reason }),
  getUnavailableDates:  (year?: number) =>
                          api.get('/admin/unavailable-dates', { params: { year } }),
  addUnavailableDate:   (data: { startDate: string; endDate: string; reason: string }) =>
                          api.post('/admin/unavailable-dates', data),
  deleteUnavailableDate:(id: string) =>
                          api.delete(`/admin/unavailable-dates/${id}`),
  getUsers:             (params?: Record<string, string | undefined>) =>
                          api.get('/admin/users', { params }),
  getUserPenalty:       (userId: string) =>
                          api.get(`/admin/users/${userId}/penalty`),
  updatePenalty:        (userId: string, score: number, reason: string) =>
                          api.patch(`/admin/users/${userId}/penalty`, { score, reason }),
  grantAdmin:           (userId: string) =>
                          api.post(`/admin/users/${userId}/grant-admin`),
  downloadReport:       (dates: string[]) => {
                          const query = dates.map(d => `dates[]=${d}`).join('&');
                          window.open(
                            `${process.env.NEXT_PUBLIC_API_URL}/admin/reports/reservations?${query}`
                          );
                        },
};
