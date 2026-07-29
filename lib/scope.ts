/**
 * Rol bo'yicha ko'rish doirasi (row-level scoping).
 *
 * Middleware faqat sahifalarni va yozish metodlarini bloklaydi — GET so'rovlar
 * har qanday tizimga kirgan foydalanuvchiga ochiq. Shuning uchun ro'yxat
 * qaytaradigan API'lar shu yerdagi yordamchilar orqali filtrlanishi shart,
 * aks holda ota-ona/o'quvchi butun maktab ma'lumotini oladi.
 */
import { prisma } from './prisma';
import type { TokenPayload } from './jwt';

/** ADMIN uchun `null` — cheklov yo'q. Qolganlar uchun ruxsat etilgan guruh ID'lari. */
export async function visibleGroupIds(session: TokenPayload): Promise<string[] | null> {
  if (session.role === 'ADMIN') return null;

  if (session.role === 'TEACHER') {
    const lessons = await prisma.lesson.findMany({
      where: { teacherId: session.sub },
      select: { groupId: true },
      distinct: ['groupId'],
    });
    return lessons.map((l: { groupId: string }) => l.groupId);
  }

  if (session.role === 'STUDENT') {
    const profile = await prisma.student.findUnique({
      where: { userId: session.sub },
      select: { groupId: true },
    });
    return profile?.groupId ? [profile.groupId] : [];
  }

  // PARENT
  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { children: { select: { groupId: true } } },
  });
  return (me?.children || [])
    .map((c: { groupId: string | null }) => c.groupId)
    .filter((id: string | null): id is string => !!id);
}

/**
 * O'quvchi darajasidagi doira. ADMIN/TEACHER uchun `null` — ular guruh
 * darajasida filtrlanadi. STUDENT o'zini, PARENT farzandlarini ko'radi.
 */
export async function visibleStudentIds(session: TokenPayload): Promise<string[] | null> {
  if (session.role === 'STUDENT') {
    const profile = await prisma.student.findUnique({
      where: { userId: session.sub },
      select: { id: true },
    });
    return profile ? [profile.id] : [];
  }

  if (session.role === 'PARENT') {
    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { children: { select: { id: true } } },
    });
    return (me?.children || []).map((c: { id: string }) => c.id);
  }

  return null;
}
