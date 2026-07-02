'use client';

import { useCallback, useEffect, useState } from 'react';
import { ScrollText, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditRow {
  id: string;
  action: string;
  actorName: string | null;
  targetId: string | null;
  ip: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Tizimga kirdi',
  'auth.login_failed': 'Kirish muvaffaqiyatsiz',
  'auth.logout': 'Tizimdan chiqdi',
  'auth.password_changed': 'Parolini oʻzgartirdi',
  'student.create': 'Talaba qoʻshdi',
  'student.update': 'Talabani tahrirladi',
  'student.delete': 'Talabani oʻchirdi',
  'student.bulk_import': 'Excel orqali import',
  'student.account_created': 'Talaba akkauntini yaratdi',
  'user.create': 'Foydalanuvchi qoʻshdi',
  'user.update': 'Foydalanuvchini tahrirladi',
  'user.delete': 'Foydalanuvchini oʻchirdi',
  'attendance.manual_mark': 'Qoʻlda davomat belgiladi',
  'attendance.finalize': 'Yoʻqlamani yakunladi',
};

const ACTION_FILTERS = [
  ['', 'Hammasi'],
  ['auth.login', 'Kirishlar'],
  ['auth.login_failed', 'Muvaffaqiyatsiz kirishlar'],
  ['attendance.manual_mark', 'Qoʻlda davomat'],
  ['student.delete', 'Oʻchirishlar'],
] as const;

function actionBadge(action: string) {
  if (action === 'auth.login_failed') return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400';
  if (action.endsWith('.delete')) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
  if (action.startsWith('auth.')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
  return 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400';
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const qs = filter ? `?action=${encodeURIComponent(filter)}` : '';
    const res = await fetch(`/api/audit${qs}`);
    const data = await res.json();
    setLogs(data.logs || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-brand-600" />
            Audit jurnali
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tizimda kim, qachon, nima qilgani — xavfsizlik izi
          </p>
        </div>
        <button onClick={load} className="btn-secondary" disabled={loading}>
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Yangilash
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {ACTION_FILTERS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              filter === value
                ? 'bg-brand-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        </div>
      ) : logs.length === 0 ? (
        <div className="card p-16 text-center text-slate-500">
          Hozircha yozuvlar yoʻq
        </div>
      ) : (
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Vaqt</th>
                <th className="px-4 py-3">Amal</th>
                <th className="px-4 py-3">Kim</th>
                <th className="px-4 py-3 hidden sm:table-cell">IP</th>
                <th className="px-4 py-3 hidden md:table-cell">Tafsilotlar</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                    {new Date(log.createdAt).toLocaleString('uz-UZ', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('badge', actionBadge(log.action))}>
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {log.actorName || '—'}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-slate-500 dark:text-slate-400">
                    {log.ip || '—'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
