'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Users, X, Loader2, GraduationCap, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

interface Group {
  id: string;
  name: string;
  description: string | null;
  _count: { students: number; lessons: number };
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Group | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const isAdmin = userRole === 'ADMIN';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUserRole(d.user?.role || ''));
  }, []);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/groups').then(r => r.json());
    setGroups(r.groups || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setName(''); setDescription('');
    setShowForm(true);
  }

  function openEdit(g: Group) {
    setEditing(g);
    setName(g.name);
    setDescription(g.description || '');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error('Sinf nomini kiriting'); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description || null };
      const res = editing
        ? await fetch(`/api/groups/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editing ? 'Yangilandi' : 'Sinf qoʻshildi');
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Xato');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const r = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
    if (r.ok) { toast.success('Oʻchirildi'); load(); }
    else { toast.error('Xato'); }
    setConfirmId(null);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Sinflar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin ? "Maktab sinflari" : "Sizga tayinlangan sinflar"}
          </p>
        </div>
        {isAdmin && (
          <button onClick={openNew} className="btn-primary">
            <Plus className="w-4 h-4" /> Yangi sinf
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Yuklanmoqda...</div>
      ) : groups.length === 0 ? (
        <div className="card p-16 text-center">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{isAdmin ? "Sinflar mavjud emas" : "Sizga sinf tayinlanmagan"}</p>
          {isAdmin && (
            <button onClick={openNew} className="btn-primary mt-4 inline-flex">
              <Plus className="w-4 h-4" /> Birinchi sinf
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groups.map((g) => (
            <div key={g.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div className="flex gap-1">
                  {isAdmin && (
                    <>
                      <button onClick={() => openEdit(g)} className="btn-ghost p-1.5 text-slate-500">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {confirmId === g.id ? (
                        <button onClick={() => handleDelete(g.id)} className="btn-danger text-xs py-1 px-2">Tasdiq</button>
                      ) : (
                        <button onClick={() => setConfirmId(g.id)} className="btn-ghost p-1.5 text-rose-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{g.name}</h3>
              {g.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{g.description}</p>}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Users className="w-3.5 h-3.5" />
                  <span>{g._count.students} ta talaba</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{g._count.lessons} ta dars</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="card p-6 w-full max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {editing ? 'Tahrirlash' : 'Yangi sinf'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Sinf nomi <span className="text-rose-500">*</span>
                </label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="masalan: 5-A" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tavsif</label>
                <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
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
