'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, Heart, Phone, Mail, Users, Eye, EyeOff, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

interface Child {
  id: string;
  fullName: string;
  photoUrl: string;
  group: { id: string; name: string } | null;
}

interface Parent {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  children: Child[];
  createdAt: string;
  plainPassword?: string | null;
}

interface Student {
  id: string;
  fullName: string;
  group: { id: string; name: string } | null;
}

export default function ParentsPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Parent | null>(null);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [childrenIds, setChildrenIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showPasswordId, setShowPasswordId] = useState<string | null>(null);

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Nusxa olindi');
  }

  async function load() {
    setLoading(true);
    const [p, s] = await Promise.all([
      fetch('/api/parents').then(r => r.json()),
      fetch('/api/students').then(r => r.json()),
    ]);
    setParents(p.parents || []);
    setStudents(s.students || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setUsername(''); setFullName(''); setEmail(''); setPhone(''); setPassword('');
    setChildrenIds([]);
    setShowForm(true);
  }

  function openEdit(p: Parent) {
    setEditing(p);
    setUsername(p.username);
    setFullName(p.fullName);
    setEmail(p.email || '');
    setPhone(p.phone || '');
    setPassword('');
    setChildrenIds(p.children.map((c) => c.id));
    setShowForm(true);
  }

  function toggleChild(id: string) {
    setChildrenIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { toast.error('Ismni kiriting'); return; }
    if (!editing) {
      if (!username.trim()) { toast.error('Username kerak'); return; }
      if (password.length < 6) { toast.error('Parol kamida 6 belgi'); return; }
    }

    setSaving(true);
    try {
      const payload: any = {
        fullName: fullName.trim(),
        email: email || null,
        phone: phone || null,
        childrenIds,
      };
      if (!editing) {
        payload.username = username.trim();
        payload.password = password;
      } else if (password) {
        payload.password = password;
      }

      const res = editing
        ? await fetch(`/api/parents/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/parents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xato');

      toast.success(editing ? 'Yangilandi' : 'Ota-ona qoʻshildi');
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Saqlashda xato');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/parents/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Oʻchirildi');
      load();
    } else {
      toast.error('Xato');
    }
    setConfirmId(null);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Ota-onalar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ota-onalarni boshqarish va farzandlariga bogʻlash
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus className="w-4 h-4" /> Yangi ota-ona
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Yuklanmoqda...</div>
      ) : parents.length === 0 ? (
        <div className="card p-16 text-center">
          <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Ota-onalar mavjud emas</p>
          <button onClick={openNew} className="btn-primary mt-4 inline-flex">
            <Plus className="w-4 h-4" /> Birinchisini qoʻshish
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parents.map((p) => (
            <div key={p.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-md">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(p)}
                    className="btn-ghost p-1.5 text-slate-500"
                    title="Tahrirlash"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {confirmId === p.id ? (
                    <button onClick={() => handleDelete(p.id)} className="btn-danger text-xs py-1 px-2">
                      Tasdiq
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmId(p.id)}
                      className="btn-ghost p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      title="Oʻchirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{p.fullName}</h3>

              {/* Login / parol — admin ota-onaga aytib berishi uchun */}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <code className="font-mono text-brand-600 dark:text-brand-400">@{p.username}</code>
                  <button onClick={() => copyText(p.username)} className="text-slate-300 hover:text-slate-600" title="Nusxa olish">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                {p.plainPassword ? (
                  <div className="flex items-center gap-1.5">
                    <code className="font-mono text-amber-600 dark:text-amber-400">
                      {showPasswordId === p.id ? p.plainPassword : '••••••••'}
                    </code>
                    <button
                      onClick={() => setShowPasswordId(showPasswordId === p.id ? null : p.id)}
                      className="text-slate-300 hover:text-slate-600"
                      title="Koʻrsatish/Yashirish"
                    >
                      {showPasswordId === p.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button onClick={() => copyText(p.plainPassword!)} className="text-slate-300 hover:text-slate-600" title="Nusxa olish">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-slate-400 italic">parol saqlanmagan</span>
                )}
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                {p.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3" /> {p.phone}
                  </div>
                )}
                {p.email && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3 h-3" /> {p.email}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                  <Users className="w-3 h-3" /> Farzandlar ({p.children.length}):
                </div>
                {p.children.length === 0 ? (
                  <p className="text-xs italic text-slate-400">Bogʻlanmagan</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {p.children.map((c) => (
                      <div key={c.id} className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-full pl-1 pr-2 py-0.5">
                        <img src={c.photoUrl} alt="" className="w-4 h-4 rounded-full object-cover bg-slate-300"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/uploads/placeholder.png'; }}
                        />
                        <span>{c.fullName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="card p-6 w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {editing ? 'Tahrirlash' : 'Yangi ota-ona'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  F.I.Sh <span className="text-rose-500">*</span>
                </label>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!!editing}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Parol {!editing && <span className="text-rose-500">*</span>}
                  {editing && <span className="text-xs text-slate-400 font-normal"> (boʻsh — oʻzgarmaydi)</span>}
                </label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editing ? '••••••••' : 'kamida 6 belgi'}
                  required={!editing}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                  <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Telefon</label>
                  <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Farzandlar ({childrenIds.length} ta tanlandi)
                </label>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
                  {students.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Talabalar yoʻq</p>
                  ) : (
                    students.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 p-1.5 -mx-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={childrenIds.includes(s.id)}
                          onChange={() => toggleChild(s.id)}
                          className="w-4 h-4"
                        />
                        <span className="flex-1">{s.fullName}</span>
                        <span className="text-xs text-slate-400">{s.group?.name ?? '—'}</span>
                      </label>
                    ))
                  )}
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
