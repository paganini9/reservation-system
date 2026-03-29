'use client';

import React, { useState } from 'react';
import { reservationApi } from '@/lib/api/reservation.api';
import type { Reservation } from '@reservation/shared';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import styles from './ReservationModal.module.css';

interface CreateModalProps {
  mode: 'create';
  reservation?: undefined;
  spaceId: string;
  spaceName: string;
  date: string;
  startTime: string;
  endTime: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface CancelModalProps {
  mode: 'cancel';
  reservation: Reservation;
  spaceId?: undefined;
  spaceName?: undefined;
  date?: undefined;
  startTime?: undefined;
  endTime?: undefined;
  onClose: () => void;
  onSuccess: () => void;
}

interface EditModalProps {
  mode: 'edit';
  reservation: Reservation;
  spaceId: string;
  spaceName: string;
  date: string;
  startTime: string;
  endTime: string;
  onClose: () => void;
  onSuccess: () => void;
}

type ReservationModalProps = CreateModalProps | CancelModalProps | EditModalProps;

function isToday(dateStr: string) {
  const today = new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return today.getFullYear() === y && today.getMonth() + 1 === m && today.getDate() === d;
}

export default function ReservationModal(props: ReservationModalProps) {
  const { mode, onClose, onSuccess } = props;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (mode !== 'create') return;
    setLoading(true);
    setError('');
    try {
      await reservationApi.create({
        spaceId: props.spaceId,
        date: props.date,
        startTime: props.startTime,
        endTime: props.endTime,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || '예약에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (mode !== 'edit' || !props.reservation) return;
    setLoading(true);
    setError('');
    try {
      await reservationApi.update(props.reservation.reservationId, {
        spaceId: props.spaceId,
        date: props.date,
        startTime: props.startTime,
        endTime: props.endTime,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || '예약 수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (mode !== 'cancel' || !props.reservation) return;
    setLoading(true);
    setError('');
    try {
      const result = await reservationApi.cancel(props.reservation.reservationId);
      if (result.penaltyApplied) {
        // Show penalty info briefly, then close
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || '예약 취소에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        {mode === 'create' && (
          <>
            <h3 className={styles.modalTitle}>예약 확인</h3>
            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>공간</span>
                <span className={styles.summaryValue}>{props.spaceName}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>날짜</span>
                <span className={styles.summaryValue}>{props.date}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>시간</span>
                <span className={styles.summaryValue}>{props.startTime} ~ {props.endTime}</span>
              </div>
            </div>
            {error && <div style={{ marginBottom: 12 }}><Alert type="error">{error}</Alert></div>}
            <div className={styles.actions}>
              <Button variant="secondary" onClick={onClose} disabled={loading}>취소</Button>
              <Button onClick={handleCreate} loading={loading}>예약하기</Button>
            </div>
          </>
        )}

        {mode === 'edit' && (
          <>
            <h3 className={styles.modalTitle}>예약 수정</h3>
            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>예약번호</span>
                <span className={styles.summaryValue}>#{props.reservation?.reservationNumber}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>공간</span>
                <span className={styles.summaryValue}>{props.spaceName}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>날짜</span>
                <span className={styles.summaryValue}>{props.date}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>시간</span>
                <span className={styles.summaryValue}>{props.startTime} ~ {props.endTime}</span>
              </div>
            </div>
            {error && <div style={{ marginBottom: 12 }}><Alert type="error">{error}</Alert></div>}
            <div className={styles.actions}>
              <Button variant="secondary" onClick={onClose} disabled={loading}>돌아가기</Button>
              <Button onClick={handleEdit} loading={loading}>수정 확인</Button>
            </div>
          </>
        )}

        {mode === 'cancel' && props.reservation && (
          <>
            <h3 className={styles.modalTitle}>예약 취소</h3>
            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>예약번호</span>
                <span className={styles.summaryValue}>#{props.reservation.reservationNumber}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>공간</span>
                <span className={styles.summaryValue}>{props.reservation.spaceName}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>날짜</span>
                <span className={styles.summaryValue}>{props.reservation.date}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>시간</span>
                <span className={styles.summaryValue}>
                  {props.reservation.startTime} ~ {props.reservation.endTime}
                </span>
              </div>
            </div>
            {isToday(props.reservation.date) && (
              <div className={styles.warning}>
                당일 취소 시 패널티가 부과될 수 있습니다. 정말 취소하시겠습니까?
              </div>
            )}
            {error && <div style={{ marginBottom: 12 }}><Alert type="error">{error}</Alert></div>}
            <div className={styles.actions}>
              <Button variant="secondary" onClick={onClose} disabled={loading}>돌아가기</Button>
              <Button variant="danger" onClick={handleCancel} loading={loading}>취소하기</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
