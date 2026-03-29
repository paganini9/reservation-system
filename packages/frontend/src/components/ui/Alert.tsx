'use client';

import React from 'react';
import styles from './Alert.module.css';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  children: React.ReactNode;
}

export default function Alert({ type, children }: AlertProps) {
  return (
    <div className={`${styles.alert} ${styles[type]}`} role="alert">
      {children}
    </div>
  );
}
