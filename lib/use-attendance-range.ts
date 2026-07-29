'use client';

import { useEffect, useState } from 'react';
import { formatDateISO } from './utils';

export interface DefaultRange {
  from: string;
  to: string;
}

/**
 * Sahifa ochilganda ko'rsatiladigan standart oraliq.
 *
 * Odatda "oxirgi 30 kun". Ammo bugungi kunga ma'lumot bo'lmasa (ta'til,
 * demo bazasi, o'quv yili tugagan) o'sha oraliq bo'm-bo'sh chiqadi —
 * shuning uchun bazadagi eng oxirgi ma'lumotli kunga tushamiz.
 *
 * `undefined` — hali aniqlanmadi; sahifa shu paytda ma'lumot so'ramasligi
 * kerak, aks holda bir marta bekorga so'rov ketadi va ekran sakraydi.
 */
export function useDefaultRange(days = 30): DefaultRange | undefined {
  const [range, setRange] = useState<DefaultRange | undefined>(undefined);

  useEffect(() => {
    let alive = true;

    const rangeEndingAt = (end: Date): DefaultRange => {
      const start = new Date(end);
      start.setDate(end.getDate() - (days - 1));
      return { from: formatDateISO(start), to: formatDateISO(end) };
    };

    const today = new Date();

    fetch('/api/attendance/range')
      .then((r) => (r.ok ? r.json() : { max: null }))
      .then((d: { max: string | null }) => {
        if (!alive) return;
        // Sana `YYYY-MM-DD` — satr sifatida solishtirish to'g'ri ishlaydi.
        const useLatest = d.max && d.max < formatDateISO(today);
        setRange(rangeEndingAt(useLatest ? new Date(d.max + 'T00:00:00') : today));
      })
      .catch(() => alive && setRange(rangeEndingAt(today)));

    return () => { alive = false; };
  }, [days]);

  return range;
}
