'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, GraduationCap, UserCog, ScanFace,
  ClipboardList, FileBarChart, X, GraduationCap as Logo,
  UserCheck, Heart, BookOpen, CalendarDays, Clock, Upload, ScrollText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
  open?: boolean;
  onClose?: () => void;
}

const links = [
  { href: '/dashboard',         label: 'Bosh sahifa',         icon: LayoutDashboard, roles: ['ADMIN'] },
  // TEACHER's primary view is "Today's lessons" page (replaces dashboard)
  { href: '/today',             label: 'Bugungi darslar',     icon: ScanFace,        roles: ['TEACHER'] },
  { href: '/schedule',          label: 'Dars jadvali',        icon: CalendarDays,    roles: ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'] },
  { href: '/attendance',        label: 'Davomat tarixi',      icon: ClipboardList,   roles: ['ADMIN', 'TEACHER'] },
  { href: '/students',          label: 'Talabalar',           icon: Users,           roles: ['ADMIN'] },
  { href: '/students/import',   label: 'Excel orqali yuklash', icon: Upload,         roles: ['ADMIN'] },
  { href: '/groups',            label: 'Sinflar',             icon: GraduationCap,   roles: ['ADMIN'] },
  { href: '/subjects',          label: 'Fanlar',              icon: BookOpen,        roles: ['ADMIN'] },
  { href: '/periods',           label: 'Paralar',             icon: Clock,           roles: ['ADMIN'] },
  { href: '/teachers',          label: 'Foydalanuvchilar',    icon: UserCog,         roles: ['ADMIN'] },
  { href: '/parents',           label: 'Ota-onalar',          icon: Heart,           roles: ['ADMIN'] },
  { href: '/reports',           label: 'Hisobotlar',          icon: FileBarChart,    roles: ['ADMIN'] },
  { href: '/audit',             label: 'Audit jurnali',       icon: ScrollText,      roles: ['ADMIN'] },
  { href: '/my-attendance',     label: 'Mening davomatim',    icon: UserCheck,       roles: ['STUDENT'] },
  { href: '/my-children',       label: 'Farzandlarim',        icon: Heart,           roles: ['PARENT'] },
];

export default function Sidebar({ role, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const visible = links.filter((l) => l.roles.includes(role));

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-slate-900',
          'border-r border-slate-200 dark:border-slate-800 flex flex-col',
          'transition-transform lg:transform-none',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-500/20">
              <Logo className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-50 leading-none">Davomat Pro</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">v1.0</div>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {visible.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== '/dashboard' && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
                )}
              >
                <Icon className={cn('w-5 h-5', active ? 'text-brand-600 dark:text-brand-400' : '')} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-400 text-center">
            Davomat Pro © {new Date().getFullYear()}
          </div>
        </div>
      </aside>
    </>
  );
}