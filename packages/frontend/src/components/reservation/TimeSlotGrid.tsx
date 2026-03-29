'use client';

import React, { useEffect, useState } from 'react';
import { reservationApi } from '@/lib/api/reservation.api';
import type { TimeSlot } from '@reservation/shared';
import styles from './TimeSlotGrid.module.css';

interface TimeSlotGridProps {
  selectedDate: string | null;
  selectedSpaceId: string | null;
  selectedSlot: { startTime: string; endTime: string } | null;
  onSelectSlot: (slot: { startTime: string; endTime: string }) => void;
}

export default function TimeSlotGrid({
  selectedDate,
  selectedSpaceId,
  selectedSlot,
  onSelectSlot,
}: TimeSlotGridProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedDate || !selectedSpaceId) {
      setSlots([]);
      return;
    }
    setLoading(true);
    reservationApi
      .getSlots(selectedDate, selectedSpaceId)
      .then(data => setSlots(data.slots))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [selectedDate, selectedSpaceId]);

  if (!selectedDate || !selectedSpaceId) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>시간대 선택</h3>
        <div className={styles.noSpace}>날짜와 공간을 먼저 선택해주세요.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>시간대 선택</h3>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--gray-500)' }}>
          로딩 중...
        </div>
      ) : slots.length === 0 ? (
        <div className={styles.noSpace}>예약 가능한 시간대가 없습니다.</div>
      ) : (
        <div className={styles.grid}>
          {slots.map(slot => {
            const isBooked = slot.status === 'BOOKED';
            const isSelected =
              selectedSlot?.startTime === slot.startTime &&
              selectedSlot?.endTime === slot.endTime;

            let cls = styles.slot;
            if (isBooked) cls += ` ${styles.booked}`;
            else if (isSelected) cls += ` ${styles.slotSelected}`;

            return (
              <div
                key={`${slot.startTime}-${slot.endTime}`}
                className={cls}
                onClick={() => !isBooked && onSelectSlot({ startTime: slot.startTime, endTime: slot.endTime })}
                role={isBooked ? undefined : 'button'}
                tabIndex={isBooked ? undefined : 0}
                onKeyDown={(e) => {
                  if (!isBooked && (e.key === 'Enter' || e.key === ' ')) {
                    onSelectSlot({ startTime: slot.startTime, endTime: slot.endTime });
                  }
                }}
              >
                {slot.startTime} ~ {slot.endTime}
                {isBooked && ' (예약됨)'}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
