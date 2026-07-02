'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Trash2, Edit2, ScanFace, AlertCircle, Phone, KeyRound, X, Loader2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

interface Student {
  id: string;
  fullName: string;
  phone: string | null;
  parentPhone: string | null;
  photoUrl: string;
  hasFaceData: boolean;
  group: { id: string; name: string } | null;
  isActive: boolean;
}

interface Group { id: string; name: string }

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const isAdmin = userRole === 'ADMIN';

  // Account creation modal
  const [accountStudent, setAccountStudent] = useState<Student | null>(null);
  const [accUsername, setAccUsername] = useState('');
  const [accPassword, setAccPassword] = useState('');
  const [accSaving, setAccSaving] = useState(false);

  // Load current user role
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUserRole(d.user?.role || ''));
  }, []);

  function openAccountModal(s: Student) {
    setAccountStudent(s);
    // Suggest username from name (lowercase first word + last word initial)
    const parts = s.fullName.toLowerCase().split(' ');
    const suggestion = parts.length > 1 ? `${parts[0]}${parts[1][0] || ''}` : parts[0];
    setAccUsername(suggestion.replace(/[^a-z0-9]/g, ''));
    // Random 6-char password
    setAccPassword(Math.random().toString(36).slice(-8));
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!accountStudent) return;
    setAccSaving(true);
    try {
      const res = await fetch(`/api/students/${accountStudent.id}/account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: accUsername, password: accPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xato');
      toast.success(
        data.action === 'created'
          ? 'Akkaunt yaratildi!'
          : 'Parol yangilandi!'
      );
      // Don't close yet — let user copy credentials
    } catch (err: any) {
      toast.error(err.message || 'Xato');
    } finally {
      setAccSaving(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Nusxa olindi!');
  }

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (search) qs.set('search', search);
    if (groupFilter) qs.set('groupId', groupFilter);
    const res = await fetch(`/api/students?${qs.toString()}`);
    const data = await res.json();
    setStudents(data.students || []);
    setLoading(false);
  }, [search, groupFilter]);

  useEffect(() => {
    fetch('/api/groups').then(r => r.json()).then(d => setGroups(d.groups || []));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Talaba oʻchirildi');
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } else {
      toast.error('Oʻchirishda xato');
    }
    setConfirmId(null);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Talabalar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin
              ? "Talabalar roʻyxati, yuz maʼlumotlari va guruh boʻyicha boshqaruv"
              : "Sizning guruhlaringiz talabalari"}
          </p>
        </div>
        {isAdmin && (
          <Link href="/students/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Yangi talaba
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Ism boʻyicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="input sm:max-w-xs">
          <option value="">Barcha guruhlar</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Yuklanmoqda...</div>
      ) : students.length === 0 ? (
        <div className="card p-16 text-center">
          <p className="text-slate-500">Talaba topilmadi</p>
          {isAdmin && (
            <Link href="/students/new" className="btn-primary mt-4 inline-flex">
              <Plus className="w-4 h-4" /> Birinchi talaba qoʻshish
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {students.map((s) => (
            <div key={s.id} className="card p-4 hover:shadow-md transition-shadow flex flex-col">
              <div className="flex items-start gap-3">
                <img
                  src={s.photoUrl}
                  alt={s.fullName}
                  className="w-14 h-14 rounded-lg object-cover bg-slate-200"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/uploads/placeholder.png'; }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">{s.fullName}</h3>
                  <p className="text-xs text-slate-500 truncate">{s.group?.name ?? 'Guruhsiz'}</p>
                  {s.phone && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {s.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1.5">
                {s.hasFaceData ? (
                  <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]">
                    <ScanFace className="w-3 h-3 mr-1" /> Yuz tayyor
                  </span>
                ) : (
                  <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[10px]">
                    <AlertCircle className="w-3 h-3 mr-1" /> Yuz yoʻq
                  </span>
                )}
              </div>

              {isAdmin && (
                <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 flex gap-2">
                  <Link
                    href={`/students/new?id=${s.id}`}
                    className="flex-1 btn-secondary text-xs py-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Tahrirlash
                  </Link>
                  <button
                    onClick={() => openAccountModal(s)}
                    className="btn-ghost text-xs py-1.5 px-2.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                    title="Akkaunt yaratish"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                  {confirmId === s.id ? (
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="btn-danger text-xs py-1.5 px-2.5"
                    >
                      Tasdiq
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmId(s.id)}
                      className="btn-ghost text-xs py-1.5 px-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      title="Oʻchirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Account creation modal */}
      {accountStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setAccountStudent(null)}>
          <div className="card p-6 w-full max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-brand-600" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Login va parol yaratish
                </h2>
              </div>
              <button onClick={() => setAccountStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 mb-4 flex items-center gap-3">
              <img
                src={accountStudent.photoUrl}
                alt=""
                className="w-10 h-10 rounded-full object-cover bg-slate-200"
                onError={(e) => { (e.target as HTMLImageElement).src = '/uploads/placeholder.png'; }}
              />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{accountStudent.fullName}</div>
                <div className="text-xs text-slate-500">{accountStudent.group?.name ?? 'Guruhsiz'}</div>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Bu maʼlumotlar bilan oʻquvchi tizimga kirib, oʻz davomatini koʻra oladi. Mavjud akkaunt bo'lsa parol yangilanadi.
            </p>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Username
                </label>
                <div className="flex gap-2">
                  <input
                    className="input"
                    value={accUsername}
                    onChange={(e) => setAccUsername(e.target.value)}
                    placeholder="masalan: jasur"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(accUsername)}
                    className="btn-secondary px-3"
                    title="Nusxa olish"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Parol
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input font-mono"
                    value={accPassword}
                    onChange={(e) => setAccPassword(e.target.value)}
                    placeholder="kamida 6 belgi"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(accPassword)}
                    className="btn-secondary px-3"
                    title="Nusxa olish"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Bu maʼlumotlarni oʻquvchiga bering</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={accSaving} className="btn-primary flex-1">
                  {accSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  {accSaving ? 'Saqlanmoqda...' : 'Yaratish / Yangilash'}
                </button>
                <button type="button" onClick={() => setAccountStudent(null)} className="btn-secondary">
                  Yopish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
