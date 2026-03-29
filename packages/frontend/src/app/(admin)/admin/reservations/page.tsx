'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api/admin.api';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import styles from './page.module.css';

interface AdminReservation {
  reservationId: string;
  reservationNumber: string;
  userName: string;
  userEmail: string;
  spaceName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [filterDate, setFilterDate] = useState('');
  const [filterSpace, setFilterSpace] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const [cancelModal, setCancelModal] = useState<AdminReservation | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (filterDate) params.date = filterDate;
      if (filterSpace) params.space = filterSpace;
      if (filterUser) params.user = filterUser;
      const data = await adminApi.getReservations(params);
      setReservations((data as any).items ?? []);
      setTotal((data as any).total ?? 0);
    } catch {
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterDate, filterSpace, filterUser]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleForceCancel = async () => {
    if (!cancelModal || !cancelReason.trim()) return;
    setCancelLoading(true);
    try {
      await adminApi.cancelReservation(cancelModal.reservationId, cancelReason);
      setMessage({ type: 'success', text: `예약 #${cancelModal.reservationNumber} 이 취소되었습니다.` });
      setCancelModal(null);
      setCancelReason('');
      fetchReservations();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '취소에 실패했습니다.' });
    } finally {
      setCancelLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>예약 관리</h1>

      {message && (
        <Alert type={message.type}>{message.text}</Alert>
      )}

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>날짜</label>
          <input
            type="date"
            className={styles.filterInput}
            value={filterDate}
            onChange={e => { setFilterDate(e.target.value); setPage(1); }}
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>공간</label>
          <input
            type="text"
            className={styles.filterInput}
            placeholder="공간명"
            value={filterSpace}
            onChange={e => { setFilterSpace(e.target.value); setPage(1); }}
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>사용자</label>
          <input
            type="text"
            className={styles.filterInput}
            placeholder="이름 또는 이메일"
            value={filterUser}
            onChange={e => { setFilterUser(e.target.value); setPage(1); }}
          />
        </div>
        <Button size="sm" variant="secondary" onClick={() => { setFilterDate(''); setFilterSpace(''); setFilterUser(''); setPage(1); }}>
          초기화
        </Button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>예약번호</th>
              <th>사용자</th>
              <th>공간</th>
              <th>날짜</th>
              <th>시간</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className={styles.emptyRow}>로딩 중...</td></tr>
            ) : reservations.length === 0 ? (
              <tr><td colSpan={7} className={styles.emptyRow}>예약이 없습니다.</td></tr>
            ) : (
              reservations.map(r => (
                <tr key={r.reservationId}>
                  <td>#{r.reservationNumber}</td>
                  <td>{r.userName}<br /><span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{r.userEmail}</span></td>
                  <td>{r.spaceName}</td>
                  <td>{r.date}</td>
                  <td>{r.startTime} ~ {r.endTime}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${r.status === 'CONFIRMED' ? styles.confirmed : styles.cancelled}`}>
                      {r.status === 'CONFIRMED' ? '확정' : '취소'}
                    </span>
                  </td>
                  <td>
                    {r.status === 'CONFIRMED' && (
                      <div className={styles.actions}>
                        <Button size="sm" variant="danger" onClick={() => { setCancelModal(r); setCancelReason(''); }}>
                          강제 취소
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button className={styles.pageBtn} onClick={() => setPage(p => p - 1)} disabled={page <= 1} type="button">이전</button>
            <span className={styles.pageInfo}>{page} / {totalPages}</span>
            <button className={styles.pageBtn} onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} type="button">다음</button>
          </div>
        )}
      </div>

      {cancelModal && (
        <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) setCancelModal(null); }}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>예약 강제 취소</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--gray-700)', marginBottom: 12 }}>
              예약 #{cancelModal.reservationNumber} ({cancelModal.spaceName}, {cancelModal.date})을 취소합니다.
            </p>
            <textarea
              className={styles.reasonInput}
              placeholder="취소 사유를 입력하세요"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
            />
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setCancelModal(null)} disabled={cancelLoading}>돌아가기</Button>
              <Button variant="danger" onClick={handleForceCancel} loading={cancelLoading} disabled={!cancelReason.trim()}>
                취소 확인
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
