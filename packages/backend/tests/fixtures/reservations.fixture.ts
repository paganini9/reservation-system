// 테스트용 예약 목업 데이터
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const dateStr = tomorrow.toISOString().split('T')[0];

export const reservationFixtures = [
  {
    id: 'res-001',
    reservation_number: 'R' + dateStr.replace(/-/g, '') + '00001',
    user_id: 'user-student-01',
    space_id: 'space-001',
    date: dateStr,
    start_time: '09:00',
    end_time: '11:00',
    status: 'CONFIRMED',
    requested_at: new Date(),
  },
];
