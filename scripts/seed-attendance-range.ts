/**
 * Berilgan sana oralig'iga demo davomat yozadi.
 *
 * prisma/seed.ts faqat "oxirgi N kun" ni to'ldiradi — o'tgan aniq oraliq
 * (masalan o'quv choragi) uchun shu skript ishlatiladi.
 *
 *   FROM=2026-05-15 TO=2026-06-01 \
 *   HOLIDAYS=2026-05-27,2026-05-28,2026-05-29 \
 *   npm run seed:range
 *
 * Dam olish kunlari: WEEKEND (default "Sun"). Shanba dars kuni bo'lgani uchun
 * ro'yxatga kirmaydi — besh kunlik hafta uchun WEEKEND="Sat,Sun" bering.
 *
 * Mavjud yozuvlarga tegmaydi (skipDuplicates), shuning uchun qayta ishga
 * tushirish xavfsiz.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DAY_CODES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Seed bilan bir xil deterministik RNG — qayta ishga tushirilsa natija o'zgarmaydi. */
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** "2026-05-15" → local startOfDay (UTC parsing kunni surib yuboradi). */
function parseDate(s: string): Date {
  const [y, m, d] = s.trim().split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function main() {
  const from = parseDate(process.env.FROM || '');
  const to = parseDate(process.env.TO || '');
  if (isNaN(+from) || isNaN(+to)) {
    throw new Error('FROM va TO kerak, masalan: FROM=2026-05-15 TO=2026-06-01');
  }
  if (from > to) throw new Error('FROM sanasi TO dan keyin');

  const holidays = new Set(
    (process.env.HOLIDAYS || '').split(',').map((s) => s.trim()).filter(Boolean),
  );
  const weekend = new Set(
    (process.env.WEEKEND ?? 'Sun').split(',').map((s) => s.trim()).filter(Boolean),
  );

  const [allLessons, allStudents] = await Promise.all([
    prisma.lesson.findMany({
      where: { isActive: true },
      select: { id: true, groupId: true, dayOfWeek: true, period: { select: { startTime: true } } },
    }),
    prisma.student.findMany({
      where: { isActive: true },
      select: { id: true, groupId: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  if (allLessons.length === 0) throw new Error('Faol dars topilmadi — avval seed ishlating');
  if (allStudents.length === 0) throw new Error('Faol o\'quvchi topilmadi');

  // Seed bilan bir xil "profil": a'lochi ~97%, o'rtacha ~88%, sustroq ~72%.
  // Shu tufayli yangi oraliq eski tarix bilan bir xil o'quvchi xulqini beradi.
  const profileOf = (idx: number) => (idx % 5 === 4 ? 0.72 : idx % 3 === 0 ? 0.97 : 0.88);
  const indexOf = new Map(allStudents.map((s: { id: string }, i: number) => [s.id, i]));
  const byGroup = new Map<string, typeof allStudents>();
  for (const s of allStudents) {
    if (!s.groupId) continue;
    const list = byGroup.get(s.groupId) || [];
    list.push(s);
    byGroup.set(s.groupId, list);
  }

  const rand = mulberry32(20260515);

  const rows: Array<{
    studentId: string; lessonId: string; status: 'PRESENT' | 'LATE' | 'ABSENT';
    date: Date; checkInAt: Date | null; method: string; confidence: number | null;
  }> = [];

  const workDays: string[] = [];
  const skipped: string[] = [];

  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const key = toKey(dateOnly);
    const dayCode = DAY_CODES[dateOnly.getDay()];

    if (weekend.has(dayCode)) { skipped.push(`${key} (${dayCode}, dam olish)`); continue; }
    if (holidays.has(key))    { skipped.push(`${key} (${dayCode}, bayram)`);     continue; }

    const todaysLessons = allLessons.filter((l: { dayOfWeek: string }) => l.dayOfWeek === dayCode);
    if (todaysLessons.length === 0) { skipped.push(`${key} (${dayCode}, dars yo'q)`); continue; }
    workDays.push(`${key} (${dayCode}, ${todaysLessons.length} dars)`);

    for (const lesson of todaysLessons) {
      const [hh, mm] = lesson.period.startTime.split(':').map(Number);
      for (const st of byGroup.get(lesson.groupId) || []) {
        const attendRate = profileOf(indexOf.get(st.id)!);
        const r = rand();

        if (r < attendRate) {
          // PRESENT — yuz orqali, dars boshidan 0–4 daqiqa ichida
          const checkIn = new Date(dateOnly);
          checkIn.setHours(hh, mm + Math.floor(rand() * 5), Math.floor(rand() * 60));
          rows.push({
            studentId: st.id, lessonId: lesson.id, status: 'PRESENT',
            date: dateOnly, checkInAt: checkIn, method: 'face',
            confidence: Math.round((0.62 + rand() * 0.3) * 100) / 100,
          });
        } else if (r < attendRate + 0.05) {
          // LATE — o'qituvchi qo'lda belgilagan
          const checkIn = new Date(dateOnly);
          checkIn.setHours(hh, mm + 8 + Math.floor(rand() * 10), 0);
          rows.push({
            studentId: st.id, lessonId: lesson.id, status: 'LATE',
            date: dateOnly, checkInAt: checkIn, method: 'manual', confidence: null,
          });
        } else {
          // ABSENT — yo'qlama yakunida avtomatik
          rows.push({
            studentId: st.id, lessonId: lesson.id, status: 'ABSENT',
            date: dateOnly, checkInAt: null, method: 'auto-absent', confidence: null,
          });
        }
      }
    }
  }

  console.log(`\nOraliq: ${toKey(from)} … ${toKey(to)}`);
  console.log(`\nDars kunlari (${workDays.length}):`);
  workDays.forEach((s) => console.log('  ✓ ' + s));
  console.log(`\nTushib qolgan kunlar (${skipped.length}):`);
  skipped.forEach((s) => console.log('  ✗ ' + s));

  const created = await prisma.attendance.createMany({ data: rows, skipDuplicates: true });
  console.log(`\n✓ ${created.count} ta yangi yozuv (${rows.length} tayyorlandi, farqi — allaqachon mavjudlari)`);
}

main()
  .catch((e) => {
    console.error('❌ Xato:', e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
