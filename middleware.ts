import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { AUTH_COOKIE } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

// API paths that require ADMIN role for writes
const ADMIN_API = [
  /^\/api\/teachers/, /^\/api\/groups/, /^\/api\/parents/,
  /^\/api\/subjects/, /^\/api\/periods/, /^\/api\/lessons/,
];

// Pages STUDENT/PARENT cannot access
const STAFF_ONLY_PAGES = [
  '/dashboard', '/today', '/students', '/groups', '/teachers', '/parents',
  '/subjects', '/periods', '/attendance', '/reports', '/audit',
];

// Pages TEACHER cannot access (admin-only)
const ADMIN_ONLY_PAGES = [
  '/dashboard', '/teachers', '/parents', '/subjects', '/periods', '/reports',
  '/groups', '/students', '/audit',
];

// Pages only STUDENT can access
const STUDENT_ONLY_PAGES = ['/my-attendance'];

// Pages only PARENT can access
const PARENT_ONLY_PAGES = ['/my-children'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static & Next internals — let through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/models') ||
    pathname.startsWith('/favicon') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;

  // API routes → JSON 401
  if (pathname.startsWith('/api/')) {
    if (!session) {
      return NextResponse.json({ error: 'Avtorizatsiya talab qilinadi' }, { status: 401 });
    }
    // Admin-only API guard (only DELETE/POST/PUT — reads allowed for teachers)
    if (
      ADMIN_API.some((re) => re.test(pathname)) &&
      ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) &&
      session.role !== 'ADMIN'
    ) {
      return NextResponse.json({ error: 'Faqat administrator bajarishi mumkin' }, { status: 403 });
    }
    return NextResponse.next();
  }

  // Page routes → redirect to /login
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Role-based page access control
  const isStaff = session.role === 'ADMIN' || session.role === 'TEACHER';
  const isStudent = session.role === 'STUDENT';
  const isParent = session.role === 'PARENT';

  // Block STUDENT/PARENT from staff pages
  if (!isStaff && STAFF_ONLY_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const url = req.nextUrl.clone();
    url.pathname = isStudent ? '/my-attendance' : isParent ? '/my-children' : '/login';
    return NextResponse.redirect(url);
  }

  // Block staff from student pages
  if (!isStudent && STUDENT_ONLY_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Block staff from parent pages
  if (!isParent && PARENT_ONLY_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Block ADMIN-only pages from TEACHER
  if (session.role === 'TEACHER' && ADMIN_ONLY_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const url = req.nextUrl.clone();
    url.pathname = '/today';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
