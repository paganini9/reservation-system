'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api/admin.api';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import styles from './page.module.css';

interface UnavailableDate {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export default function AdminSchedulePage() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [dates, setDates] = useState<UnavailableDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add form
  const [showForm, setShowForm] = useState(false);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Edit modal
  const [editItem, setEditItem] = useState<UnavailableDate | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const fetchDates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getUnavailableDates(year);
      setDates((data as any).items ?? (data as any) ?? []);
    } catch {
      setDates([]);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchDates();
  }, [fetchDates]);

  const handleAdd = async () => {
    if (!formStartDate || !formEndDate || !formReason.trim()) return;
    setFormLoading(true);
    try {
      await adminApi.createUnavailableDate({
        startDate: formStartDate,
        endDate: formEndDate,
        reason: formReason,
      });
      setMessage({ type: 'success', text: '운영 불가일이 등록되었습니다.' });
      setShowForm(false);
      setFormStartDate('');
      setFormEndDate('');
      setFormReason('');
      fetchDates();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '등록에 실패했습니다.' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editItem || !editStartDate || !editEndDate || !editReason.trim()) return;
    setEditLoading(true);
    try {
      await adminApi.updateUnavailableDate(editItem.id, {
        startDate: editStartDate,
        endDate: editEndDate,
        reason: editReason,
      });
      setMessage({ type: 'success', text: '운영 불가일이 수정되었습니다.' });
      setEditItem(null);
      fetchDates();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '수정에 실패했습니다.' });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await adminApi.deleteUnavailableDate(id);
      setMessage({ type: 'success', text: '삭제되었습니다.' });
      fetchDates();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '삭제에 실패했습니다.' });
    }
  };

  const openEditModal = (item: UnavailableDate) => {
    setEditItem(item);
    setEditStartDate(item.startDate);
    setEditEndDate(item.endDate);
    setEditReason(item.reason);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>운영 불가일 관리</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? '취소' : '새로 등록'}
        </Button>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      <div className={styles.yearSelector}>
        <button className={styles.yearBtn} onClick={() => setYear(y => y - 1)} type="button">&larr;</button>
        <span className={styles.yearLabel}>{year}년</span>
        <button className={styles.yearBtn} onClick={() => setYear(y => y + 1)} type="button">&rarr;</button>
      </div>

      {showForm && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>운영 불가일 등록</h2>
          <div className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>시작일</label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={formStartDate}
                  onChange={e => setFormStartDate(e.target.value)}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>종료일</label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={formEndDate}
                  onChange={e => setFormEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>사유</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="운영 불가 사유"
                value={formReason}
                onChange={e => setFormReason(e.target.value)}
              />
            </div>
            <div className={styles.formActions}>
              <Button variant="secondary" onClick={() => setShowForm(false)}>취소</Button>
              <Button onClick={handleAdd} loading={formLoading} disabled={!formStartDate || !formEndDate || !formReason.trim()}>
                등록
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>운영 불가일 목록</h2>
        {loading ? (
          <div className={styles.emptyMessage}>로딩 중...</div>
        ) : dates.length === 0 ? (
          <div className={styles.emptyMessage}>{year}년에 등록된 운영 불가일이 없습니다.</div>
        ) : (
          <div className={styles.list}>
            {dates.map(item => (
              <div key={item.id} className={styles.item}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemDates}>{item.startDate} ~ {item.endDate}</span>
                  <span className={styles.itemReason}>{item.reason}</span>
                </div>
                <div className={styles.itemActions}>
                  <Button size="sm" variant="secondary" onClick={() => openEditModal(item)}>수정</Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)}>삭제</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setEditItem(null); }}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>운영 불가일 수정</h3>
            <div className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>시작일</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={editStartDate}
                    onChange={e => setEditStartDate(e.target.value)}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>종료일</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={editEndDate}
                    onChange={e => setEditEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>사유</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setEditItem(null)} disabled={editLoading}>취소</Button>
              <Button onClick={handleEdit} loading={editLoading} disabled={!editStartDate || !editEndDate || !editReason.trim()}>
                수정 확인
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
