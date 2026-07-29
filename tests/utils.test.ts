import { describe, it, expect } from 'vitest';
import {
  formatDateISO,
  startOfDay,
  dayCodeOf,
  parseLessonDays,
  attendanceState,
  formatCountdown,
} from '@/lib/utils';

describe('formatDateISO', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(formatDateISO(new Date(2026, 6, 1))).toBe('2026-07-01');
  });
});

describe('startOfDay', () => {
  it('zeroes the time component', () => {
    const d = startOfDay(new Date(2026, 6, 1, 15, 30, 45, 123));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });
});

describe('dayCodeOf', () => {
  it('maps Sunday to Sun and Wednesday to Wed', () => {
    expect(dayCodeOf(new Date(2026, 6, 5))).toBe('Sun'); // 2026-07-05 is a Sunday
    expect(dayCodeOf(new Date(2026, 6, 1))).toBe('Wed'); // 2026-07-01 is a Wednesday
  });
});

describe('parseLessonDays', () => {
  it('parses and filters invalid codes', () => {
    expect(parseLessonDays('Mon, Wed ,Fri,Xyz')).toEqual(['Mon', 'Wed', 'Fri']);
  });
  it('returns [] for empty/null', () => {
    expect(parseLessonDays(null)).toEqual([]);
    expect(parseLessonDays('')).toEqual([]);
  });
});

describe('attendanceState', () => {
  const at = (h: number, m: number) => new Date(2026, 6, 1, h, m, 0, 0);
  const openedAtSession = (h: number, m: number, windowMin = 5) => ({
    openedAt: at(h, m),
    closesAt: new Date(at(h, m).getTime() + windowMin * 60_000),
  });

  it('is "before" prior to start when not opened', () => {
    expect(attendanceState(at(7, 59), '08:00', '08:45', null).status).toBe('before');
  });
  it('is "ready" during the lesson while not opened', () => {
    expect(attendanceState(at(8, 20), '08:00', '08:45', null).status).toBe('ready');
  });
  it('is "ended" after the lesson if never opened', () => {
    expect(attendanceState(at(9, 0), '08:00', '08:45', null).status).toBe('ended');
  });

  it('is "open" for the window that starts when the teacher opened it', () => {
    const s = attendanceState(at(8, 22), '08:00', '08:45', openedAtSession(8, 20));
    expect(s.status).toBe('open');
    expect(s.secondsLeft).toBe(180);
  });
  it('is "closed" once the 5 minutes are up — even mid-lesson', () => {
    expect(attendanceState(at(8, 26), '08:00', '08:45', openedAtSession(8, 20)).status).toBe('closed');
  });
  it('stays "closed" after the lesson ends — no re-opening', () => {
    expect(attendanceState(at(10, 0), '08:00', '08:45', openedAtSession(8, 20)).status).toBe('closed');
  });
});

describe('formatCountdown', () => {
  it('formats seconds as MM:SS', () => {
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(65)).toBe('01:05');
    expect(formatCountdown(600)).toBe('10:00');
  });
});
