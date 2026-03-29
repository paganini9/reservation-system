import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { CalendarDay, CalendarDayType } from '@reservation/shared';
import { BOOKING_RANGE_DAYS } from '@reservation/shared';

const prisma = new PrismaClient();

const HOLIDAY_API_URL =
  'http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo';

class HolidayService {
  /**
   * 공공데이터 API에서 공휴일 가져와서 DB에 저장
   */
  async fetchAndSaveHolidays(year: number): Promise<void> {
    const apiKey = process.env.PUBLIC_HOLIDAY_API_KEY;
    if (!apiKey) {
      console.warn('[HolidayService] PUBLIC_HOLIDAY_API_KEY가 설정되지 않았습니다. 스킵합니다.');
      return;
    }

    try {
      // 1~12월 모든 공휴일 조회
      for (let month = 1; month <= 12; month++) {
        const solMonth = String(month).padStart(2, '0');

        const response = await axios.get(HOLIDAY_API_URL, {
          params: {
            solYear: year,
            solMonth,
            ServiceKey: apiKey,
            _type: 'json',
            numOfRows: 50,
          },
          timeout: 10000,
        });

        const body = response.data?.response?.body;
        if (!body || body.totalCount === 0) continue;

        // items가 단건이면 객체, 복수면 배열
        let items = body.items?.item;
        if (!items) continue;
        if (!Array.isArray(items)) items = [items];

        for (const item of items) {
          const locdate = String(item.locdate);
          const dateStr = `${locdate.slice(0, 4)}-${locdate.slice(4, 6)}-${locdate.slice(6, 8)}`;
          const date = new Date(dateStr);

          await prisma.holiday.upsert({
            where: { date },
            update: {
              name: item.dateName,
              year,
              is_substitute: item.isHoliday === 'Y' && item.dateName.includes('대체'),
              source: 'API',
            },
            create: {
              date,
              name: item.dateName,
              year,
              is_substitute: item.dateName.includes('대체'),
              source: 'API',
            },
          });
        }
      }

      console.log(`[HolidayService] ${year}년 공휴일 동기화 완료`);
    } catch (error) {
      console.error('[HolidayService] 공휴일 API 호출 실패 — DB 캐시 사용:', error);
    }
  }

  /**
   * 달력 데이터 생성
   */
  async getCalendarDays(
    year: number,
    month: number,
    userRole: string,
  ): Promise<CalendarDay[]> {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    const daysInMonth = endOfMonth.getDate();

    // DB에서 해당 월 공휴일 조회
    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });
    const holidayMap = new Map(
      holidays.map((h) => [h.date.toISOString().split('T')[0], h.name]),
    );

    // 운영불가일 조회
    const unavailableDates = await prisma.unavailableDate.findMany({
      where: {
        start_date: { lte: endOfMonth },
        end_date: { gte: startOfMonth },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 사용자 역할에 따른 예약 가능 기간
    const maxDays =
      userRole === 'STUDENT'
        ? BOOKING_RANGE_DAYS.STUDENT
        : BOOKING_RANGE_DAYS.GENERAL;
    const maxDate = new Date(today.getTime() + maxDays * 24 * 60 * 60 * 1000);

    const days: CalendarDay[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat

      let type: CalendarDayType = 'AVAILABLE';
      let isSelectable = true;
      let label: string | undefined;

      // 1. 주말
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        type = 'HOLIDAY';
        isSelectable = false;
        label = dayOfWeek === 0 ? '일요일' : '토요일';
      }

      // 2. 공휴일 (주말보다 우선 표시)
      const holidayName = holidayMap.get(dateStr);
      if (holidayName) {
        type = 'HOLIDAY';
        isSelectable = false;
        label = holidayName;
      }

      // 3. 운영불가일
      const unavailable = unavailableDates.find((u) => {
        const uStart = new Date(u.start_date);
        const uEnd = new Date(u.end_date);
        uStart.setHours(0, 0, 0, 0);
        uEnd.setHours(0, 0, 0, 0);
        return date >= uStart && date <= uEnd;
      });
      if (unavailable) {
        type = 'UNAVAILABLE';
        isSelectable = false;
        label = unavailable.reason;
      }

      // 4. 과거 날짜
      if (date < today) {
        isSelectable = false;
      }

      // 5. 예약 가능 기간 초과
      if (date > maxDate) {
        isSelectable = false;
      }

      days.push({ date: dateStr, type, isSelectable, ...(label ? { label } : {}) });
    }

    return days;
  }
}

export const holidayService = new HolidayService();
