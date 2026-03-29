'use client';

import React, { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { authApi } from '@/lib/api/auth.api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import styles from './page.module.css';

function roleLabel(role: string) {
  switch (role) {
    case 'STUDENT':
      return '학생';
    case 'GENERAL':
      return '일반인';
    case 'ADMIN':
      return '관리자';
    default:
      return role;
  }
}

function studentTypeLabel(type?: string) {
  switch (type) {
    case 'NORMAL':
      return '일반 학생';
    case 'STARTUP_CLUB':
      return '창업동아리';
    default:
      return '-';
  }
}

export default function ProfilePage() {
  const { user, isLoading, refreshUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (!currentPassword || !newPassword) {
      setPwError('모든 항목을 입력해주세요.');
      return;
    }

    if (newPassword.length < 8) {
      setPwError('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setPwLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPwSuccess('비밀번호가 변경되었습니다.');
      setCurrentPassword('');
      setNewPassword('');
      await refreshUser();
    } catch (err: any) {
      setPwError(err.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setPwLoading(false);
    }
  };

  if (isLoading) {
    return <div className={styles.loadingContainer}>로딩 중...</div>;
  }

  if (!user) {
    return <div className={styles.loadingContainer}>사용자 정보를 불러올 수 없습니다.</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>내 정보</h2>
        <div className={styles.infoGrid}>
          <span className={styles.infoLabel}>이름</span>
          <span className={styles.infoValue}>{user.name}</span>

          <span className={styles.infoLabel}>이메일</span>
          <span className={styles.infoValue}>{user.email}</span>

          <span className={styles.infoLabel}>역할</span>
          <span className={styles.infoValue}>{roleLabel(user.role)}</span>

          {user.role === 'STUDENT' && (
            <>
              <span className={styles.infoLabel}>대학</span>
              <span className={styles.infoValue}>{user.university || '-'}</span>

              <span className={styles.infoLabel}>학번</span>
              <span className={styles.infoValue}>{user.studentId || '-'}</span>

              <span className={styles.infoLabel}>학생 유형</span>
              <span className={styles.infoValue}>{studentTypeLabel(user.studentType)}</span>

              {user.studentType === 'STARTUP_CLUB' && (
                <>
                  <span className={styles.infoLabel}>동아리명</span>
                  <span className={styles.infoValue}>{user.clubName || '-'}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* 패널티 현황 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>패널티 현황</h2>
        <div className={styles.penaltySection}>
          <div className={styles.penaltyRow}>
            <span className={styles.penaltyLabel}>패널티 점수</span>
            <span className={styles.penaltyValue}>{user.penaltyScore}점</span>
          </div>
          <div className={styles.penaltyRow}>
            <span className={styles.penaltyLabel}>계정 상태</span>
            <span
              className={`${styles.penaltyValue} ${user.isSuspended ? styles.suspended : styles.active}`}
            >
              {user.isSuspended ? '정지됨' : '정상'}
            </span>
          </div>
          {user.isSuspended && user.suspendedUntil && (
            <div className={styles.penaltyRow}>
              <span className={styles.penaltyLabel}>정지 해제일</span>
              <span className={styles.penaltyValue}>
                {new Date(user.suspendedUntil).toLocaleDateString('ko-KR')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 비밀번호 변경 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>비밀번호 변경</h2>

        {user.isTempPassword && (
          <div style={{ marginBottom: 16 }}>
            <Alert type="warning">
              임시 비밀번호를 사용 중입니다. 새 비밀번호로 변경해주세요.
            </Alert>
          </div>
        )}

        {pwSuccess && (
          <div style={{ marginBottom: 16 }}>
            <Alert type="success">{pwSuccess}</Alert>
          </div>
        )}
        {pwError && (
          <div style={{ marginBottom: 16 }}>
            <Alert type="error">{pwError}</Alert>
          </div>
        )}

        <form className={styles.passwordForm} onSubmit={handleChangePassword}>
          <Input
            label="현재 비밀번호"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="새 비밀번호"
            type="password"
            placeholder="8자 이상 입력하세요"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Button type="submit" loading={pwLoading}>
            비밀번호 변경
          </Button>
        </form>
      </div>
    </div>
  );
}
