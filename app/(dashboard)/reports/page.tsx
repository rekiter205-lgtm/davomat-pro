'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, FileBarChart, Calendar } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { formatDateISO, statusLabel } from '@/lib/utils';
import { useDefaultRange } from '@/lib/use-attendance-range';

interface AttendanceRow {
  id: string;
  status: string;
  date: string;
  student: { fullName: string; group: { id: string; name: string } | null };
}

interface Group { id: string; name: string }

const STATUS_COLORS: Record<string, string> = {
  PRESENT: '#10b981',
  LATE: '#f59e0b',
  ABSENT: '#f43f5e',
};

/** URL'dan kelgan sana faqat `YYYY-MM-DD` ko'rinishida qabul qilinadi. */
function dateParam(v: string | null, fallback: string): string {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fallback;
}

function ReportsPageInner() {
  const router = useRouter();
  const params = useSearchParams();

  const defaultRange = useDefaultRange();

  // Filtrlar URL'da — hisobotni havola bilan ulashish va sahifani
  // yangilaganda oraliqni qaytadan terib o'tirmaslik uchun.
  // URL'da sana bo'lmasa — standart oraliq (ma'lumot bor davr) qo'yiladi.
  const [from, setFrom] = useState(() => dateParam(params.get('from'), ''));
  const [to, setTo] = useState(() => dateParam(params.get('to'), ''));
  const [groupId, setGroupId] = useState(() => params.get('groupId') || '');
  const [groups, setGroups] = useState<Group[]>([]);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/groups').then(r => r.json()).then(d => setGroups(d.groups || []));
  }, []);

  useEffect(() => {
    if (!defaultRange) return;
    setFrom((v) => v || defaultRange.from);
    setTo((v) => v || defaultRange.to);
  }, [defaultRange]);

  useEffect(() => {
    if (!from || !to) return;
    const qs = new URLSearchParams({ from, to });
    if (groupId) qs.set('groupId', groupId);
    router.replace(`/reports?${qs.toString()}`, { scroll: false });
  }, [from, to, groupId, router]);

  useEffect(() => {
    if (!from || !to) return;
    setLoading(true);
    const qs = new URLSearchParams({ from, to });
    if (groupId) qs.set('groupId', groupId);
    fetch(`/api/attendance?${qs.toString()}`)
      .then(r => r.json())
      .then(d => setRows(d.attendance || []))
      .finally(() => setLoading(false));
  }, [from, to, groupId]);

  // Aggregations
  const summary = useMemo(() => {
    const counts = { PRESENT: 0, LATE: 0, ABSENT: 0 };
    rows.forEach((r) => { (counts as any)[r.status]++; });
    return counts;
  }, [rows]);

  const totalRecords = rows.length;

  const byGroup = useMemo(() => {
    const map = new Map<string, { name: string; present: number; late: number; absent: number }>();
    rows.forEach((r) => {
      const key = r.student.group?.name ?? '— guruhsiz —';
      const entry = map.get(key) || { name: key, present: 0, late: 0, absent: 0 };
      if (r.status === 'PRESENT') entry.present++;
      if (r.status === 'LATE') entry.late++;
      if (r.status === 'ABSENT') entry.absent++;
      map.set(key, entry);
    });
    return Array.from(map.values());
  }, [rows]);

  const byDay = useMemo(() => {
    const map = new Map<string, { date: string; present: number; late: number; absent: number }>();
    rows.forEach((r) => {
      const key = formatDateISO(r.date);
      const entry = map.get(key) || { date: key.slice(5), present: 0, late: 0, absent: 0 };
      if (r.status === 'PRESENT') entry.present++;
      if (r.status === 'LATE') entry.late++;
      if (r.status === 'ABSENT') entry.absent++;
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);

  const pieData = [
    { name: 'Keldi', value: summary.PRESENT, key: 'PRESENT' },
    { name: 'Kech qoldi', value: summary.LATE, key: 'LATE' },
    { name: 'Kelmadi', value: summary.ABSENT, key: 'ABSENT' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Hisobotlar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Davomat statistikasi va Excel hisobotlari
          </p>
        </div>
        <a
          href={`/api/attendance/export?from=${from}&to=${to}${groupId ? `&groupId=${groupId}` : ''}`}
          className="btn-primary"
          download
        >
          <Download className="w-4 h-4" /> Excelga eksport
        </a>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calendar className="w-4 h-4" /> Davr:
        </div>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input sm:max-w-xs" />
        <span className="self-center text-slate-400">—</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input sm:max-w-xs" />
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="input sm:max-w-xs">
          <option value="">Barcha guruhlar</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Yuklanmoqda...</div>
      ) : totalRecords === 0 ? (
        <div className="card p-16 text-center">
          <FileBarChart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Tanlangan davrda yozuvlar topilmadi</p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="card p-5">
              <div className="text-sm text-slate-500">Jami yozuvlar</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-50 mt-1">{totalRecords}</div>
            </div>
            <div className="card p-5">
              <div className="text-sm text-slate-500">Keldi</div>
              <div className="text-3xl font-bold text-emerald-600 mt-1">{summary.PRESENT}</div>
              <div className="text-xs text-slate-400 mt-1">
                {totalRecords > 0 ? ((summary.PRESENT / totalRecords) * 100).toFixed(1) : 0}% tarkib
              </div>
            </div>
            <div className="card p-5">
              <div className="text-sm text-slate-500">Kech qoldi</div>
              <div className="text-3xl font-bold text-amber-600 mt-1">{summary.LATE}</div>
              <div className="text-xs text-slate-400 mt-1">
                {totalRecords > 0 ? ((summary.LATE / totalRecords) * 100).toFixed(1) : 0}% tarkib
              </div>
            </div>
            <div className="card p-5">
              <div className="text-sm text-slate-500">Kelmadi</div>
              <div className="text-3xl font-bold text-rose-600 mt-1">{summary.ABSENT}</div>
              <div className="text-xs text-slate-400 mt-1">
                {totalRecords > 0 ? ((summary.ABSENT / totalRecords) * 100).toFixed(1) : 0}% tarkib
              </div>
            </div>
            <div className="card p-5">
              <div className="text-sm text-slate-500">Guruhlar</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-50 mt-1">{byGroup.length}</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-5 lg:col-span-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-4">
                Kunlik dinamika
              </h2>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byDay} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.15)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgb(100 116 139)" fontSize={12} />
                    <YAxis stroke="rgb(100 116 139)" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgb(15 23 42)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                    />
                    <Legend formatter={(v) => v === 'present' ? 'Keldi' : v === 'late' ? 'Kech' : 'Kelmadi'} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="present" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="late" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="absent" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-5">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-4">Status nisbati</h2>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50}>
                      {pieData.map((entry) => (
                        <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgb(15 23 42)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* By group */}
          <div className="card p-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-4">
              Guruh boʻyicha
            </h2>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byGroup} layout="vertical" margin={{ top: 8, right: 12, left: 80, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.15)" horizontal={false} />
                  <XAxis type="number" stroke="rgb(100 116 139)" fontSize={12} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="rgb(100 116 139)" fontSize={12} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgb(15 23 42)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                  />
                  <Legend formatter={(v) => v === 'present' ? 'Keldi' : v === 'late' ? 'Kech' : 'Kelmadi'} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="present" stackId="a" fill="#10b981" />
                  <Bar dataKey="late" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="absent" stackId="a" fill="#f43f5e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// useSearchParams prerender paytida Suspense chegarasini talab qiladi.
export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-slate-400">Yuklanmoqda...</div>}>
      <ReportsPageInner />
    </Suspense>
  );
}
