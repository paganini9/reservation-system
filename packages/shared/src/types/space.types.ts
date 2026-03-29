export type SpaceType = 'MEETING_ROOM' | 'FOCUS' | 'PC' | 'EDUCATION';

export interface Space {
  spaceId: string;
  name: string;
  type: SpaceType;
  capacity: number;
  isReservable: boolean;
}

export type CalendarDayType = 'AVAILABLE' | 'HOLIDAY' | 'UNAVAILABLE';

export interface CalendarDay {
  date: string;
  type: CalendarDayType;
  isSelectable: boolean;
  label?: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'BOOKED';
}
