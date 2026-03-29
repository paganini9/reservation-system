'use client';

import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth.api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import type { StudentType } from '@reservation/shared';
import styles from './page.module.css';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'GENERAL'>('STUDENT');
  const [university, setUniversity] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentType, setStudentType] = useState<StudentType>('NORMAL');
  const [clubName, setClubName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !passwordConfirm) {
      setError('모든 필수 항목을 입력해주세요.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (role === 'STUDENT' && (!university || !studentId)) {
      setError('학생은 대학명과 학번을 입력해야 합니다.');
      return;
    }

    if (role === 'STUDENT' && studentType === 'STARTUP_CLUB' && !clubName) {
      setError('창업동아리 학생은 동아리명을 입력해야 합니다.');
      return;
    }

    setLoading(true);
    try {
      if (role === 'STUDENT') {
        await authApi.register({
          name,
          email,
          password,
          role: 'STUDENT',
          university,
          studentId,
          studentType,
          clubName: studentType === 'STARTUP_CLUB' ? clubName : undefined,
        });
      } else {
        await authApi.register({ name, email, password, role: 'GENERAL' });
      }
      setSuccess(true);
    } catch (err: any) {
      const code = err.code as string | undefined;
      if (code === 'DUPLICATE_EMAIL') {
        setError('이미 등록된 이메일입니다.');
      } else {
        setError(err.message || '회원가입에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.successContainer}>
        <Alert type="success">인증 이메일이 발송되었습니다.</Alert>
        <h2 style={{ marginTop: 16 }}>회원가입 완료</h2>
        <p>입력하신 이메일로 인증 메일이 발송되었습니다. 이메일을 확인하고 인증을 완료해주세요.</p>
        <Link href="/login">
          <Button variant="primary">로그인 페이지로 이동</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className={styles.title}>회원가입</h1>

      {error && <Alert type="error">{error}</Alert>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          label="이름"
          placeholder="홍길동"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

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
          placeholder="8자 이상 입력하세요"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Input
          label="비밀번호 확인"
          type="password"
          placeholder="비밀번호를 다시 입력하세요"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          required
        />

        <fieldset className={styles.fieldset}>
          <span className={styles.groupLabel}>역할</span>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="role"
                value="STUDENT"
                checked={role === 'STUDENT'}
                onChange={() => setRole('STUDENT')}
              />
              학생
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="role"
                value="GENERAL"
                checked={role === 'GENERAL'}
                onChange={() => setRole('GENERAL')}
              />
              일반인
            </label>
          </div>
        </fieldset>

        {role === 'STUDENT' && (
          <>
            <Input
              label="대학명"
              placeholder="대구대학교"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              required
            />

            <Input
              label="학번"
              placeholder="20240001"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
            />

            <fieldset className={styles.fieldset}>
              <span className={styles.groupLabel}>학생 유형</span>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="studentType"
                    value="NORMAL"
                    checked={studentType === 'NORMAL'}
                    onChange={() => setStudentType('NORMAL')}
                  />
                  일반 학생
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="studentType"
                    value="STARTUP_CLUB"
                    checked={studentType === 'STARTUP_CLUB'}
                    onChange={() => setStudentType('STARTUP_CLUB')}
                  />
                  창업동아리
                </label>
              </div>
            </fieldset>

            {studentType === 'STARTUP_CLUB' && (
              <Input
                label="동아리명"
                placeholder="동아리명을 입력하세요"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                required
              />
            )}
          </>
        )}

        <Button type="submit" loading={loading} fullWidth>
          가입하기
        </Button>
      </form>

      <div className={styles.links}>
        이미 계정이 있으신가요? <Link href="/login">로그인</Link>
      </div>
    </>
  );
}
