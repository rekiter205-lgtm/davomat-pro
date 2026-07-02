/**
 * POST /api/students/bulk-import
 *
 * FormData:
 *   - excel: .xlsx file with columns:
 *       fullName | phone | parentPhone | groupName | photoFile
 *   - zip: ZIP archive containing student photos (filenames match `photoFile` column)
 *
 * Returns: { imported: number, errors: string[], credentials: [{ fullName, username, password }] }
 *
 * For each student:
 *   1. Reads the row
 *   2. Finds photo from ZIP by filename
 *   3. Saves photo to /uploads
 *   4. Creates Student + auto-generated User account (STUDENT role)
 *   5. Returns credentials list for admin
 *
 * Note: faceDescriptor must be set later via UI (this endpoint only uploads).
 */
import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import crypto from 'node:crypto';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';

import { prisma } from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { generateUniqueUsername, generatePassword } from '@/lib/generator';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Faqat administrator' }, { status: 403 });
    }

    const formData = await req.formData();
    const excelFile = formData.get('excel') as File | null;
    const zipFile = formData.get('zip') as File | null;

    if (!excelFile) {
      return NextResponse.json({ error: 'Excel fayli yuborilmadi' }, { status: 400 });
    }

    // ── 1. Parse Excel ──────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await excelFile.arrayBuffer());
    const sheet = workbook.worksheets[0];
    if (!sheet) return NextResponse.json({ error: 'Excel boʻsh' }, { status: 400 });

    // Read header row (first row) to find column indices
    const headerRow = sheet.getRow(1);
    const columnMap: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      const value = String(cell.value || '').trim().toLowerCase();
      columnMap[value] = colNumber;
    });

    // Look for column variants (Uzbek or English)
    const colFullName = columnMap['f.i.sh'] || columnMap['ism'] || columnMap['fullname'] || columnMap['fio'];
    const colPhone = columnMap['telefon'] || columnMap['phone'] || 0;
    const colParentPhone = columnMap['ota-ona telefoni'] || columnMap['parent phone'] || columnMap['parentphone'] || 0;
    const colGroup = columnMap['guruh'] || columnMap['sinf'] || columnMap['group'] || columnMap['groupname'] || 0;
    const colPhotoFile = columnMap['rasm'] || columnMap['photo'] || columnMap['photofile'] || 0;

    if (!colFullName) {
      return NextResponse.json(
        { error: 'Excel\'da "F.I.Sh" yoki "Ism" ustuni topilmadi' },
        { status: 400 },
      );
    }

    // ── 2. Parse ZIP (if provided) ──────────────────────────
    let zip: JSZip | null = null;
    if (zipFile) {
      zip = await JSZip.loadAsync(await zipFile.arrayBuffer());
    }

    // ── 3. Process each row ─────────────────────────────────
    const credentials: Array<{ fullName: string; username: string; password: string; groupName?: string }> = [];
    const errors: string[] = [];
    let imported = 0;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    // Cache: group name → group id
    const groupCache = new Map<string, string>();

    const rowCount = sheet.rowCount;
    for (let i = 2; i <= rowCount; i++) {
      const row = sheet.getRow(i);
      const fullName = String(row.getCell(colFullName).value || '').trim();
      if (!fullName) continue;

      try {
        const phone = colPhone ? String(row.getCell(colPhone).value || '').trim() : '';
        const parentPhone = colParentPhone ? String(row.getCell(colParentPhone).value || '').trim() : '';
        const groupName = colGroup ? String(row.getCell(colGroup).value || '').trim() : '';
        const photoFileName = colPhotoFile ? String(row.getCell(colPhotoFile).value || '').trim() : '';

        // Resolve group
        let groupId: string | null = null;
        if (groupName) {
          if (groupCache.has(groupName)) {
            groupId = groupCache.get(groupName)!;
          } else {
            const grp = await prisma.group.upsert({
              where: { name: groupName },
              update: {},
              create: { name: groupName },
            });
            groupId = grp.id;
            groupCache.set(groupName, grp.id);
          }
        }

        // Save photo (if found in ZIP)
        let photoUrl = '/uploads/placeholder.png';
        if (zip && photoFileName) {
          const file = zip.file(photoFileName) || zip.file(`photos/${photoFileName}`);
          if (file) {
            const ext = (photoFileName.split('.').pop() || 'jpg').toLowerCase();
            const newName = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
            const buf = await file.async('nodebuffer');
            await writeFile(path.join(uploadDir, newName), buf);
            photoUrl = `/uploads/${newName}`;
          } else {
            errors.push(`Qator ${i}: ${fullName} — rasm topilmadi (${photoFileName})`);
          }
        }

        // Auto-generate username + password
        const username = await generateUniqueUsername(fullName, async (u) => {
          const e = await prisma.user.findUnique({ where: { username: u } });
          return !!e;
        });
        const password = generatePassword(8);

        // Create user
        const user = await prisma.user.create({
          data: {
            username,
            fullName,
            phone: phone || null,
            passwordHash: await hashPassword(password),
            plainPassword: password, // stored so admin can re-view
            role: 'STUDENT',
          },
        });

        // Create student linked to user
        await prisma.student.create({
          data: {
            fullName,
            phone: phone || null,
            parentPhone: parentPhone || null,
            photoUrl,
            groupId,
            userId: user.id,
          },
        });

        credentials.push({ fullName, username, password, groupName: groupName || undefined });
        imported++;
      } catch (err: any) {
        errors.push(`Qator ${i}: ${fullName} — ${err.message || 'xato'}`);
      }
    }

    audit({
      action: 'student.bulk_import',
      actorId: session.sub,
      actorName: session.fullName,
      details: { imported, errorCount: errors.length },
    });

    return NextResponse.json({ imported, errors, credentials });
  } catch (err: any) {
    console.error('POST /api/students/bulk-import:', err);
    return NextResponse.json({ error: err.message || 'Server xatosi' }, { status: 500 });
  }
}
