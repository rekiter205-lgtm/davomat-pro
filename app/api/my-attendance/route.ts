/**
 * GET /api/my-attendance
 * - STUDENT: returns own attendance + stats
 * - PARENT: returns children list with their attendance + stats
 *   Optional ?childId=... to filter to one child
 */
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { startOfDay } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface AttendanceStats {
  total: number;
  present: number;
  late: number;
  absent: number;
  attendanceRate: number; // 0–100
}

function computeStats(records: { status: string }[]): AttendanceStats {
  const total = records.length;
  const present = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
  const late = 0;
  const absent = records.filter((r) => r.status === 'ABSENT').length;
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;
  return { total, present, late, absent, attendanceRate };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Avtorizatsiya' }, { status: 401 });

    const url = req.nextUrl;
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');
    const childId = url.searchParams.get('childId') || undefined;

    const dateFilter: any = {};
    if (fromParam) dateFilter.gte = startOfDay(new Date(fromParam));
    if (toParam)   dateFilter.lte = startOfDay(new Date(toParam));

    if (session.role === 'STUDENT') {
      const profile = await prisma.student.findUnique({
        where: { userId: session.sub },
        include: {
          group: { select: { id: true, name: true } },
        },
      });
      if (!profile) {
        return NextResponse.json({ error: 'Talaba profili topilmadi' }, { status: 404 });
      }

      const records = await prisma.attendance.findMany({
        where: {
          studentId: profile.id,
          ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
        },
        orderBy: { date: 'desc' },
        take: 200,
      });

      return NextResponse.json({
        student: {
          id: profile.id,
          fullName: profile.fullName,
          photoUrl: profile.photoUrl,
          group: profile.group,
        },
        attendance: records,
        stats: computeStats(records),
      });
    }

    if (session.role === 'PARENT') {
      const me = await prisma.user.findUnique({
        where: { id: session.sub },
        include: {
          children: {
            include: {
              group: { select: { id: true, name: true } },
            },
          },
        },
      });
      if (!me) return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });

      const children: any[] = me.children;
      if (children.length === 0) return NextResponse.json({ children: [] });

      const targetIds: string[] = childId
        ? children.filter((c: any) => c.id === childId).map((c: any) => c.id)
        : children.map((c: any) => c.id);

      const allRecords = await prisma.attendance.findMany({
        where: {
          studentId: { in: targetIds },
          ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
        },
        orderBy: { date: 'desc' },
      });

      const result = children
        .filter((c: any) => targetIds.includes(c.id))
        .map((c: any) => {
          const recs = allRecords.filter((r: typeof allRecords[number]) => r.studentId === c.id);
          return {
            id: c.id,
            fullName: c.fullName,
            photoUrl: c.photoUrl,
            group: c.group,
            attendance: recs.slice(0, 50),
            stats: computeStats(recs),
          };
        });

      return NextResponse.json({ children: result });
    }

    return NextResponse.json({ error: 'Bu sahifa faqat oʻquvchi/ota-ona uchun' }, { status: 403 });
  } catch (err) {
    console.error('GET /api/my-attendance:', err);
    return NextResponse.json({ error: 'Xato' }, { status: 500 });
  }
}