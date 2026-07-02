'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, Filter, ScanFace } from 'lucide-react';
import { formatDateUz, formatDateISO, formatTime, statusLabel, statusBadge } from '@/lib/utils';

interface AttendanceRow {
  id: string;
  status: string;
  date: string;
  checkInAt: string | null;
  method: string;
  confidence: number | null;
  student: {
    id: string;
    fullName: string;
    photoUrl: string;
    group: { id: string; name: string } | null;
  };
  markedBy: { fullName: string } | null;
}

interface Group {
  id: string;
  name: string;
}

export default function AttendancePage() {
  const today = formatDateISO(new Date());
  const [date, setDate] = useState(today);
  const [groupId, setGroupId] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/groups').then(r => r.json()).then(d => setGroups(d.groups || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ date });
    if (groupId) qs.set('groupId', groupId);
    fetch(`/api/attendance?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => setRows(d.attendance || []))
      .finally(() => setLoading(false));
  }, [date, groupId]);

  const presentCount = rows.filter((r) => r.status === 'PRESENT').length;
  const lateCount    = rows.filter((r) => r.status === 'LATE').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Davomat tarixi</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sana va guruh boʻyicha filtrlangan davomat yozuvlari
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/attendance/scan" className="btn-secondary">
            <ScanFace className="w-4 h-4" /> Skaner
          </Link>
          <a
            href={`/api/attendance/export?from=${date}&to=${date}${groupId ? `&groupId=${groupId}` : ''}`}
            className="btn-primary"
            download
          >
            <Download className="w-4 h-4" /> Excel
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Filter className="w-4 h-4" /> Filtr:
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input sm:max-w-xs"
        />
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="input sm:max-w-xs">
          <option value="">Barcha guruhlar</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>

        <div className="flex-1" />
        <div className="flex items-center gap-3 text-sm">
          <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Keldi: {presentCount}</span>
          <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Kech: {lateCount}</span>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Talaba</th>
              <th className="text-left px-4 py-3 font-medium">Guruh</th>
              <th className="text-left px-4 py-3 font-medium">Sana</th>
              <th className="text-left px-4 py-3 font-medium">Vaqt</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Usul</th>
              <th className="text-left px-4 py-3 font-medium">Aniqlik</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">Yuklanmoqda...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">Yozuvlar topilmadi</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={r.student.photoUrl}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover bg-slate-200"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/uploads/placeholder.png'; }}
                      />
                      <span className="font-medium text-slate-900 dark:text-slate-100">{r.student.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{r.student.group?.name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{formatDateUz(r.date)}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{formatTime(r.checkInAt)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${statusBadge(r.status)}`}>{statusLabel(r.status)}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {r.method === 'face' ? '🎯 Yuz' : '✍️ Qoʻlda'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {r.confidence ? `${(r.confidence * 100).toFixed(0)}%` : '—'}
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
