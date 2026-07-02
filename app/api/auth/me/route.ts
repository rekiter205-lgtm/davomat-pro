import { NextResponse } from 'next/server';
import { getCurrentUserFresh } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUserFresh();
  if (!user) {
    return NextResponse.json({ error: 'Avtorizatsiyadan oʻtmagan' }, { status: 401 });
  }
  return NextResponse.json({ user });
}
