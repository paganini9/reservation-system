export type ReservationStatus = 'CONFIRMED' | 'CANCELLED';

export interface Reservation {
  reservationId: string;
  reservationNumber: string;
  spaceId: string;
  spaceName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  cancelledByAdmin?: boolean;
  createdAt: string;
}

export interface CreateReservationRequest {
  spaceId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface UpdateReservationRequest extends CreateReservationRequest {}

export interface ReservationSummary {
  reservationId: string;
  reservationNumber: string;
  spaceName: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface PenaltyInfo {
  penaltyScore: number;
  isSuspended: boolean;
  suspendedUntil?: string | null;
}
