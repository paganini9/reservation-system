'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user has a session cookie — simple check
    // The actual auth check happens on the reservations page
    const hasSession = document.cookie.includes('session') || document.cookie.includes('token');
    if (hasSession) {
      router.replace('/reservations');
    }
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
    }}>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: 700,
        color: 'var(--gray-900)',
        marginBottom: 8,
      }}>
        창업공간 예약시스템
      </h1>
      <p style={{
        fontSize: '1rem',
        color: 'var(--gray-500)',
        marginBottom: 32,
        maxWidth: 480,
      }}>
        대구대학교 비호관 3층 창업공간을 온라인으로 예약하세요.
        회의실, 집중업무공간, PC석, 교육실 등 다양한 공간을 이용할 수 있습니다.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link href="/login">
          <Button size="lg">로그인</Button>
        </Link>
        <Link href="/register">
          <Button size="lg" variant="secondary">회원가입</Button>
        </Link>
      </div>
    </div>
  );
}
