import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '창업공간 예약시스템 — 대구대학교 비호관 3층',
  description: '대구대학교 비호관 3층 창업공간 예약 시스템',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
