'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2, X, Loader2, CalendarDays, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { DAY_LABELS_UZ, DAY_LABELS_UZ_FULL, dayCodeOf, type DayCode } from '@/lib/utils';

// Yakshanbasiz — 6 kunlik hafta (Du–Sha)
const WEEK_DAYS: DayCode[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Lesson {
  id: string;
  dayOfWeek: string;
  attendanceWindowMinutes: number;
  subject: { id: string; name: string; color: string };
  group: { id: string; name: string };
  teacher: { id: string; fullName: string };
  period: { id: string; number: number; name: string; startTime: string; endTime: string };
}

interface Subject { id: string; name: string; color: string }
interface Group { id: string; name: string }
interface Teacher { id: string; fullName: string; role: string }
interface Period { id: string; number: number; name: string; startTime: string; endTime: string }

export default function SchedulePage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const isAdmin = userRole === 'ADMIN';

  const [selectedGroup, setSelectedGroup] = useState<string>('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<DayCode>('Mon');
  const [periodId, setPeriodId] = useState('');
  const [windowMinutes, setWindowMinutes] = useState(5);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const todayCode = dayCodeOf(new Date());

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUserRole(d.user?.role || ''));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [l, s, g, t, p] = await Promise.all([
      fetch('/api/lessons').then(r => r.json()),
      fetch('/api/subjects').then(r => r.json()).catch(() => ({ subjects: [] })),
      fetch('/api/groups').then(r => r.json()).catch(() => ({ groups: [] })),
      fetch('/api/teachers').then(r => r.json()).catch(() => ({ users: [] })),
      fetch('/api/periods').then(r => r.json()).catch(() => ({ periods: [] })),
    ]);
    setLessons(l.lessons || []);
    setSubjects(s.subjects || []);
    setGroups(g.groups || []);
    setTeachers((t.users || []).filter((u: any) => u.role === 'TEACHER'));
    setPeriods(p.periods || []);
    if ((g.groups || []).length > 0) {
      setSelectedGroup((prev) => prev || g.groups[0].id);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const groupLessons = useMemo(() => {
    if (!selectedGroup) return [];
    return lessons.filter((l) => l.group.id === selectedGroup);
  }, [lessons, selectedGroup]);

  const tableData = useMemo(() => {
    const map: Record<string, Record<string, Lesson | null>> = {};
    periods.forEach((p) => {
      map[p.id] = {};
      WEEK_DAYS.forEach((d) => {
        map[p.id][d] = groupLessons.find((l) => l.period.id === p.id && l.dayOfWeek === d) || null;
      });
    });
    return map;
  }, [groupLessons, periods]);

  function openNew() {
    setEditing(null);
    setSubjectId(subjects[0]?.id || '');
    setGroupId(selectedGroup || groups[0]?.id || '');
    setTeacherId(teachers[0]?.id || '');
    setDayOfWeek('Mon');
    setPeriodId(periods[0]?.id || '');
    setWindowMinutes(5);
    setShowForm(true);
  }

  function openEdit(l: Lesson) {
    setEditing(l);
    setSubjectId(l.subject.id);
    setGroupId(l.group.id);
    setTeacherId(l.teacher.id);
    setDayOfWeek(l.dayOfWeek as DayCode);
    setPeriodId(l.period.id);
    setWindowMinutes(l.attendanceWindowMinutes);
    setShowForm(true);
  }

  function quickAdd(periodId: string, dayCode: DayCode) {
    setEditing(null);
    setSubjectId(subjects[0]?.id || '');
    setGroupId(selectedGroup);
    setTeacherId(teachers[0]?.id || '');
    setDayOfWeek(dayCode);
    setPeriodId(periodId);
    setWindowMinutes(5);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId || !groupId || !teacherId || !periodId) {
      toast.error('Hamma maydonlarni toʻldiring');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        subjectId, groupId, teacherId, dayOfWeek, periodId,
        attendanceWindowMinutes: windowMinutes,
      };
      const res = editing
        ? await fetch(`/api/lessons/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/lessons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editing ? 'Yangilandi' : 'Dars qoʻshildi');
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Xato');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const r = await fetch(`/api/lessons/${id}`, { method: 'DELETE' });
    if (r.ok) { toast.success('Oʻchirildi'); load(); }
    else { toast.error('Xato'); }
    setConfirmId(null);
  }

  const selectedGroupName = groups.find((g) => g.id === selectedGroup)?.name;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Dars jadvali</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {selectedGroupName ? `${selectedGroupName} sinfi · 6 kunlik jadval` : "Sinfni tanlang"}
          </p>
        </div>
        {isAdmin && (
          <button onClick={openNew} className="btn-primary" disabled={periods.length === 0 || !selectedGroup}>
            <Plus className="w-4 h-4" /> Yangi dars
          </button>
        )}
      </div>

      {isAdmin && periods.length === 0 && (
        <div className="card p-4 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            ⚠️ Avval <Link href="/periods" className="underline font-medium">Paralar</Link> sahifasidan dars vaqtlarini belgilang
          </p>
        </div>
      )}

      <div className="card p-3">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Sinfni tanlang:</span>
        </div>
        {groups.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Sinflar yoʻq. <Link href="/groups" className="underline">Sinf qoʻshing</Link></p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGroup(g.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedGroup === g.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Yuklanmoqda...</div>
      ) : !selectedGroup ? (
        <div className="card p-16 text-center">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Sinfni tanlang</p>
        </div>
      ) : periods.length === 0 ? (
        <div className="card p-16 text-center">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Paralar belgilanmagan</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50 dark:bg-slate-800/50 min-w-[100px]">
                  Para
                </th>
                {WEEK_DAYS.map((d) => (
                  <th
                    key={d}
                    className={`text-center px-3 py-2.5 font-medium min-w-[140px] ${
                      d === todayCode
                        ? 'bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {DAY_LABELS_UZ_FULL[d]}
                    {d === todayCode && <div className="text-[10px] font-normal text-brand-600 dark:text-brand-400">Bugun</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {periods.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20">
                  <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100 sticky left-0 bg-white dark:bg-slate-900 whitespace-nowrap">
                    <div className="text-sm">{p.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{p.startTime}-{p.endTime}</div>
                  </td>
                  {WEEK_DAYS.map((d) => {
                    const l = tableData[p.id][d];
                    if (!l) {
                      return (
                        <td key={d} className="px-2 py-2 text-center">
                          {isAdmin ? (
                            <button
                              onClick={() => quickAdd(p.id, d)}
                              className="w-full h-full min-h-[48px] flex items-center justify-center rounded-md text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-500 transition-colors"
                              title="Dars qoʻshish"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    }
                    return (
                      <td key={d} className="px-2 py-2">
                        <div
                          className="p-2 rounded-md text-xs hover:shadow-md transition-shadow group relative"
                          style={{ background: `${l.subject.color}15`, borderLeft: `3px solid ${l.subject.color}` }}
                        >
                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{l.subject.name}</div>
                          <div className="text-slate-500 truncate text-[10px] mt-0.5">{l.teacher.fullName}</div>
                          {isAdmin && (
                            <div className="absolute top-1 right-1 hidden group-hover:flex gap-1 bg-white dark:bg-slate-900 rounded shadow-sm p-0.5">
                              <button onClick={() => openEdit(l)} className="text-slate-400 hover:text-brand-600 p-0.5">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              {confirmId === l.id ? (
                                <button onClick={() => handleDelete(l.id)} className="text-rose-600 text-[10px] px-1">✓</button>
                              ) : (
                                <button onClick={() => setConfirmId(l.id)} className="text-rose-400 hover:text-rose-600 p-0.5">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="card p-6 w-full max-w-md animate-fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {editing ? 'Darsni tahrirlash' : 'Yangi dars'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Fan <span className="text-rose-500">*</span>
                </label>
                <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
                  <option value="">— tanlang —</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Sinf <span className="text-rose-500">*</span>
                </label>
                <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
                  <option value="">— tanlang —</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Oʻqituvchi <span className="text-rose-500">*</span>
                </label>
                <select className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} required>
                  <option value="">— tanlang —</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Hafta kuni <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEK_DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDayOfWeek(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        dayOfWeek === d
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {DAY_LABELS_UZ[d]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Para <span className="text-rose-500">*</span>
                </label>
                <select className="input" value={periodId} onChange={(e) => setPeriodId(e.target.value)} required>
                  <option value="">— tanlang —</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.startTime}–{p.endTime})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Yoʻqlama oynasi (daqiqa)
                </label>
                <input
                  type="number"
                  className="input"
                  value={windowMinutes}
                  onChange={(e) => setWindowMinutes(parseInt(e.target.value) || 5)}
                  min={1}
                  max={60}
                />
                <p className="text-xs text-slate-400 mt-1">Dars boshlanishidan necha daqiqa kamera ochiq</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? 'Saqlanmoqda...' : (editing ? 'Yangilash' : 'Yaratish')}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Bekor qilish</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}