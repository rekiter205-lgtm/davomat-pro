'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

interface Subject {
  id: string;
  name: string;
  description: string | null;
  color: string;
  _count: { lessons: number };
}

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#10b981', '#06b6d4', '#0ea5e9',
];

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/subjects');
    const data = await res.json();
    setSubjects(data.subjects || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setName(''); setDescription(''); setColor('#3b82f6');
    setShowForm(true);
  }

  function openEdit(s: Subject) {
    setEditing(s);
    setName(s.name);
    setDescription(s.description || '');
    setColor(s.color);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error('Fan nomini kiriting'); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description || null, color };
      const res = editing
        ? await fetch(`/api/subjects/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/subjects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xato');
      toast.success(editing ? 'Yangilandi' : 'Fan qoʻshildi');
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Saqlashda xato');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Oʻchirildi'); load(); }
    else { toast.error('Xato'); }
    setConfirmId(null);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Fanlar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Oʻqitiladigan fanlar roʻyxati
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus className="w-4 h-4" /> Yangi fan
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Yuklanmoqda...</div>
      ) : subjects.length === 0 ? (
        <div className="card p-16 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Fanlar mavjud emas</p>
          <button onClick={openNew} className="btn-primary mt-4 inline-flex">
            <Plus className="w-4 h-4" /> Birinchi fanni qoʻshish
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {subjects.map((s) => (
            <div key={s.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md"
                  style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}dd)` }}
                >
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(s)}
                    className="btn-ghost p-1.5 text-slate-500 hover:text-slate-700"
                    title="Tahrirlash"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {confirmId === s.id ? (
                    <button onClick={() => handleDelete(s.id)} className="btn-danger text-xs py-1 px-2">
                      Tasdiq
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmId(s.id)}
                      className="btn-ghost p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      title="Oʻchirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{s.name}</h3>
              {s.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{s.description}</p>
              )}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                {s._count.lessons} ta dars
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
                {editing ? 'Fanni tahrirlash' : 'Yangi fan'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Fan nomi <span className="text-rose-500">*</span>
                </label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="masalan: Matematika" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tavsif</label>
                <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Rang</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-lg transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-slate-100 scale-110' : ''}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? 'Saqlanmoqda...' : (editing ? 'Yangilash' : 'Yaratish')}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
