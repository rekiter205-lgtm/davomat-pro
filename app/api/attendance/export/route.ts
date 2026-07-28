/**
 * GET /api/attendance/export?from=YYYY-MM-DD&to=YYYY-MM-DD&groupId=...
 * Returns an .xlsx file.
 */
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { startOfDay, formatDateUz, statusLabel } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Middleware login'ni tekshiradi, lekin rolni emas — usiz STUDENT/PARENT
    // ham butun maktab davomatini yuklab olardi.
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: 'Avtorizatsiya' }, { status: 401 });
    if (session.role !== 'ADMIN' && session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Ruxsat yoʻq' }, { status: 403 });
    }

    const url = req.nextUrl;
    const from = url.searchParams.get('from');
    const to   = url.searchParams.get('to');
    const groupId = url.searchParams.get('groupId') || undefined;

    const where: any = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = startOfDay(new Date(from));
      if (to)   where.date.lte = startOfDay(new Date(to));
    }
    if (groupId) where.student = { groupId };

    // O'qituvchi faqat o'z guruhlarini eksport qiladi
    if (session.role === 'TEACHER') {
      const myLessons = await prisma.lesson.findMany({
        where: { teacherId: session.sub },
        select: { groupId: true },
        distinct: ['groupId'],
      });
      const ids = myLessons.map((l: { groupId: string }) => l.groupId);
      where.student = { ...(where.student || {}), groupId: groupId && ids.includes(groupId) ? groupId : { in: ids } };
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: { fullName: true, phone: true, group: { select: { name: true } } },
        },
        markedBy: { select: { fullName: true } },
      },
      orderBy: [{ date: 'asc' }, { checkInAt: 'asc' }],
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Davomat Pro';
    wb.created = new Date();
    const sheet = wb.addWorksheet('Davomat');

    sheet.columns = [
      { header: '#',           key: 'n',         width: 5 },
      { header: 'Sana',        key: 'date',      width: 12 },
      { header: 'F.I.Sh',      key: 'name',      width: 28 },
      { header: 'Guruh',       key: 'group',     width: 16 },
      { header: 'Status',      key: 'status',    width: 12 },
      { header: 'Kelgan vaqti',key: 'time',      width: 14 },
      { header: 'Usul',        key: 'method',    width: 10 },
      { header: 'Aniqlik',     key: 'confidence',width: 10 },
      { header: 'Belgilagan',  key: 'markedBy',  width: 22 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    records.forEach((r: typeof records[number], i: number) => {
      sheet.addRow({
        n: i + 1,
        date: formatDateUz(r.date),
        name: r.student.fullName,
        group: r.student.group?.name ?? '—',
        status: statusLabel(r.status),
        time: r.checkInAt
          ? new Date(r.checkInAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
          : '—',
        method: r.method === 'face' ? 'Yuz' : r.method === 'auto-absent' ? 'Avto' : 'Qoʻlda',
        confidence: r.confidence ? `${(r.confidence * 100).toFixed(1)}%` : '—',
        markedBy: r.markedBy?.fullName ?? '—',
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `davomat_${from || 'all'}_${to || 'all'}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('GET /api/attendance/export:', err);
    return NextResponse.json({ error: 'Excel yaratishda xato' }, { status: 500 });
  }
}
