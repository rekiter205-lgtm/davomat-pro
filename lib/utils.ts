import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes, dedup conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a Date as `YYYY-MM-DD` in local time. */
export function formatDateISO(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns midnight (00:00:00.000) of the given date. */
export function startOfDay(d: Date | string): Date {
  const date = typeof d === 'string' ? new Date(d) : new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Format Date as `HH:mm`. */
export function formatTime(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** Pretty Uzbek-locale date `27.04.2026`. */
export function formatDateUz(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** "PRESENT"/"LATE"/"ABSENT" → Uzbek label */
export function statusLabel(s: string): string {
  switch (s) {
    case 'PRESENT': return 'Keldi';
    case 'LATE':    return 'Keldi';
    case 'ABSENT':  return 'Kelmadi';
    default:        return s;
  }
}

/** "PRESENT"/"LATE"/"ABSENT" → Tailwind badge classes */
export function statusBadge(s: string): string {
  switch (s) {
    case 'PRESENT': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'LATE':    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'ABSENT':  return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
    default:        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

/** "ADMIN"/"TEACHER"/"STUDENT"/"PARENT" → Uzbek label */
export function roleLabel(r: string): string {
  switch (r) {
    case 'ADMIN':   return 'Administrator';
    case 'TEACHER': return 'Oʻqituvchi';
    case 'STUDENT': return 'Oʻquvchi';
    case 'PARENT':  return 'Ota-ona';
    default:        return r;
  }
}

/** Day-of-week short codes used in Group.lessonDays */
export const DAY_CODES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export type DayCode = typeof DAY_CODES[number];

/** Uzbek labels for day codes (short) */
export const DAY_LABELS_UZ: Record<DayCode, string> = {
  Sun: 'Yak', Mon: 'Du', Tue: 'Se', Wed: 'Cho', Thu: 'Pa', Fri: 'Ju', Sat: 'Sha',
};

/** Uzbek labels (full) */
export const DAY_LABELS_UZ_FULL: Record<DayCode, string> = {
  Sun: 'Yakshanba', Mon: 'Dushanba', Tue: 'Seshanba', Wed: 'Chorshanba',
  Thu: 'Payshanba', Fri: 'Juma', Sat: 'Shanba',
};

/** Get the short day code for a given Date. */
export function dayCodeOf(d: Date | string): DayCode {
  const date = typeof d === 'string' ? new Date(d) : d;
  return DAY_CODES[date.getDay()];
}

/** Parse "Mon,Wed,Fri" into ["Mon","Wed","Fri"] */
export function parseLessonDays(s: string | null | undefined): DayCode[] {
  if (!s) return [];
  return s.split(',').map(x => x.trim()).filter(x => DAY_CODES.includes(x as DayCode)) as DayCode[];
}

/** Check if a date is a lesson day for the given lessonDays string. */
export function isLessonDay(date: Date | string, lessonDays: string): boolean {
  return parseLessonDays(lessonDays).includes(dayCodeOf(date));
}

/**
 * Period attendance status:
 *   - "before"   : current time < startTime (kamera hali ochilmagan)
 *   - "open"     : startTime <= now <= startTime + windowMinutes (kamera ochiq)
 *   - "closed"   : now > startTime + windowMinutes (kamera o'chgan)
 *   - "ended"    : now > endTime (dars umuman tugagan)
 */
export type PeriodStatus = 'before' | 'open' | 'closed' | 'ended';

export function periodStatus(
  now: Date,
  startTime: string,    // "HH:mm"
  endTime: string,
  windowMinutes: number = 5,
): { status: PeriodStatus; secondsLeft: number; secondsToStart: number } {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);

  const start = new Date(now);
  start.setHours(sh, sm, 0, 0);

  const end = new Date(now);
  end.setHours(eh, em, 0, 0);

  const windowEnd = new Date(start.getTime() + windowMinutes * 60 * 1000);

  const secondsToStart = Math.max(0, Math.floor((start.getTime() - now.getTime()) / 1000));
  const secondsLeft = Math.max(0, Math.floor((windowEnd.getTime() - now.getTime()) / 1000));

  if (now < start)        return { status: 'before', secondsLeft: 0, secondsToStart };
  if (now <= windowEnd)   return { status: 'open',   secondsLeft, secondsToStart: 0 };
  if (now <= end)         return { status: 'closed', secondsLeft: 0, secondsToStart: 0 };
  return { status: 'ended', secondsLeft: 0, secondsToStart: 0 };
}

/** Format seconds as MM:SS countdown */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Compare current time with lesson start time.
 * Returns:
 *   - "early"   if before startTime - 30 min  (don't allow attendance yet)
 *   - "ok"      if within attendance window (startTime - 30 min .. endTime)
 *   - "late"    same window but past startTime + lateMinutes
 *   - "ended"   if after endTime
 */
export type LessonTimeStatus = 'early' | 'ok' | 'late' | 'ended';

export function lessonTimeStatus(
  now: Date,
  startTime: string, // "HH:mm"
  endTime: string,
  lateMinutes: number = 15,
): LessonTimeStatus {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const start = new Date(now);
  start.setHours(sh, sm, 0, 0);
  const end = new Date(now);
  end.setHours(eh, em, 0, 0);
  const lateCutoff = new Date(start.getTime() + lateMinutes * 60 * 1000);
  // Allow attendance starting 30 minutes before
  const earliest = new Date(start.getTime() - 30 * 60 * 1000);

  if (now < earliest) return 'early';
  if (now > end) return 'ended';
  if (now > lateCutoff) return 'late';
  return 'ok';
}

/** Format "HH:mm" → "09:00" with proper zero padding */
export function formatTimeRange(start: string, end: string): string {
  return `${start}–${end}`;
}