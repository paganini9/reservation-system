'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { reservationApi } from '@/lib/api/reservation.api';
import type { Reservation } from '@reservation/shared';
import Button from '@/components/ui/Button';
import styles from './ReservationList.module.css';

interface ReservationListProps {
  onEdit?: (reservation: Reservation) => void;
  onCancel?: (reservation: Reservation) => void;
  refreshKey?: number;
}

type TabFilter = 'all' | 'CONFIRMED' | 'CANCELLED';

export default function ReservationList({ onEdit, onCancel, refreshKey }: ReservationListProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabFilter>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (tab !== 'all') params.status = tab;
      const data = await reservationApi.getMyReservations(params);
      setReservations(data.items);
      setTotal(data.total);
    } catch {
      setReservations([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'CONFIRMED', label: '확정' },
    { key: 'CANCELLED', label: '취소됨' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>내 예약 목록</h3>
        <div className={styles.tabs}>
          {tabs.map(t => (
            <button
              key={t.key}
              className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
              onClick={() => setTab(t.key)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray-500)' }}>
          로딩 중...
        </div>
      ) : reservations.length === 0 ? (
        <div className={styles.emptyMessage}>예약 내역이 없습니다.</div>
      ) : (
        <>
          <div className={styles.list}>
            {reservations.map(r => (
              <div key={r.reservationId} className={styles.item}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemNumber}>#{r.reservationNumber}</span>
                  <span className={styles.itemSpace}>{r.spaceName}</span>
                  <span className={styles.itemDateTime}>
                    {r.date} | {r.startTime} ~ {r.endTime}
                  </span>
                </div>
                <div className={styles.itemActions}>
                  <span
                    className={`${styles.statusBadge} ${
                      r.status === 'CONFIRMED' ? styles.confirmed : styles.cancelled
                    }`}
                  >
                    {r.status === 'CONFIRMED' ? '확정' : '취소됨'}
                  </span>
                  {r.status === 'CONFIRMED' && (
                    <>
                      {onEdit && (
                        <Button size="sm" variant="secondary" onClick={() => onEdit(r)}>
                          수정
                        </Button>
                      )}
                      {onCancel && (
                        <Button size="sm" variant="danger" onClick={() => onCancel(r)}>
                          취소
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => setPage(p => p - 1)}
                disabled={page <= 1}
                type="button"
              >
                이전
              </button>
              <span className={styles.pageInfo}>{page} / {totalPages}</span>
              <button
                className={styles.pageBtn}
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages}
                type="button"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
