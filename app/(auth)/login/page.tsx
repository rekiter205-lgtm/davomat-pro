'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Eye, EyeOff, GraduationCap, Loader2 } from 'lucide-react';

// Demo rejimida login forma oldindan to'ldirilgan bo'ladi (faqat prezentatsiya uchun)
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_CREDENTIALS === '1';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';

  const [username, setUsername] = useState(DEMO_MODE ? 'admin' : '');
  const [password, setPassword] = useState(DEMO_MODE ? 'admin123' : '');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Kirishda xato');
        return;
      }
      toast.success(`Xush kelibsiz, ${data.user.fullName}!`);
      // Redirect by role
      let redirectTo = next;
      if (next === '/dashboard') {
        if (data.user.role === 'STUDENT') redirectTo = '/my-attendance';
        else if (data.user.role === 'PARENT') redirectTo = '/my-children';
        else if (data.user.role === 'TEACHER') redirectTo = '/today';
      }
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error('Tarmoq xatosi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Foydalanuvchi nomi
        </label>
        <input
          type="text"
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Parol
        </label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            className="input pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            tabIndex={-1}
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Kirilmoqda...' : 'Tizimga kirish'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/30 mb-4">
            <GraduationCap className="w-9 h-9 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Davomat Pro</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            AI yordamida davomat va taʼlim boshqaruvi
          </p>
        </div>

        {/* Form card */}
        <div className="card p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/30">
          <Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>}>
            <LoginForm />
          </Suspense>

          {DEMO_MODE && (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                <strong>Demo:</strong> admin / admin123
                <br />
                Yoki: aliyev / teacher123
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          © {new Date().getFullYear()} Davomat Pro. Barcha huquqlar himoyalangan.
        </p>
      </div>
    </div>
  );
}
