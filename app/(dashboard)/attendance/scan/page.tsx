'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertTriangle, XCircle, Clock, BookOpen, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import FaceScanner from '@/components/FaceScanner';
import { statusLabel, statusBadge, formatTime, dayCodeOf, periodStatus, formatCountdown, toDateKey } from '@/lib/utils';

interface Lesson {
  id: string;
  dayOfWeek: string;
  attendanceWindowMinutes: number;
  subject: { id: string; name: string; color: string };
  group: { id: string; name: string };
  teacher: { id: string; fullName: string };
  period: { id: string; number: number; name: string; startTime: string; endTime: string };
}

interface RecognizeResponse {
  matched: boolean;
  alreadyMarked?: boolean;
  reason?: string;
  error?: string;
  student?: { id: string; fullName: string; photoUrl: string; group: { id: string; name: string } | null };
  attendance?: { status: string; checkInAt: string };
  lesson?: { id: string; subject: string; time: string };
  confidence?: number;
}

interface RecentScan {
  id: string;
  studentName: string;
  photoUrl: string;
  status: string;
  time: string;
  confidence: number;
}

function ScanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lessonId = searchParams.get('lessonId');

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<RecognizeResponse | null>(null);
  const [recent, setRecent] = useState<RecentScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [finalized, setFinalized] = useState(false);

  const cooldownRef = useRef<Map<string, number>>(new Map());
  const finalizeRef = useRef<boolean>(false);

  // Update "now" every second
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load lesson
  useEffect(() => {
    if (!lessonId) {
      setLoading(false);
      return;
    }
    fetch('/api/lessons?today=1')
      .then((r) => r.json())
      .then((d) => {
        const found = (d.lessons || []).find((l: Lesson) => l.id === lessonId);
        setLesson(found || null);
      })
      .finally(() => setLoading(false));
  }, [lessonId]);

  const ps = lesson
    ? periodStatus(now, lesson.period.startTime, lesson.period.endTime, lesson.attendanceWindowMinutes)
    : null;

  const isOpen = ps?.status === 'open';
  const isClosed = ps?.status === 'closed' || ps?.status === 'ended';

  // Auto-finalize when window closes
  useEffect(() => {
    if (!lesson || !isClosed || finalizeRef.current) return;
    finalizeRef.current = true;
    fetch('/api/attendance/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: lesson.id }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.added > 0) {
          toast.success(`${d.added} ta kelmagan talaba avtomatik belgilandi`);
        }
        setFinalized(true);
      })
      .catch(() => {});
  }, [lesson, isClosed]);

  const handleDescriptor = useCallback(async (descriptor: number[]) => {
    if (busy || !lesson || !isOpen) return;
    setBusy(true);
    try {
      const res = await fetch('/api/attendance/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor, lessonId: lesson.id }),
      });
      const data: RecognizeResponse = await res.json();
      if (!res.ok) {
        setLastResult({ matched: false, reason: data.error || 'Server xatosi' });
        return;
      }
      setLastResult(data);

      if (data.matched && data.student) {
        const key = data.student.id;
        const time = Date.now();
        const last = cooldownRef.current.get(key) || 0;
        if (!(time - last < 30_000 && data.alreadyMarked)) {
          cooldownRef.current.set(key, time);
          setRecent((prev) => [{
            id: `${key}-${time}`,
            studentName: data.student!.fullName,
            photoUrl: data.student!.photoUrl,
            status: data.attendance?.status ?? 'PRESENT',
            time: data.attendance?.checkInAt ? formatTime(data.attendance.checkInAt) : formatTime(new Date()),
            confidence: data.confidence ?? 0,
          }, ...prev].slice(0, 12));
        }
      }
    } catch (err) {
      console.error(err);
      setLastResult({ matched: false, reason: 'Tarmoq xatosi' });
    } finally {
      setBusy(false);
    }
  }, [busy, lesson, isOpen]);

  if (loading) {
    return <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;
  }

  if (!lessonId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Yoʻqlama</h1>
        <div className="card p-16 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">Dars tanlanmagan</p>
          <Link href="/today" className="btn-primary inline-flex">Bugungi darslarga oʻtish</Link>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="card p-16 text-center">
        <XCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <p className="text-rose-600">Dars topilmadi</p>
        <Link href="/today" className="btn-primary inline-flex mt-4">Orqaga</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
            {lesson.period.number}-dars · {lesson.subject.name}
          </h1>
          <p className="text-sm text-slate-500">
            {lesson.group.name} · {lesson.period.startTime}–{lesson.period.endTime}
          </p>
        </div>
      </div>

      {/* Status banner */}
      {ps?.status === 'before' && (
        <div className="card p-4 flex items-center gap-3 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30">
          <Clock className="w-5 h-5 text-blue-600" />
          <div>
            <div className="text-sm font-medium text-blue-900 dark:text-blue-200">Dars hali boshlanmagan</div>
            <div className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
              Boshlanishigacha: <span className="font-mono">{formatCountdown(ps.secondsToStart)}</span>
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="card p-4 flex items-center gap-3 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-pulse" />
          <div className="flex-1">
            <div className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
              📸 Yoʻqlama ochiq — kameraga qarang
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
              Yoʻqlamani yopilishigacha: <span className="font-mono font-bold">{formatCountdown(ps.secondsLeft)}</span>
            </div>
          </div>
        </div>
      )}

      {isClosed && (
        <div className="card p-4 flex items-center gap-3 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <XCircle className="w-5 h-5 text-slate-500" />
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Yoʻqlama yopildi
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {finalized
                ? 'Kelmagan talabalar avtomatik "Kelmadi" deb belgilandi'
                : 'Belgilash davom etmoqda...'}
            </div>
          </div>
          <Link
            href={`/attendance?date=${toDateKey(new Date())}&groupId=${lesson.group.id}`}
            className="btn-primary text-xs"
          >
            Davomatni koʻrish
          </Link>
        </div>
      )}

      {/* Camera + recent */}
      {(isOpen || ps?.status === 'before') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {isOpen ? (
              <FaceScanner
                onDescriptor={handleDescriptor}
                busy={busy}
                continuous
                intervalMs={2000}
              />
            ) : (
              <div className="card p-16 text-center bg-slate-100 dark:bg-slate-800">
                <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-500">
                  Dars boshlanishini kuting
                </p>
                <p className="text-2xl font-mono font-bold text-slate-700 dark:text-slate-300 mt-3">
                  {formatCountdown(ps?.secondsToStart || 0)}
                </p>
              </div>
            )}

            {lastResult && isOpen && <ResultBanner result={lastResult} />}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Kelganlar</h2>
              <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                {recent.length}
              </span>
            </div>
            {recent.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">
                Hali kelgan talaba yoʻq
              </div>
            ) : (
              <ul className="space-y-2 max-h-[28rem] overflow-y-auto">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                    <img
                      src={r.photoUrl}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover bg-slate-200"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/uploads/placeholder.png'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{r.studentName}</div>
                      <div className="text-xs text-slate-500">{r.time}</div>
                    </div>
                    <span className={`badge text-[10px] ${statusBadge(r.status)}`}>{statusLabel(r.status)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultBanner({ result }: { result: RecognizeResponse }) {
  if (!result.matched) {
    return (
      <div className="card p-3 mt-3 flex items-center gap-3 bg-rose-50 dark:bg-rose-500/10 border-rose-200">
        <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
        <span className="text-sm text-rose-700 dark:text-rose-300">{result.reason || 'Tan olinmadi'}</span>
      </div>
    );
  }
  if (result.alreadyMarked) {
    return (
      <div className="card p-3 mt-3 flex items-center gap-3 bg-amber-50 dark:bg-amber-500/10 border-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <span className="text-sm text-amber-800 dark:text-amber-300">
          {result.student?.fullName} — allaqachon belgilangan
        </span>
      </div>
    );
  }
  return (
    <div className="card p-3 mt-3 flex items-center gap-3 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200">
      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
      <div className="flex-1">
        <div className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
          ✓ {result.student?.fullName}
        </div>
        <div className="text-xs text-emerald-700 dark:text-emerald-300">
          Aniqlik: {((result.confidence ?? 0) * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

export default function FaceScanPage() {
  return (
    <Suspense fallback={<div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>}>
      <ScanContent />
    </Suspense>
  );
}
