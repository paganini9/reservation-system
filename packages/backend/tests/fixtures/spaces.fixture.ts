// 23개 공간 전체 목업 데이터
// Phase 0 freeze 후 실제 공간 ID와 함께 채워진다.
export const spaceFixtures = [
  { id: 'space-001', name: '회의실 1', type: 'MEETING_ROOM', capacity: 6, is_active: true },
  { id: 'space-002', name: '회의실 2', type: 'MEETING_ROOM', capacity: 8, is_active: true },
  { id: 'space-003', name: '회의실 3', type: 'MEETING_ROOM', capacity: 6, is_active: true },
  { id: 'space-004', name: '상담실', type: 'MEETING_ROOM', capacity: 8, is_active: true },
  { id: 'space-005', name: '집중업무공간 1', type: 'FOCUS', capacity: 1, is_active: true },
  { id: 'space-006', name: '집중업무공간 2', type: 'FOCUS', capacity: 1, is_active: true },
  { id: 'space-007', name: '집중업무공간 3', type: 'FOCUS', capacity: 1, is_active: true },
  { id: 'space-008', name: '집중업무공간 4', type: 'FOCUS', capacity: 1, is_active: true },
  // PC 1~12
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `space-pc-${String(i + 1).padStart(2, '0')}`,
    name: `PC ${i + 1}`,
    type: 'PC',
    capacity: 1,
    is_active: true,
  })),
  { id: 'space-edu-01', name: '교육실 1', type: 'EDUCATION', capacity: 16, is_active: true },
  { id: 'space-edu-02', name: '교육실 2', type: 'EDUCATION', capacity: 18, is_active: true },
  { id: 'space-edu-03', name: '교육실 3', type: 'EDUCATION', capacity: 30, is_active: true },
];
