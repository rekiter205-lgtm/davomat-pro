import { describe, it, expect } from 'vitest';
import {
  formatDateISO,
  startOfDay,
  dayCodeOf,
  parseLessonDays,
  periodStatus,
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

describe('periodStatus', () => {
  const at = (h: number, m: number) => new Date(2026, 6, 1, h, m, 0, 0);

  it('is "before" prior to start', () => {
    expect(periodStatus(at(7, 59), '08:00', '08:45', 5).status).toBe('before');
  });
  it('is "open" inside the attendance window', () => {
    expect(periodStatus(at(8, 3), '08:00', '08:45', 5).status).toBe('open');
  });
  it('is "closed" after the window but before end', () => {
    expect(periodStatus(at(8, 20), '08:00', '08:45', 5).status).toBe('closed');
  });
  it('is "ended" after the end time', () => {
    expect(periodStatus(at(9, 0), '08:00', '08:45', 5).status).toBe('ended');
  });
});

describe('formatCountdown', () => {
  it('formats seconds as MM:SS', () => {
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(65)).toBe('01:05');
    expect(formatCountdown(600)).toBe('10:00');
  });
});
