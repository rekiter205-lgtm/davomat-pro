'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, BookOpen, Users, ScanFace, Lock, Check, AlertCircle } from 'lucide-react';
import { dayCodeOf, DAY_LABELS_UZ_FULL, periodStatus, formatCountdown } from '@/lib/utils';

interface Lesson {
  id: string;
  subject: { id: string; name: string; color: string };
  group: { id: string; name: string };
  period: { id: string; number: number; name: string; startTime: string; endTime: string };
  attendanceWindowMinutes: number;
}

export default function TodayPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const todayCode = dayCodeOf(now);
  const todayLabel = DAY_LABELS_UZ_FULL[todayCode];

  useEffect(() => {
    fetch('/api/lessons?today=1')
      .then((r) => r.json())
      .then((d) => setLessons(d.lessons || []))
      .finally(() => setLoading(false));
  }, []);

  // Update "now" every second for countdowns
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return <div className="text-center py-16 text-slate-400">Yuklanmoqda...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          Bugungi darslar
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {todayLabel} · {now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {lessons.length === 0 ? (
        <div className="card p-16 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">
            Bugun darsingiz yoʻq
          </h2>
          <p className="text-sm text-slate-500">
            {todayLabel} kunida dars jadvalingiz boʻsh
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((l) => {
            const ps = periodStatus(now, l.period.startTime, l.period.endTime, l.attendanceWindowMinutes);
            return <LessonCard key={l.id} lesson={l} status={ps} />;
          })}
        </div>
      )}
    </div>
  );
}

function LessonCard({
  lesson,
  status,
}: {
  lesson: Lesson;
  status: ReturnType<typeof periodStatus>;
}) {
  const isOpen = status.status === 'open';
  const isBefore = status.status === 'before';
  const isClosed = status.status === 'closed' || status.status === 'ended';

  return (
    <div className={`card p-5 transition-all ${
      isOpen ? 'ring-2 ring-emerald-500 shadow-lg' : ''
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Subject color tag */}
        <div
          className="w-1 h-16 rounded-full hidden sm:block"
          style={{ background: lesson.subject.color }}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-3 h-3 rounded-full sm:hidden"
              style={{ background: lesson.subject.color }}
            />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {lesson.period.number}-dars · {lesson.subject.name}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {lesson.period.startTime}–{lesson.period.endTime}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {lesson.group.name}
            </span>
          </div>
        </div>

        {/* Status / action */}
        <div className="flex-shrink-0">
          {isBefore && (
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <Lock className="w-4 h-4" />
                <span>Hali boshlanmagan</span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {formatCountdown(status.secondsToStart)} qoldi
              </div>
            </div>
          )}

          {isOpen && (
            <Link
              href={`/attendance/scan?lessonId=${lesson.id}`}
              className="btn-primary"
            >
              <ScanFace className="w-4 h-4" />
              <span>Yoʻqlama olish</span>
              <span className="ml-1 text-xs font-mono opacity-90">
                ({formatCountdown(status.secondsLeft)})
              </span>
            </Link>
          )}

          {isClosed && (
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Check className="w-4 h-4" />
                <span>Yoʻqlama tugagan</span>
              </div>
              <Link
                href={`/attendance?date=${new Date().toISOString().slice(0, 10)}&groupId=${lesson.group.id}`}
                className="text-xs text-brand-600 hover:underline"
              >
                Davomatni ko'rish →
              </Link>
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Kamera ochiq · {formatCountdown(status.secondsLeft)} dan keyin avtomatik yopiladi</span>
        </div>
      )}
    </div>
  );
}
