'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Loader2 } from 'lucide-react';

interface User {
  id: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/me')
      .then(async (r) => {
        if (!r.ok) throw new Error('unauth');
        const d = await r.json();
        if (mounted) setUser(d.user);
      })
      .catch(() => router.replace('/login'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <Sidebar role={user.role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 lg:px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
