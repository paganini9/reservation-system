'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/hooks/useAuth';
import Header from '@/components/ui/Header';
import styles from './layout.module.css';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: '대시보드' },
  { href: '/admin/reservations', label: '예약 관리' },
  { href: '/admin/users', label: '사용자 관리' },
  { href: '/admin/schedule', label: '운영 불가일' },
];

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return <div className={styles.loadingContainer}>로딩 중...</div>;
  }

  if (!user || user.role !== 'ADMIN') {
    router.push('/reservations');
    return <div className={styles.loadingContainer}>권한이 없습니다. 리다이렉트 중...</div>;
  }

  return <>{children}</>;
}

function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>관리자</div>
      <nav className={styles.sidebarNav}>
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.sidebarLink} ${
              pathname === item.href ? styles.sidebarLinkActive : ''
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className={styles.sidebarBack}>
        <Link href="/reservations">← 사용자 화면으로</Link>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className={styles.wrapper}>
        <AdminSidebar />
        <div className={styles.main}>
          <Header />
          <AdminGuard>
            <div className={styles.content}>{children}</div>
          </AdminGuard>
        </div>
      </div>
    </AuthProvider>
  );
}
