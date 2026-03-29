'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { reservationApi } from '@/lib/api/reservation.api';
import type { Reservation, Space } from '@reservation/shared';
import Calendar from '@/components/calendar/Calendar';
import SpaceSelector from '@/components/reservation/SpaceSelector';
import TimeSlotGrid from '@/components/reservation/TimeSlotGrid';
import ReservationList from '@/components/reservation/ReservationList';
import ReservationModal from '@/components/reservation/ReservationModal';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import styles from './page.module.css';

type ModalState =
  | { type: 'create'; spaceId: string; spaceName: string; date: string; startTime: string; endTime: string }
  | { type: 'cancel'; reservation: Reservation }
  | { type: 'edit'; reservation: Reservation; spaceId: string; spaceName: string; date: string; startTime: string; endTime: string }
  | null;

export default function ReservationsPage() {
  const { user, isLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    reservationApi.getSpaces()
      .then(data => setSpaces(data.spaces))
      .catch(() => {});
  }, []);

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedSpaceId(null);
    setSelectedSlot(null);
    setSuccessMsg('');
  }, []);

  const handleSpaceSelect = useCallback((spaceId: string) => {
    setSelectedSpaceId(spaceId);
    setSelectedSlot(null);
  }, []);

  const handleSlotSelect = useCallback((slot: { startTime: string; endTime: string }) => {
    setSelectedSlot(slot);
  }, []);

  const spaceName = spaces.find(s => s.spaceId === selectedSpaceId)?.name ?? '';

  const handleBookClick = () => {
    if (!selectedDate || !selectedSpaceId || !selectedSlot) return;
    setModal({
      type: 'create',
      spaceId: selectedSpaceId,
      spaceName,
      date: selectedDate,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
    });
  };

  const handleSuccess = () => {
    setModal(null);
    setSelectedSlot(null);
    setRefreshKey(k => k + 1);
    setSuccessMsg('예약이 완료되었습니다!');
  };

  const handleCancelSuccess = () => {
    setModal(null);
    setRefreshKey(k => k + 1);
    setSuccessMsg('예약이 취소되었습니다.');
  };

  const handleEditReservation = (r: Reservation) => {
    // Start edit flow: prefill with existing reservation data
    setSelectedDate(r.date);
    setSelectedSpaceId(r.spaceId);
    setSelectedSlot({ startTime: r.startTime, endTime: r.endTime });
    setModal({
      type: 'edit',
      reservation: r,
      spaceId: r.spaceId,
      spaceName: r.spaceName,
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
    });
  };

  const handleCancelReservation = (r: Reservation) => {
    setModal({ type: 'cancel', reservation: r });
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--gray-500)' }}>로딩 중...</div>;
  }

  if (!user) {
    return <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--gray-500)' }}>로그인이 필요합니다.</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>공간 예약</h1>

      {successMsg && (
        <Alert type="success">{successMsg}</Alert>
      )}

      <div className={styles.bookingSection}>
        <Calendar selectedDate={selectedDate} onSelectDate={handleDateSelect} />

        <div className={styles.selectionRow}>
          <SpaceSelector
            selectedDate={selectedDate}
            selectedSpaceId={selectedSpaceId}
            onSelectSpace={handleSpaceSelect}
          />
          <TimeSlotGrid
            selectedDate={selectedDate}
            selectedSpaceId={selectedSpaceId}
            selectedSlot={selectedSlot}
            onSelectSlot={handleSlotSelect}
          />
        </div>

        {selectedDate && selectedSpaceId && selectedSlot && (
          <div className={styles.submitRow}>
            <Button size="lg" onClick={handleBookClick}>
              예약하기
            </Button>
          </div>
        )}
      </div>

      <hr className={styles.divider} />

      <ReservationList
        onEdit={handleEditReservation}
        onCancel={handleCancelReservation}
        refreshKey={refreshKey}
      />

      {modal?.type === 'create' && (
        <ReservationModal
          mode="create"
          spaceId={modal.spaceId}
          spaceName={modal.spaceName}
          date={modal.date}
          startTime={modal.startTime}
          endTime={modal.endTime}
          onClose={() => setModal(null)}
          onSuccess={handleSuccess}
        />
      )}

      {modal?.type === 'cancel' && (
        <ReservationModal
          mode="cancel"
          reservation={modal.reservation}
          onClose={() => setModal(null)}
          onSuccess={handleCancelSuccess}
        />
      )}

      {modal?.type === 'edit' && (
        <ReservationModal
          mode="edit"
          reservation={modal.reservation}
          spaceId={modal.spaceId}
          spaceName={modal.spaceName}
          date={modal.date}
          startTime={modal.startTime}
          endTime={modal.endTime}
          onClose={() => setModal(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
