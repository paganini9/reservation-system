import { redirect } from 'next/navigation';

// 루트 접근 시 예약 페이지로 리다이렉트
export default function HomePage() {
  redirect('/reservations');
}
