/**
 * 23개 공간 fixture (prisma/seed.ts의 SPACES와 동일 구조)
 * ID는 UUID 형식 (raw SQL ::uuid 캐스트 호환)
 */
export const spaceFixtures = [
  { id: '00000000-0000-4000-a000-000000000001', name: '회의실 1', type: 'MEETING_ROOM' as const, capacity: 6, is_active: true },
  { id: '00000000-0000-4000-a000-000000000002', name: '회의실 2', type: 'MEETING_ROOM' as const, capacity: 8, is_active: true },
  { id: '00000000-0000-4000-a000-000000000003', name: '회의실 3', type: 'MEETING_ROOM' as const, capacity: 6, is_active: true },
  { id: '00000000-0000-4000-a000-000000000004', name: '상담실', type: 'MEETING_ROOM' as const, capacity: 8, is_active: true },
  { id: '00000000-0000-4000-a000-000000000005', name: '집중업무공간 1', type: 'FOCUS' as const, capacity: 1, is_active: true },
  { id: '00000000-0000-4000-a000-000000000006', name: '집중업무공간 2', type: 'FOCUS' as const, capacity: 1, is_active: true },
  { id: '00000000-0000-4000-a000-000000000007', name: '집중업무공간 3', type: 'FOCUS' as const, capacity: 1, is_active: true },
  { id: '00000000-0000-4000-a000-000000000008', name: '집중업무공간 4', type: 'FOCUS' as const, capacity: 1, is_active: true },
  // PC 1~12
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `00000000-0000-4000-a000-0000000000${String(i + 9).padStart(2, '0')}`,
    name: `PC ${i + 1}`,
    type: 'PC' as const,
    capacity: 1,
    is_active: true,
  })),
  { id: '00000000-0000-4000-a000-000000000021', name: '교육실 1', type: 'EDUCATION' as const, capacity: 16, is_active: true },
  { id: '00000000-0000-4000-a000-000000000022', name: '교육실 2', type: 'EDUCATION' as const, capacity: 18, is_active: true },
  { id: '00000000-0000-4000-a000-000000000023', name: '교육실 3', type: 'EDUCATION' as const, capacity: 30, is_active: true },
];

// 편의 상수
export const SPACE_ID = {
  MEETING_1: '00000000-0000-4000-a000-000000000001',
  MEETING_2: '00000000-0000-4000-a000-000000000002',
  MEETING_3: '00000000-0000-4000-a000-000000000003',
  COUNSEL: '00000000-0000-4000-a000-000000000004',
  FOCUS_1: '00000000-0000-4000-a000-000000000005',
  FOCUS_2: '00000000-0000-4000-a000-000000000006',
  FOCUS_3: '00000000-0000-4000-a000-000000000007',
  FOCUS_4: '00000000-0000-4000-a000-000000000008',
  PC_1: '00000000-0000-4000-a000-000000000009',
  EDU_1: '00000000-0000-4000-a000-000000000021',
} as const;
