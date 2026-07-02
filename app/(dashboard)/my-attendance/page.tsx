'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, XCircle, TrendingUp, Calendar } from 'lucide-react';
import { formatDateUz, formatTime, statusLabel, statusBadge, formatDateISO } from '@/lib/utils';

interface AttendanceRow {
  id: string;
  status: string;
  date: string;
  checkInAt: string | null;
  method: string;
  confidence: number | null;
}

interface Stats {
  total: number;
  present: number;
  late: number;
  absent: number;
  attendanceRate: number;
}

interface StudentInfo {
  id: string;
  fullName: string;
  photoUrl: string;
  group: { id: string; name: string } | null;
}

export default function MyAttendancePage() {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(today.getDate() - 29);

  const [from, setFrom] = useState(formatDateISO(monthAgo));
  const [to, setTo] = useState(formatDateISO(today));
  const [data, setData] = useState<{
    student: StudentInfo;
    attendance: AttendanceRow[];
    stats: Stats;
  } | null>(null);
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
      .then((d) => setData(d))
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
  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile header */}
      <div className="card p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4">
        <img
          src={data.student.photoUrl}
          alt={data.student.fullName}
          className="w-20 h-20 rounded-2xl object-cover bg-slate-200"
          onError={(e) => { (e.target as HTMLImageElement).src = '/uploads/placeholder.png'; }}
        />
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">{data.student.fullName}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sinf: <strong>{data.student.group?.name ?? '—'}</strong>
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

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{data.stats.present}</div>
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
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{data.stats.late}</div>
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
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{data.stats.absent}</div>
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
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{data.stats.attendanceRate}%</div>
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
            {data.attendance.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-slate-400">Yozuvlar topilmadi</td></tr>
            ) : (
              data.attendance.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">{formatDateUz(r.date)}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{formatTime(r.checkInAt)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${statusBadge(r.status)}`}>{statusLabel(r.status)}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {r.method === 'face' ? '🎯 Yuz' : '✍️ Qoʻlda'}
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
