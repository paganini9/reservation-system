'use client';

import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth.api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTempPassword, setIsTempPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      if (res.isTempPassword) {
        setIsTempPassword(true);
      }
      router.push('/reservations');
    } catch (err: any) {
      const code = err.code as string | undefined;
      if (code === 'EMAIL_NOT_VERIFIED') {
        setError('이메일 인증이 완료되지 않았습니다. 메일을 확인해주세요.');
      } else if (code === 'INVALID_CREDENTIALS') {
        setError('이메일 또는 비밀번호가 일치하지 않습니다.');
      } else if (code === 'ACCOUNT_SUSPENDED') {
        setError('계정이 정지된 상태입니다. 관리자에게 문의하세요.');
      } else {
        setError(err.message || '로그인에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className={styles.title}>로그인</h1>

      {isTempPassword && (
        <Alert type="warning">
          임시 비밀번호로 로그인되었습니다. 내 정보에서 비밀번호를 변경해주세요.
        </Alert>
      )}

      {error && <Alert type="error">{error}</Alert>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          label="이메일"
          type="email"
          placeholder="example@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="비밀번호"
          type="password"
          placeholder="비밀번호를 입력하세요"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button type="submit" loading={loading} fullWidth>
          로그인
        </Button>
      </form>

      <div className={styles.links}>
        <Link href="/register">회원가입</Link>
        <Link href="/forgot-password">비밀번호 찾기</Link>
      </div>
    </>
  );
}
