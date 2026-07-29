/**
 * GET /api/attendance/range
 *
 * Foydalanuvchi ko'ra oladigan davomat ma'lumotining eng eski va eng yangi
 * sanasi. Sahifalar standart oraliqni shunga qarab tanlaydi — aks holda
 * "oxirgi 30 kun" ma'lumot yo'q davrga tushib, hamma joy bo'sh ko'rinadi.
 */
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toDateKey } from '@/lib/utils';
import { visibleGroupIds, visibleStudentIds } from '@/lib/scope';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Avtorizatsiya' }, { status: 401 });

    const where: any = {};

    const studentIds = await visibleStudentIds(session);
    if (studentIds) {
      if (studentIds.length === 0) return NextResponse.json({ min: null, max: null });
      where.studentId = { in: studentIds };
    } else if (session.role === 'TEACHER') {
      const groupIds = (await visibleGroupIds(session)) || [];
      if (groupIds.length === 0) return NextResponse.json({ min: null, max: null });
      where.student = { groupId: { in: groupIds } };
    }

    const agg = await prisma.attendance.aggregate({
      where,
      _min: { date: true },
      _max: { date: true },
    });

    return NextResponse.json({
      min: agg._min.date ? toDateKey(agg._min.date) : null,
      max: agg._max.date ? toDateKey(agg._max.date) : null,
    });
  } catch (err) {
    console.error('GET /api/attendance/range:', err);
    return NextResponse.json({ error: 'Xato' }, { status: 500 });
  }
}
