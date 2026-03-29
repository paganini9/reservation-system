'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api/admin.api';

interface DashboardData {
  todayReservations: number;
  pendingClubs: number;
  suspendedUsers: number;
  recentReservations: any[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData>({
    todayReservations: 0,
    pendingClubs: 0,
    suspendedUsers: 0,
    recentReservations: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];

        const [reservationsRes, clubsRes, usersRes] = await Promise.allSettled([
          adminApi.getReservations({ date: today, limit: 100 }),
          adminApi.getStartupClubs(),
          adminApi.getUsers({ suspended: 'true' }),
        ]);

        const reservations = reservationsRes.status === 'fulfilled' ? reservationsRes.value : { items: [] };
        const clubs = clubsRes.status === 'fulfilled' ? clubsRes.value : { items: [] };
        const users = usersRes.status === 'fulfilled' ? usersRes.value : { items: [] };

        // Get recent 5 reservations
        let recentRes: any = { items: [] };
        try {
          recentRes = await adminApi.getReservations({ limit: 5, sort: 'createdAt', order: 'desc' });
        } catch { /* ignore */ }

        setData({
          todayReservations: (reservations as any).items?.length ?? 0,
          pendingClubs: (clubs as any).items?.filter?.((c: any) => c.status === 'PENDING')?.length ?? (clubs as any).length ?? 0,
          suspendedUsers: (users as any).items?.length ?? 0,
          recentReservations: (recentRes as any).items ?? [],
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--gray-500)' }}>로딩 중...</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: 24 }}>
        관리자 대시보드
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        <StatCard label="오늘 예약" value={data.todayReservations} color="var(--primary)" />
        <StatCard label="승인 대기 동아리" value={data.pendingClubs} color="var(--warning)" />
        <StatCard label="정지 사용자" value={data.suspendedUsers} color="var(--danger)" />
      </div>

      <div style={{
        background: '#fff',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        padding: 20,
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 16 }}>최근 예약 (최신 5건)</h2>
        {data.recentReservations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--gray-500)', fontSize: '0.875rem' }}>
            최근 예약이 없습니다.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--gray-500)', fontWeight: 500 }}>예약번호</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--gray-500)', fontWeight: 500 }}>공간</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--gray-500)', fontWeight: 500 }}>날짜</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--gray-500)', fontWeight: 500 }}>시간</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--gray-500)', fontWeight: 500 }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {data.recentReservations.map((r: any, i: number) => (
                <tr key={r.reservationId ?? i} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <td style={{ padding: '8px 12px' }}>#{r.reservationNumber ?? '-'}</td>
                  <td style={{ padding: '8px 12px' }}>{r.spaceName ?? '-'}</td>
                  <td style={{ padding: '8px 12px' }}>{r.date ?? '-'}</td>
                  <td style={{ padding: '8px 12px' }}>{r.startTime ?? '-'} ~ {r.endTime ?? '-'}</td>
                  <td style={{ padding: '8px 12px' }}>{r.status === 'CONFIRMED' ? '확정' : r.status === 'CANCELLED' ? '취소' : r.status ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow)',
      padding: 20,
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
