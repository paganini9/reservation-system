'use client';

import React, { useEffect, useState } from 'react';
import { reservationApi } from '@/lib/api/reservation.api';
import type { Space, SpaceType } from '@reservation/shared';
import styles from './SpaceSelector.module.css';

interface SpaceSelectorProps {
  selectedDate: string | null;
  selectedSpaceId: string | null;
  onSelectSpace: (spaceId: string) => void;
}

const TYPE_LABELS: Record<SpaceType, string> = {
  MEETING_ROOM: '회의실',
  FOCUS: '집중업무공간',
  PC: 'PC석',
  EDUCATION: '교육실',
};

const TYPE_ORDER: SpaceType[] = ['MEETING_ROOM', 'FOCUS', 'PC', 'EDUCATION'];

export default function SpaceSelector({ selectedDate, selectedSpaceId, onSelectSpace }: SpaceSelectorProps) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    reservationApi.getSpaces()
      .then(data => setSpaces(data.spaces.filter(s => s.isReservable)))
      .catch(() => setSpaces([]))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  if (!selectedDate) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>공간 선택</h3>
        <div className={styles.noDate}>먼저 날짜를 선택해주세요.</div>
      </div>
    );
  }

  const grouped = TYPE_ORDER.map(type => ({
    type,
    label: TYPE_LABELS[type],
    items: spaces.filter(s => s.type === type),
  })).filter(g => g.items.length > 0);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>공간 선택</h3>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--gray-500)' }}>
          로딩 중...
        </div>
      ) : (
        grouped.map(group => (
          <div key={group.type} className={styles.group}>
            <div className={styles.groupTitle}>{group.label}</div>
            <div className={styles.cards}>
              {group.items.map(space => (
                <div
                  key={space.spaceId}
                  className={`${styles.card} ${selectedSpaceId === space.spaceId ? styles.cardSelected : ''}`}
                  onClick={() => onSelectSpace(space.spaceId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSelectSpace(space.spaceId);
                  }}
                >
                  <span className={styles.cardName}>{space.name}</span>
                  <span className={styles.cardCapacity}>{space.capacity}명</span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
