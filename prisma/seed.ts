/**
 * Davomat Pro — Database seed
 * Run with: npx tsx prisma/seed.ts
 *
 * Idempotent — qayta ishga tushirilganda xato bermaydi
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Use const object instead of importing Role enum (Prisma client might be stale at build time)
const Role = {
  ADMIN: 'ADMIN' as const,
  TEACHER: 'TEACHER' as const,
  STUDENT: 'STUDENT' as const,
  PARENT: 'PARENT' as const,
};

const prisma = new PrismaClient();

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

  // ── 7. Settings ────────────────────────────────────────
  await prisma.setting.upsert({
    where: { key: 'faceMatchThreshold' },
    update: {},
    create: { key: 'faceMatchThreshold', value: '0.55' },
  });

  console.log('\n✅  Seed completed.');
  console.log('   ➜  Admin:    admin / admin123');
  console.log('   ➜  Teacher:  aliyev / teacher123');
  console.log('   ➜  Teacher:  karimova / teacher123');
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
