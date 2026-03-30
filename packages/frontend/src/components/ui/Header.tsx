'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import styles from './Header.module.css';

export default function Header() {
  const { user, logout, isLoading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // 로그아웃 실패 시 무시 (이미 세션 만료 등)
    }
  };

  return (
    <header className={styles.header}>
      <Link href="/reservations" className={styles.logo}>
        창업공간 예약
      </Link>

      <nav className={styles.nav}>
        {isLoading ? null : user ? (
          <>
            <Link href="/reservations" className={styles.navLink}>
              예약하기
            </Link>
            <Link href="/profile" className={styles.navLink}>
              내 정보
            </Link>
            {user.role === 'ADMIN' && (
              <Link href="/admin/dashboard" className={styles.navLink}>
                관리
              </Link>
            )}
            <span className={styles.userName}>{user.name}님</span>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              로그아웃
            </button>
          </>
        ) : (
          <Link href="/login" className={styles.navLink}>
            로그인
          </Link>
        )}
      </nav>
    </header>
  );
}
