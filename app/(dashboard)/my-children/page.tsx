'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, XCircle, TrendingUp, Calendar, Heart } from 'lucide-react';
import { formatDateUz, formatTime, statusLabel, statusBadge, formatDateISO, methodLabel } from '@/lib/utils';

interface AttendanceRow {
  id: string;
  status: string;
  date: string;
  checkInAt: string | null;
  method: string;
}

interface ChildData {
  id: string;
  fullName: string;
  photoUrl: string;
  group: { id: string; name: string } | null;
  attendance: AttendanceRow[];
  stats: {
    total: number;
    present: number;
    late: number;
    absent: number;
    attendanceRate: number;
  };
}

export default function MyChildrenPage() {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(today.getDate() - 29);

  const [from, setFrom] = useState(formatDateISO(monthAgo));
  const [to, setTo] = useState(formatDateISO(today));
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/my-attendance?from=${from}&to=${to}`)
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.error || 'Xato');
        }
        return r.json();
      })
      .then((d) => {
        setChildren(d.children || []);
        if (d.children?.length) {
          setSelectedChild((prev) => prev || d.children[0].id);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [from, to]);

  if (loading) return <div className="text-center py-16 text-slate-400">Yuklanmoqda...</div>;
  if (error) return (
    <div className="card p-8 text-center">
      <XCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
      <p className="text-rose-600 dark:text-rose-400">{error}</p>
    </div>
  );
  if (children.length === 0) {
    return (
      <div className="card p-16 text-center">
        <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Sizga hech qanday farzand bog'lanmagan</p>
        <p className="text-xs text-slate-400 mt-2">Administrator bilan bog'laning</p>
      </div>
    );
  }

  const selected = children.find((c) => c.id === selectedChild) || children[0];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Farzandlarim</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {children.length} ta farzand davomati
        </p>
      </div>

      {/* Children selector */}
      {children.length > 1 && (
        <div className="card p-4">
          <div className="flex flex-wrap gap-2">
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChild(c.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedChild === c.id
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 ring-2 ring-brand-500'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                <img
                  src={c.photoUrl}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover bg-slate-200"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/uploads/placeholder.png'; }}
                />
                {c.fullName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected child profile */}
      <div className="card p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4">
        <img
          src={selected.photoUrl}
          alt={selected.fullName}
          className="w-20 h-20 rounded-2xl object-cover bg-slate-200"
          onError={(e) => { (e.target as HTMLImageElement).src = '/uploads/placeholder.png'; }}
        />
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{selected.fullName}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sinf: <strong>{selected.group?.name ?? '—'}</strong>
          </p>
        </div>
      </div>

      {/* Date range */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-center">
        <Calendar className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-500">Davr:</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input sm:max-w-xs" />
        <span className="text-slate-400">—</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input sm:max-w-xs" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{selected.stats.present}</div>
              <div className="text-xs text-slate-500">Keldi</div>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{selected.stats.late}</div>
              <div className="text-xs text-slate-500">Kech qoldi</div>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{selected.stats.absent}</div>
              <div className="text-xs text-slate-500">Kelmadi</div>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{selected.stats.attendanceRate}%</div>
              <div className="text-xs text-slate-500">Davomat</div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance table */}
      <div className="table-wrap">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Sana</th>
              <th className="text-left px-4 py-3 font-medium">Vaqt</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Usul</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {selected.attendance.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-slate-400">Yozuvlar topilmadi</td></tr>
            ) : (
              selected.attendance.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">{formatDateUz(r.date)}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{formatTime(r.checkInAt)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${statusBadge(r.status)}`}>{statusLabel(r.status)}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {methodLabel(r.method)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
