'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { reservationApi } from '@/lib/api/reservation.api';
import type { CalendarDay } from '@reservation/shared';
import styles from './Calendar.module.css';

interface CalendarProps {
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function Calendar({ selectedDate, onSelectDate }: CalendarProps) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const data = await reservationApi.getCalendar(monthStr);
      setDays(data.days);
    } catch {
      setDays([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const handlePrev = () => {
    if (month === 1) {
      setYear(y => y - 1);
      setMonth(12);
    } else {
      setMonth(m => m - 1);
    }
  };

  const handleNext = () => {
    if (month === 12) {
      setYear(y => y + 1);
      setMonth(1);
    } else {
      setMonth(m => m + 1);
    }
  };

  // Calculate first day offset
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build day map from API response
  const dayMap = new Map<number, CalendarDay>();
  days.forEach(d => {
    const dayNum = parseInt(d.date.split('-')[2], 10);
    dayMap.set(dayNum, d);
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const emptyCells = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.navBtn} onClick={handlePrev} type="button">
          &larr; 이전
        </button>
        <span className={styles.title}>{year}년 {month}월</span>
        <button className={styles.navBtn} onClick={handleNext} type="button">
          다음 &rarr;
        </button>
      </div>

      <div className={styles.weekRow}>
        {WEEK_DAYS.map(d => (
          <div key={d} className={styles.weekDay}>{d}</div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray-500)' }}>
          로딩 중...
        </div>
      ) : (
        <div className={styles.grid}>
          {emptyCells.map(i => (
            <div key={`empty-${i}`} className={`${styles.dayCell} ${styles.empty}`} />
          ))}
          {dayCells.map(day => {
            const calDay = dayMap.get(day);
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dateObj = new Date(year, month - 1, day);
            const isPast = dateObj < today;
            const isSelected = selectedDate === dateStr;

            let cellClass = styles.dayCell;
            if (isPast) {
              cellClass += ` ${styles.past} ${styles.disabled}`;
            } else if (calDay) {
              if (calDay.type === 'AVAILABLE' && calDay.isSelectable) {
                cellClass += ` ${styles.available}`;
              } else if (calDay.type === 'HOLIDAY') {
                cellClass += ` ${styles.holiday} ${styles.disabled}`;
              } else if (calDay.type === 'UNAVAILABLE') {
                cellClass += ` ${styles.unavailable} ${styles.disabled}`;
              } else {
                cellClass += ` ${styles.disabled}`;
              }
            } else {
              cellClass += ` ${styles.disabled}`;
            }

            if (isSelected) {
              cellClass += ` ${styles.selected}`;
            }

            const canSelect = !isPast && calDay?.isSelectable;

            return (
              <div
                key={day}
                className={cellClass}
                onClick={() => canSelect && onSelectDate(dateStr)}
                role={canSelect ? 'button' : undefined}
                tabIndex={canSelect ? 0 : undefined}
                onKeyDown={(e) => {
                  if (canSelect && (e.key === 'Enter' || e.key === ' ')) {
                    onSelectDate(dateStr);
                  }
                }}
              >
                <span>{day}</span>
                {calDay?.label && (
                  <span className={styles.dayLabel}>{calDay.label}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendAvailable}`} />
          예약 가능
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendHoliday}`} />
          공휴일
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendUnavailable}`} />
          운영 불가
        </div>
      </div>
    </div>
  );
}
