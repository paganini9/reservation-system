'use client';

import { AuthProvider } from '@/lib/hooks/useAuth';
import Header from '@/components/ui/Header';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Header />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        {children}
      </main>
    </AuthProvider>
  );
}
