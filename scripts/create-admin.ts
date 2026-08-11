/**
 * Haqiqiy bazada admin akkaunt yaratadi (yoki mavjudining parolini yangilaydi).
 * Demo `prisma/seed.ts` dan farqli — hech qanday soxta o'quvchi/jadval yozmaydi.
 *
 * Run with:
 *   ADMIN_USERNAME=direktor ADMIN_PASSWORD='...' ADMIN_FULLNAME='...' npm run admin:create
 *
 * Docker ichida:
 *   docker compose exec -e ADMIN_USERNAME=... -e ADMIN_PASSWORD='...' app npm run admin:create
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const MIN_PASSWORD_LENGTH = 12;

/** Seed'dan qolgan va umumiy taxmin qilinadigan parollar. */
const BANNED_PASSWORDS = [
  'admin123', 'teacher123', 'student123', 'parent123',
  'password', 'parol123', '12345678', 'qwerty123',
];

function fail(message: string): never {
  console.error(`❌  ${message}`);
  process.exit(1);
}

/**
 * Parol talablari. Admin akkaunti butun maktabning yo'qlama va biometrik
 * ma'lumotlariga kalit — bu yerda bo'sh keta olmaymiz.
 */
function assertStrongPassword(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    fail(`ADMIN_PASSWORD kamida ${MIN_PASSWORD_LENGTH} belgidan iborat boʻlsin (hozir ${password.length}).`);
  }
  if (BANNED_PASSWORDS.includes(password.toLowerCase())) {
    fail('Bu parol juda mashhur/demo paroli — boshqasini tanlang.');
  }
  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
    fail('ADMIN_PASSWORD da kamida bitta harf va bitta raqam boʻlsin.');
  }
}

async function main() {
  const username = (process.env.ADMIN_USERNAME || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';
  const fullName = (process.env.ADMIN_FULLNAME || '').trim() || 'Bosh administrator';

  if (!username) fail('ADMIN_USERNAME berilmadi.');
  if (!password) fail('ADMIN_PASSWORD berilmadi.');
  assertStrongPassword(password);

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { username } });

  // plainPassword ataylab null — admin parolini hech kim "ko'rib berishi"
  // kerak emas, uni faqat shu skriptni ishlatgan odam biladi.
  const user = existing
    ? await prisma.user.update({
        where: { username },
        data: { passwordHash, plainPassword: null, role: 'ADMIN', isActive: true },
      })
    : await prisma.user.create({
        data: { username, fullName, passwordHash, plainPassword: null, role: 'ADMIN' },
      });

  console.log(`✅  Admin ${existing ? 'yangilandi' : 'yaratildi'}: ${user.username} (${user.fullName})`);
  console.log('    Parol bazada faqat hash koʻrinishida saqlandi.');

  // Demo seed qoldiqlari haqiqiy bazada qolib ketmasin.
  const leftovers = await prisma.user.findMany({
    where: { username: { in: ['admin', 'aliyev', 'karimova', 'oquvchi', 'otaona'] } },
    select: { username: true },
  });
  const stale = leftovers.filter((u) => u.username !== username);
  if (stale.length > 0) {
    console.warn(`\n⚠️   Bazada demo akkauntlar bor: ${stale.map((u) => u.username).join(', ')}`);
    console.warn('    Haqiqiy foydalanishdan oldin ularni oʻchiring yoki parolini almashtiring.');
  }
}

main()
  .catch((e) => {
    console.error('❌  Admin yaratishda xato:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
