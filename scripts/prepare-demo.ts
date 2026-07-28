/**
 * Demo/pitch tayyorgarligi — idempotent.
 * Run with: npx tsx scripts/prepare-demo.ts
 *
 * Muammo: yuz skaneri faqat (a) bugungi kunga tegishli, (b) yo'qlama oynasi
 * ochiq darsda ishlaydi va (c) faqat o'sha dars guruhidagi yuzlarni taniydi.
 * Agar yuzi ro'yxatdan o'tgan guruhda bugun darsi bo'lmasa, demo o'lik.
 *
 * Shu skript: yuzi ro'yxatdan o'tgan HAR BIR guruhga berilgan kun(lar) uchun
 * to'liq jadval qo'yadi va yo'qlama oynasini kengaytiradi, ya'ni kun bo'yi
 * istalgan paytda skaner ishlaydi.
 */
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Qaysi kunlarga jadval kafolatlansin. Vergul bilan: DEMO_DAYS=Wed,Thu
const DAYS = (process.env.DEMO_DAYS ?? 'Wed').split(',').map((d) => d.trim());

// Yo'qlama oynasi. Para 45 daqiqa — 50 qo'ysak paralar orasidagi 5 daqiqalik
// tanaffus ham qoplanadi, ya'ni ish vaqtida "yopilgan" holat umuman chiqmaydi.
const WINDOW = Number(process.env.DEMO_WINDOW_MINUTES ?? 50);

async function main() {
  const periods = await prisma.period.findMany({ orderBy: { number: 'asc' } });
  const subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } });
  const teachers = await prisma.user.findMany({ where: { role: 'TEACHER' } });

  if (!periods.length || !subjects.length || !teachers.length) {
    throw new Error('Period / Subject / Teacher bo\'sh — avval `npx tsx prisma/seed.ts` ishlating.');
  }

  // Yuzi ro'yxatdan o'tgan o'quvchilar qaysi guruhlarda?
  const enrolled = await prisma.student.findMany({
    where: { isActive: true, faceDescriptor: { not: Prisma.DbNull } },
    select: { groupId: true },
  });
  const groupIds = Array.from(new Set(enrolled.map((s) => s.groupId).filter(Boolean))) as string[];

  if (!groupIds.length) {
    console.log('⚠️  Hech bir o\'quvchida yuz maʼlumoti yo\'q — skaner hech qanday guruhda ishlamaydi.');
    return;
  }

  const groups = await prisma.group.findMany({ where: { id: { in: groupIds } } });
  console.log(`🎯  Yuzi bor guruhlar: ${groups.map((g) => g.name).join(', ')}`);

  let created = 0;
  let widened = 0;

  for (const group of groups) {
    for (const day of DAYS) {
      for (let i = 0; i < periods.length; i++) {
        const period = periods[i];
        const subject = subjects[i % subjects.length];
        const teacher = teachers[i % teachers.length];

        const existing = await prisma.lesson.findUnique({
          where: {
            groupId_dayOfWeek_periodId: { groupId: group.id, dayOfWeek: day, periodId: period.id },
          },
        });

        if (existing) {
          if (existing.attendanceWindowMinutes < WINDOW || !existing.isActive) {
            await prisma.lesson.update({
              where: { id: existing.id },
              data: { attendanceWindowMinutes: WINDOW, isActive: true },
            });
            widened++;
          }
          continue;
        }

        await prisma.lesson.create({
          data: {
            subjectId: subject.id,
            groupId: group.id,
            teacherId: teacher.id,
            dayOfWeek: day,
            periodId: period.id,
            attendanceWindowMinutes: WINDOW,
          },
        });
        created++;
      }
    }
  }

  console.log(`✓  ${created} ta yangi dars, ${widened} ta darsning oynasi ${WINDOW} daqiqaga kengaytirildi`);
  console.log(`✓  Kunlar: ${DAYS.join(', ')} — paralar ${periods[0].startTime}–${periods[periods.length - 1].endTime}`);
  console.log('\n✅  Demo tayyor.');
}

main()
  .catch((e) => {
    console.error('❌  prepare-demo failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
