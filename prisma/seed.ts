/**
 * Davomat Pro — Database seed
 * Run with: npx tsx prisma/seed.ts
 *
 * Idempotent — qayta ishga tushirilganda xato bermaydi
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Use const object instead of importing Role enum (Prisma client might be stale at build time)
const Role = {
  ADMIN: 'ADMIN' as const,
  TEACHER: 'TEACHER' as const,
  STUDENT: 'STUDENT' as const,
  PARENT: 'PARENT' as const,
};

const prisma = new PrismaClient();

// Deterministik pseudo-random (mulberry32) — seed har safar bir xil tarix beradi
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lokal SVG avatar yaratadi (internetga bog'liq bo'lmagan demo suratlar). */
function makeAvatar(fullName: string, color: string): string {
  const initials = fullName
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
  <rect width="256" height="256" rx="24" fill="${color}"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="96" font-weight="bold" fill="#ffffff">${initials}</text>
</svg>`;
  const slug = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const dir = path.join(process.cwd(), 'public', 'uploads');
  mkdirSync(dir, { recursive: true });
  const filename = `seed-${slug}.svg`;
  writeFileSync(path.join(dir, filename), svg, 'utf8');
  return `/uploads/${filename}`;
}

async function main() {
  console.log('🌱  Seeding database...');

  // ── 1. Admin ────────────────────────────────────────────
  const adminPwd = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      fullName: 'Bosh administrator',
      passwordHash: adminPwd,
      plainPassword: 'admin123',
      role: Role.ADMIN,
    },
  });
  console.log('✓  Admin: admin / admin123');

  // ── 2. Teachers ─────────────────────────────────────────
  const teacherPwd = await bcrypt.hash('teacher123', 10);
  const teacher1 = await prisma.user.upsert({
    where: { username: 'aliyev' },
    update: {},
    create: {
      username: 'aliyev',
      fullName: 'Aliyev Sardor',
      phone: '+998901234567',
      passwordHash: teacherPwd,
      plainPassword: 'teacher123',
      role: Role.TEACHER,
    },
  });
  const teacher2 = await prisma.user.upsert({
    where: { username: 'karimova' },
    update: {},
    create: {
      username: 'karimova',
      fullName: 'Karimova Dilnoza',
      phone: '+998907654321',
      passwordHash: teacherPwd,
      plainPassword: 'teacher123',
      role: Role.TEACHER,
    },
  });
  console.log('✓  Teachers: aliyev, karimova / teacher123');

  // ── 3. Periods (Paralar) ────────────────────────────────
  const periodData = [
    { number: 1, name: '1-dars', startTime: '08:00', endTime: '08:45' },
    { number: 2, name: '2-dars', startTime: '08:50', endTime: '09:35' },
    { number: 3, name: '3-dars', startTime: '09:40', endTime: '10:25' },
    { number: 4, name: '4-dars', startTime: '10:30', endTime: '11:15' },
    { number: 5, name: '5-dars', startTime: '11:20', endTime: '12:05' },
    { number: 6, name: '6-dars', startTime: '12:10', endTime: '12:55' },
  ];
  for (const p of periodData) {
    await prisma.period.upsert({
      where: { number: p.number },
      update: {},
      create: p,
    });
  }
  console.log(`✓  Periods: ${periodData.length} ta para`);

  // ── 4. Subjects (Fanlar) ────────────────────────────────
  const subjectData = [
    { name: 'Matematika',  color: '#3b82f6', description: 'Algebra va geometriya' },
    { name: 'Ona tili',    color: '#10b981', description: 'Oʻzbek tili va adabiyoti' },
    { name: 'Fizika',      color: '#8b5cf6', description: 'Fizika asoslari' },
    { name: 'Kimyo',       color: '#f97316', description: 'Anorganik va organik kimyo' },
    { name: 'Biologiya',   color: '#22c55e', description: 'Biologiya' },
    { name: 'Tarix',       color: '#ec4899', description: 'Jahon va Oʻzbekiston tarixi' },
    { name: 'Ingliz tili', color: '#06b6d4', description: 'Ingliz tili' },
    { name: 'Geografiya',  color: '#84cc16', description: 'Geografiya' },
  ];
  for (const s of subjectData) {
    await prisma.subject.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    });
  }
  console.log(`✓  Subjects: ${subjectData.length} ta fan`);

  // ── 5. Groups (Sinflar) ─────────────────────────────────
  const group1 = await prisma.group.upsert({
    where: { name: '5-A' },
    update: {},
    create: { name: '5-A', description: '5-A sinf' },
  });
  const group2 = await prisma.group.upsert({
    where: { name: '5-B' },
    update: {},
    create: { name: '5-B', description: '5-B sinf' },
  });
  const group3 = await prisma.group.upsert({
    where: { name: '6-A' },
    update: {},
    create: { name: '6-A', description: '6-A sinf' },
  });
  console.log('✓  Groups: 5-A, 5-B, 6-A');

  // ── 6. Sample Lessons (5-B sinf uchun haftalik jadval) ──
  const periods = await prisma.period.findMany({ orderBy: { number: 'asc' } });
  const subjects = await prisma.subject.findMany();
  const subj = (name: string) => subjects.find((s: typeof subjects[number]) => s.name === name)!;

  // 5-B sinfining dushanba kuni: 1-dars Matem, 2-dars Ona tili, 3-dars Fizika...
  const mondayLessonsForGroup2 = [
    { period: 1, subject: 'Matematika',  teacher: teacher1.id },
    { period: 2, subject: 'Ona tili',    teacher: teacher2.id },
    { period: 3, subject: 'Fizika',      teacher: teacher1.id },
    { period: 4, subject: 'Kimyo',       teacher: teacher2.id },
    { period: 5, subject: 'Biologiya',   teacher: teacher1.id },
    { period: 6, subject: 'Tarix',       teacher: teacher2.id },
  ];

  // Seshanba — boshqacha tartibda
  const tuesdayLessonsForGroup2 = [
    { period: 1, subject: 'Ona tili',    teacher: teacher2.id },
    { period: 2, subject: 'Matematika',  teacher: teacher1.id },
    { period: 3, subject: 'Ingliz tili', teacher: teacher2.id },
    { period: 4, subject: 'Geografiya',  teacher: teacher1.id },
    { period: 5, subject: 'Fizika',      teacher: teacher1.id },
  ];

  // Chorshanba
  const wednesdayLessonsForGroup2 = [
    { period: 1, subject: 'Matematika',  teacher: teacher1.id },
    { period: 2, subject: 'Kimyo',       teacher: teacher2.id },
    { period: 3, subject: 'Biologiya',   teacher: teacher1.id },
    { period: 4, subject: 'Ona tili',    teacher: teacher2.id },
  ];

  // 5-A sinfining Dushanba
  const mondayLessonsForGroup1 = [
    { period: 1, subject: 'Ona tili',    teacher: teacher2.id },
    { period: 2, subject: 'Matematika',  teacher: teacher1.id },
    { period: 3, subject: 'Ingliz tili', teacher: teacher2.id },
    { period: 4, subject: 'Tarix',       teacher: teacher2.id },
  ];

  const lessonPlan = [
    { day: 'Mon', groupId: group2.id, items: mondayLessonsForGroup2 },
    { day: 'Tue', groupId: group2.id, items: tuesdayLessonsForGroup2 },
    { day: 'Wed', groupId: group2.id, items: wednesdayLessonsForGroup2 },
    { day: 'Mon', groupId: group1.id, items: mondayLessonsForGroup1 },
  ];

  let lessonCount = 0;
  for (const plan of lessonPlan) {
    for (const item of plan.items) {
      const period = periods.find((p: typeof periods[number]) => p.number === item.period);
      if (!period) continue;
      try {
        await prisma.lesson.upsert({
          where: {
            groupId_dayOfWeek_periodId: {
              groupId: plan.groupId,
              dayOfWeek: plan.day,
              periodId: period.id,
            },
          },
          update: {},
          create: {
            subjectId: subj(item.subject).id,
            groupId: plan.groupId,
            teacherId: item.teacher,
            dayOfWeek: plan.day,
            periodId: period.id,
            attendanceWindowMinutes: 5,
          },
        });
        lessonCount++;
      } catch (e) {
        // skip duplicates
      }
    }
  }
  console.log(`✓  Lessons: ${lessonCount} ta dars`);

  // ── 7. Students (demo) ─────────────────────────────────
  // fullName unique emas — idempotentlik uchun findFirst + create.
  const AVATAR_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e'];
  const studentPlan: Array<{ fullName: string; groupId: string }> = [
    // 5-B — asosiy demo sinf (jadval to'liq shu sinfda)
    { fullName: 'Rustamov Jasur',     groupId: group2.id },
    { fullName: 'Yusupova Malika',    groupId: group2.id },
    { fullName: 'Toshpulatov Aziz',   groupId: group2.id },
    { fullName: 'Ergasheva Nilufar',  groupId: group2.id },
    { fullName: 'Qodirov Bekzod',     groupId: group2.id },
    { fullName: 'Islomova Sevinch',   groupId: group2.id },
    { fullName: 'Mirzayev Doston',    groupId: group2.id },
    { fullName: 'Akbarova Shahzoda',  groupId: group2.id },
    // 5-A
    { fullName: 'Saidov Timur',       groupId: group1.id },
    { fullName: 'Nazarova Zilola',    groupId: group1.id },
    { fullName: 'Umarov Sardor',      groupId: group1.id },
    { fullName: 'Xolmatova Gulnora',  groupId: group1.id },
    { fullName: 'Raimov Otabek',      groupId: group1.id },
    // 6-A
    { fullName: 'Karimov Farrux',     groupId: group3.id },
    { fullName: 'Sobirova Kamola',    groupId: group3.id },
    { fullName: 'Abdullayev Sanjar',  groupId: group3.id },
  ];

  const students: Array<{ id: string; fullName: string; groupId: string | null }> = [];
  for (let i = 0; i < studentPlan.length; i++) {
    const sp = studentPlan[i];
    let student = await prisma.student.findFirst({ where: { fullName: sp.fullName } });
    if (!student) {
      student = await prisma.student.create({
        data: {
          fullName: sp.fullName,
          groupId: sp.groupId,
          photoUrl: makeAvatar(sp.fullName, AVATAR_COLORS[i % AVATAR_COLORS.length]),
          parentPhone: `+9989012345${String(10 + i)}`,
        },
      });
    }
    students.push({ id: student.id, fullName: student.fullName, groupId: student.groupId });
  }
  console.log(`✓  Students: ${students.length} ta talaba`);

  // ── 8. Student & Parent demo accounts ──────────────────
  // O'quvchi akkaunti — 5-B'dan Rustamov Jasur
  const studentUser = await prisma.user.upsert({
    where: { username: 'oquvchi' },
    update: {},
    create: {
      username: 'oquvchi',
      fullName: 'Rustamov Jasur',
      passwordHash: await bcrypt.hash('student123', 10),
      plainPassword: 'student123',
      role: Role.STUDENT,
    },
  });
  await prisma.student.update({
    where: { id: students[0].id },
    data: { userId: studentUser.id },
  });

  // Ota-ona akkaunti — Jasur va Malikaning otasi
  const parentUser = await prisma.user.upsert({
    where: { username: 'otaona' },
    update: {},
    create: {
      username: 'otaona',
      fullName: 'Rustamov Akmal',
      phone: '+998901112233',
      passwordHash: await bcrypt.hash('parent123', 10),
      plainPassword: 'parent123',
      role: Role.PARENT,
    },
  });
  await prisma.user.update({
    where: { id: parentUser.id },
    data: { children: { connect: [{ id: students[0].id }, { id: students[1].id }] } },
  });
  console.log('✓  Accounts: oquvchi / student123, otaona / parent123');

  // ── 9. Demo attendance history (oxirgi 3 hafta) ────────
  // Har bir o'quvchiga o'z "profili": a'lochi ~97%, o'rtacha ~88%, sustroq ~72%
  const DAY_CODES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const allLessons = await prisma.lesson.findMany({ select: { id: true, groupId: true, dayOfWeek: true, period: { select: { startTime: true } } } });
  const rand = mulberry32(20260702);

  const profileOf = (idx: number) => (idx % 5 === 4 ? 0.72 : idx % 3 === 0 ? 0.97 : 0.88);

  const rows: Array<{
    studentId: string; lessonId: string; status: 'PRESENT' | 'LATE' | 'ABSENT';
    date: Date; checkInAt: Date | null; method: string; confidence: number | null;
  }> = [];

  const HISTORY_DAYS = 21;
  for (let back = HISTORY_DAYS; back >= 1; back--) {
    const d = new Date();
    d.setDate(d.getDate() - back);
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate()); // local startOfDay
    const dayCode = DAY_CODES[dateOnly.getDay()];
    const todaysLessons = allLessons.filter((l: typeof allLessons[number]) => l.dayOfWeek === dayCode);

    for (const lesson of todaysLessons) {
      const groupStudents = students.filter((s) => s.groupId === lesson.groupId);
      for (const st of groupStudents) {
        const idx = students.findIndex((x) => x.id === st.id);
        const attendRate = profileOf(idx);
        const r = rand();

        const [hh, mm] = lesson.period.startTime.split(':').map(Number);
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

  const created = await prisma.attendance.createMany({ data: rows, skipDuplicates: true });
  console.log(`✓  Attendance history: ${created.count} ta yozuv (${HISTORY_DAYS} kun)`);

  // ── 10. Settings ───────────────────────────────────────
  await prisma.setting.upsert({
    where: { key: 'faceMatchThreshold' },
    update: {},
    create: { key: 'faceMatchThreshold', value: '0.55' },
  });

  console.log('\n✅  Seed completed.');
  console.log('   ➜  Admin:    admin / admin123');
  console.log('   ➜  Teacher:  aliyev / teacher123');
  console.log('   ➜  Teacher:  karimova / teacher123');
  console.log('   ➜  Student:  oquvchi / student123');
  console.log('   ➜  Parent:   otaona / parent123');
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
