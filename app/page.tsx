import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  GraduationCap,
  ScanFace,
  BellRing,
  BarChart3,
  ShieldCheck,
  Users,
  CalendarClock,
  ArrowRight,
  CheckCircle2,
  Camera,
  UserPlus,
  FileSpreadsheet,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    if (user.role === 'STUDENT') redirect('/my-attendance');
    if (user.role === 'PARENT') redirect('/my-children');
    if (user.role === 'TEACHER') redirect('/today');
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 backdrop-blur bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-md shadow-brand-500/30">
              <GraduationCap className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-50">Davomat Pro</span>
          </div>
          <Link href="/login" className="btn-primary px-5">
            Tizimga kirish
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 px-4 py-1.5 text-xs font-semibold mb-6">
          <ScanFace className="w-3.5 h-3.5" />
          AI yuz tanish texnologiyasi
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 leading-tight">
          Maktab davomati —{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600">
            3 soniyada
          </span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-400">
          O&apos;quvchi kameraga qaraydi — tizim yuzini taniydi, davomatni belgilaydi va
          ota-onaga xabar yuboradi. Qog&apos;oz jurnallar davri tugadi.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login" className="btn-primary text-base px-8 py-3">
            Demo ko&apos;rish <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="#features" className="btn-secondary text-base px-8 py-3">
            Imkoniyatlar
          </a>
        </div>

        {/* Stats strip */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {[
            ['~3 s', 'yuzni tanish va belgilash'],
            ['0 ta', 'qogʻoz jurnal'],
            ['4 rol', 'admin, oʻqituvchi, oʻquvchi, ota-ona'],
            ['100%', 'oʻzbek tilida'],
          ].map(([num, label]) => (
            <div key={label} className="card p-4">
              <div className="text-2xl font-extrabold text-brand-600 dark:text-brand-400">{num}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-slate-50">
          Bitta tizim — butun maktab
        </h2>
        <p className="text-center text-slate-500 dark:text-slate-400 mt-3 max-w-xl mx-auto">
          Davomatdan hisobotgacha, dars jadvalidan ota-onalar xabarnomasigacha.
        </p>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: ScanFace,
              title: 'AI yuz orqali davomat',
              text: 'Kamera darsning belgilangan daqiqalarida ochiladi, oʻquvchilarni avtomatik taniydi va belgilaydi. Qoʻlda belgilash ham mavjud.',
            },
            {
              icon: BellRing,
              title: 'Ota-onaga xabarnoma',
              text: 'Farzandi maktabga kelgan zahoti ota-onaga Telegram yoki SMS orqali avtomatik xabar boradi.',
            },
            {
              icon: CalendarClock,
              title: 'Dars jadvali va paralar',
              text: 'Fanlar, paralar va haftalik jadval bilan davomat aynan oʻz darsiga bogʻlanadi.',
            },
            {
              icon: BarChart3,
              title: 'Hisobot va tahlil',
              text: 'Kunlik, haftalik, oylik dinamika; sinf va oʻquvchi kesimida grafiklar hamda bir tugma bilan Excel eksport.',
            },
            {
              icon: Users,
              title: '4 xil rol',
              text: 'Administrator boshqaradi, oʻqituvchi yoʻqlama qiladi, oʻquvchi oʻz davomatini, ota-ona farzandinikini kuzatadi.',
            },
            {
              icon: ShieldCheck,
              title: 'Xavfsizlik',
              text: 'JWT sessiyalar, rollarga asoslangan ruxsatlar, brute-force himoyasi va shifrlangan parollar.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-brand-100 dark:bg-brand-950 mb-4">
                <Icon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-slate-50">
          Qanday ishlaydi?
        </h2>
        <div className="mt-12 grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: UserPlus,
              step: '1',
              title: 'Roʻyxatga olish',
              text: 'Oʻquvchining bitta aniq surati yuklanadi — tizim yuz belgilarini bir marta oʻrganadi.',
            },
            {
              icon: Camera,
              step: '2',
              title: 'Kameraga qarash',
              text: 'Dars boshida oʻquvchi kameraga qaraydi. Tizim uni ~3 soniyada taniydi va davomatga yozadi.',
            },
            {
              icon: FileSpreadsheet,
              step: '3',
              title: 'Natijani kuzatish',
              text: 'Ota-onaga xabar boradi, rahbariyat esa jonli statistika va Excel hisobotlarini koʻradi.',
            },
          ].map(({ icon: Icon, step, title, text }) => (
            <div key={step} className="card p-6 text-center relative">
              <div className="absolute top-4 right-5 text-5xl font-extrabold text-slate-100 dark:text-slate-800 select-none">
                {step}
              </div>
              <div className="relative flex items-center justify-center w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-md shadow-brand-500/30 mb-4">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="relative font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
              <p className="relative mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Privacy note ────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="card p-6 flex items-start gap-4">
          <ShieldCheck className="w-8 h-8 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Maxfiylik birinchi o&apos;rinda
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Tizim yuz suratlarini emas, matematik belgilar to&apos;plamini (128 ta raqam) saqlaydi —
              undan suratni qayta tiklab bo&apos;lmaydi. Barcha ma&apos;lumotlar maktabning o&apos;z
              serverida qoladi.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 p-10 sm:p-14 text-center shadow-xl shadow-brand-600/20">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Maktabingizni raqamlashtiring
          </h2>
          <p className="mt-4 text-brand-100 max-w-xl mx-auto">
            O&apos;rnatish bir kunda. O&apos;qituvchilarga trening shart emas — hammasi o&apos;zbek
            tilida va intuitiv.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-brand-100">
            {['Bir kunda oʻrnatish', 'Trening talab qilinmaydi', 'Oʻz serveringizda'].map(
              (t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> {t}
                </span>
              ),
            )}
          </div>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white text-brand-700 font-semibold px-8 py-3 hover:bg-brand-50 transition-colors"
          >
            Demo ko&apos;rish <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <GraduationCap className="w-4 h-4" />
            © {new Date().getFullYear()} Davomat Pro
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            O&apos;zbekiston maktablari uchun yaratilgan
          </p>
        </div>
      </footer>
    </div>
  );
}
