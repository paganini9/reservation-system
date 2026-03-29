export type UserRole = 'STUDENT' | 'GENERAL' | 'ADMIN';
export type StudentType = 'NORMAL' | 'STARTUP_CLUB';

export interface User {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  studentType?: StudentType;
  university?: string;
  studentId?: string;
  clubName?: string;
  startupClubApproved: boolean;
  emailVerified: boolean;
  penaltyScore: number;
  isSuspended: boolean;
  suspendedUntil?: string | null;
  reservationLimit: number;
  createdAt: string;
}

export interface RegisterStudentRequest {
  name: string;
  email: string;
  password: string;
  role: 'STUDENT';
  university: string;
  studentId: string;
  studentType: StudentType;
  clubName?: string;
}

export interface RegisterGeneralRequest {
  name: string;
  email: string;
  password: string;
  role: 'GENERAL';
}

export type RegisterRequest = RegisterStudentRequest | RegisterGeneralRequest;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  name: string;
  role: UserRole;
  studentType?: StudentType;
  startupClubApproved: boolean;
  penaltyScore: number;
  isSuspended: boolean;
}
