import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';

import { writeFile, mkdir } from 'node:fs/promises';
import crypto from 'node:crypto';

import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '5', 10);

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'TEACHER')) {
      return NextResponse.json({ error: 'Ruxsat yoʻq' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Fayl yuborilmadi' }, { status: 400 });
    }
    const ext = ALLOWED[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: `Faqat ${Object.keys(ALLOWED).join(', ')} fayllariga ruxsat` },
        { status: 400 },
      );
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `Fayl hajmi ${MAX_MB}MB dan oshmasligi kerak` },
        { status: 400 },
      );
    }

    const filename = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    const dest = path.join(uploadDir, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(dest, Buffer.from(bytes));

    const url = `/uploads/${filename}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error('POST /api/upload:', err);
    return NextResponse.json({ error: 'Yuklashda xato' }, { status: 500 });
  }
}
