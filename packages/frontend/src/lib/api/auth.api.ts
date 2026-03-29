import { api } from './client';
import type { LoginRequest, LoginResponse, RegisterRequest, User } from '@reservation/shared';

export const authApi = {
  register:           (data: RegisterRequest) =>
                        api.post('/auth/register', data),
  verifyEmail:        (token: string) =>
                        api.post('/auth/verify-email', { token }),
  resendVerification: (email: string) =>
                        api.post('/auth/resend-verification', { email }),
  login:              (data: LoginRequest) =>
                        api.post<LoginResponse>('/auth/login', data),
  logout:             () =>
                        api.post('/auth/logout'),
  refresh:            () =>
                        api.post('/auth/refresh'),
  forgotPassword:     (email: string) =>
                        api.post('/auth/forgot-password', { email }),
  getMe:              () =>
                        api.get<User>('/auth/me'),
  changePassword:     (currentPassword: string, newPassword: string) =>
                        api.patch('/auth/password', { currentPassword, newPassword }),
};
