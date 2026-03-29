'use client';

import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth.api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import styles from './page.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('이메일을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || '요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className={styles.title}>비밀번호 재설정</h1>
      <p className={styles.description}>
        가입 시 사용한 이메일을 입력하면 임시 비밀번호를 보내드립니다.
      </p>

      {success && (
        <Alert type="success">임시 비밀번호가 이메일로 발송되었습니다. 메일을 확인해주세요.</Alert>
      )}

      {error && <Alert type="error">{error}</Alert>}

      {!success && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <Input
            label="이메일"
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button type="submit" loading={loading} fullWidth>
            임시 비밀번호 발송
          </Button>
        </form>
      )}

      <div className={styles.links}>
        <Link href="/login">로그인으로 돌아가기</Link>
      </div>
    </>
  );
}
