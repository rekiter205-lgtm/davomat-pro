'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, GraduationCap, UserCheck, UserX, ScanFace, ArrowRight,
} from 'lucide-react';
import AttendanceChart from '@/components/AttendanceChart';
import { formatTime, statusBadge, statusLabel } from '@/lib/utils';

interface Stats {
  students: number;
  activeStudents: number;
  groups: number;
  teachers: number;
  todayPresent: number;
  todayLate: number;
  todayAbsent: number;
  todayTotal: number;
}

interface AttendanceRow {
  id: string;
  status: string;
  checkInAt: string | null;
  confidence: number | null;
  student: { fullName: string; photoUrl: string; group: { name: string } | null };
}

export default function DashboardPage() {
  const [data, setData] = useState<{ stats: Stats; todayAttendance: AttendanceRow[]; chart: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="text-slate-500">Yuklanmoqda...</div>;
  }

  const isTeacher = (data as any).role === 'TEACHER';

  const cards = [
    { label: isTeacher ? 'Mening talabalarim' : 'Talabalar', value: data.stats.activeStudents, icon: Users,        color: 'from-blue-500 to-blue-600',     href: '/students' },
    { label: isTeacher ? 'Mening guruhlarim'  : 'Guruhlar',  value: data.stats.groups,         icon: GraduationCap,color: 'from-violet-500 to-violet-600', href: '/groups' },
    { label: 'Bugun keldi',   value: data.stats.todayPresent,   icon: UserCheck,    color: 'from-emerald-500 to-emerald-600', href: '/attendance' },
    { label: 'Bugun kelmadi', value: data.stats.todayAbsent,    icon: UserX,        color: 'from-rose-500 to-rose-600',     href: '/attendance' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Bosh sahifa</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isTeacher
              ? "Sizga tegishli guruhlar boʻyicha statistika"
              : "Davomat tizimining umumiy statistikasi"}
          </p>
        </div>
        <Link href="/attendance/scan" className="btn-primary">
          <ScanFace className="w-4 h-4" />
          Davomat skanerini ochish
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="card p-5 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between">
              <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center shadow-md`}>
                <c.icon className="w-5 h-5 text-white" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-50">{c.value}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{c.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Chart + Today's check-ins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Soʻnggi 7 kun davomati</h2>
              <p className="text-xs text-slate-500 mt-0.5">Kelgan va kelmaganlar boʻyicha</p>
            </div>
          </div>
          <AttendanceChart data={data.chart} />
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">Bugungi check-inlar</h2>
          <p className="text-xs text-slate-500 mb-4">{data.stats.todayTotal} ta yozuv</p>

          {data.todayAttendance.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-8">
              Bugun hali davomat yozuvlari yoʻq
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {data.todayAttendance.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                  <img
                    src={r.student.photoUrl}
                    alt={r.student.fullName}
                    className="w-9 h-9 rounded-full object-cover bg-slate-200"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/uploads/placeholder.png'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{r.student.fullName}</div>
                    <div className="text-xs text-slate-500 truncate">{r.student.group?.name ?? '—'}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`badge ${statusBadge(r.status)}`}>{statusLabel(r.status)}</span>
                    <span className="text-[10px] text-slate-400">{formatTime(r.checkInAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
