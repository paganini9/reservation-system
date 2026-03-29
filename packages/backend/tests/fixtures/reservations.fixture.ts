import { SPACE_ID } from './spaces.fixture';
import { USER_ID } from './users.fixture';

/**
 * 로컬 날짜를 YYYY-MM-DD 문자열로 변환
 */
function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 테스트용 예약 fixture
 * 내일 날짜로 기본 예약 1건 생성
 */
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const dateStr = toLocalDateString(tomorrow);

export const RES_ID = {
  BASIC: '20000000-0000-4000-a000-000000000001',
} as const;

export const reservationFixtures = [
  {
    id: RES_ID.BASIC,
    reservation_number: 'R' + dateStr.replace(/-/g, '') + '00001',
    user_id: USER_ID.STUDENT,
    space_id: SPACE_ID.MEETING_1,
    date: new Date(dateStr),
    start_time: new Date('1970-01-01T09:00:00Z'),
    end_time: new Date('1970-01-01T11:00:00Z'),
    status: 'CONFIRMED' as const,
    requested_at: new Date(),
  },
];
