import { Space } from '../types/space.types';

export const SPACES: Space[] = [
  { spaceId: 'space-001', name: '회의실 1',      type: 'MEETING_ROOM', capacity: 6,  isReservable: true },
  { spaceId: 'space-002', name: '회의실 2',      type: 'MEETING_ROOM', capacity: 8,  isReservable: true },
  { spaceId: 'space-003', name: '회의실 3',      type: 'MEETING_ROOM', capacity: 6,  isReservable: true },
  { spaceId: 'space-004', name: '상담실',        type: 'MEETING_ROOM', capacity: 8,  isReservable: true },
  { spaceId: 'space-005', name: '집중업무공간 1', type: 'FOCUS',        capacity: 1,  isReservable: true },
  { spaceId: 'space-006', name: '집중업무공간 2', type: 'FOCUS',        capacity: 1,  isReservable: true },
  { spaceId: 'space-007', name: '집중업무공간 3', type: 'FOCUS',        capacity: 1,  isReservable: true },
  { spaceId: 'space-008', name: '집중업무공간 4', type: 'FOCUS',        capacity: 1,  isReservable: true },
  ...Array.from({ length: 12 }, (_, i) => ({
    spaceId: `space-pc-${String(i + 1).padStart(2, '0')}`,
    name:    `PC ${i + 1}`,
    type:    'PC' as const,
    capacity: 1,
    isReservable: true,
  })),
  { spaceId: 'space-edu-01', name: '교육실 1 (세미나실 01)', type: 'EDUCATION', capacity: 16, isReservable: true },
  { spaceId: 'space-edu-02', name: '교육실 2 (세미나실 02)', type: 'EDUCATION', capacity: 18, isReservable: true },
  { spaceId: 'space-edu-03', name: '교육실 3 (세미나실 03)', type: 'EDUCATION', capacity: 30, isReservable: true },
];

// 예약 불가 공간 (참고용)
export const NON_RESERVABLE_SPACES = [
  '라운지 — 자유 이용',
  '코워킹 공간 — 자유 이용',
  '행정공간 — 이용 불가',
  'E/V HALL · 복도',
];
