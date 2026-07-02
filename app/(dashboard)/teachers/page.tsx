'use client';

import { useEffect, useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, UserCog, Mail, Phone, Eye, EyeOff, Copy, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
  isActive: boolean;
  createdAt: string;
  plainPassword?: string | null;
}

const ROLE_LABELS = {
  ADMIN: 'Administrator',
  TEACHER: 'Oʻqituvchi',
  STUDENT: 'Oʻquvchi',
  PARENT: 'Ota-ona',
};

const ROLE_COLORS = {
  ADMIN: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  TEACHER: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  STUDENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  PARENT: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [filterRole, setFilterRole] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showPasswordId, setShowPasswordId] = useState<string | null>(null);

  // Form state
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'TEACHER'>('TEACHER');
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/teachers').then((r) => r.json());
    setUsers(r.users || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (filterRole && u.role !== filterRole) return false;
      if (search) {
        const q = search.toLowerCase();
        return u.fullName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
      }
      return true;
    });
  }, [users, filterRole, search]);

  const roleCount = useMemo(() => {
    return {
      all: users.length,
      ADMIN: users.filter(u => u.role === 'ADMIN').length,
      TEACHER: users.filter(u => u.role === 'TEACHER').length,
      STUDENT: users.filter(u => u.role === 'STUDENT').length,
      PARENT: users.filter(u => u.role === 'PARENT').length,
    };
  }, [users]);

  function openNew() {
    setEditing(null);
    setUsername(''); setFullName(''); setEmail(''); setPhone(''); setPassword('');
    setRole('TEACHER');
    setShowForm(true);
  }

  function openEdit(u: User) {
    setEditing(u);
    setUsername(u.username);
    setFullName(u.fullName);
    setEmail(u.email || '');
    setPhone(u.phone || '');
    setPassword('');
    setRole(u.role === 'ADMIN' ? 'ADMIN' : 'TEACHER');
    setShowForm(true);
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
        role,
      };
      if (!editing) {
        payload.username = username.trim();
        payload.password = password;
      } else if (password) {
        payload.password = password;
      }

      const res = editing
        ? await fetch(`/api/teachers/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/teachers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xato');

      toast.success(editing ? 'Yangilandi' : 'Foydalanuvchi qoʻshildi');
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Xato');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/teachers/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Oʻchirildi'); load(); }
    else { toast.error('Xato'); }
    setConfirmId(null);
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Nusxa olindi');
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Foydalanuvchilar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Barcha tizim foydalanuvchilari · {filtered.length} ta
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus className="w-4 h-4" /> Yangi foydalanuvchi
        </button>
      </div>

      {/* Role filter pills */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterRole('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterRole === ''
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            Hammasi <span className="ml-1 opacity-75">({roleCount.all})</span>
          </button>
          {(['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterRole === r
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {ROLE_LABELS[r]} <span className="ml-1 opacity-75">({roleCount[r]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="card p-3">
        <input
          type="search"
          className="input"
          placeholder="Ism yoki username boʻyicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Yuklanmoqda...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <UserCog className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Foydalanuvchi topilmadi</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">F.I.Sh</th>
                <th className="text-left px-4 py-2.5 font-medium">Rol</th>
                <th className="text-left px-4 py-2.5 font-medium">Username</th>
                <th className="text-left px-4 py-2.5 font-medium">Parol</th>
                <th className="text-left px-4 py-2.5 font-medium">Aloqa</th>
                <th className="text-right px-4 py-2.5 font-medium">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">{u.fullName}</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${ROLE_COLORS[u.role]} text-xs`}>{ROLE_LABELS[u.role]}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono text-brand-600 dark:text-brand-400 text-xs">{u.username}</code>
                      <button onClick={() => copyText(u.username)} className="text-slate-300 hover:text-slate-600" title="Nusxa olish">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {u.plainPassword ? (
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono text-amber-600 dark:text-amber-400 text-xs">
                          {showPasswordId === u.id ? u.plainPassword : '••••••••'}
                        </code>
                        <button
                          onClick={() => setShowPasswordId(showPasswordId === u.id ? null : u.id)}
                          className="text-slate-300 hover:text-slate-600"
                          title="Koʻrsatish/Yashirish"
                        >
                          {showPasswordId === u.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        <button onClick={() => copyText(u.plainPassword!)} className="text-slate-300 hover:text-slate-600" title="Nusxa olish">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {u.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {u.phone}
                      </div>
                    )}
                    {u.email && (
                      <div className="flex items-center gap-1 mt-0.5 truncate max-w-[200px]">
                        <Mail className="w-3 h-3" /> {u.email}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="btn-ghost p-1.5 text-slate-500">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {confirmId === u.id ? (
                        <button onClick={() => handleDelete(u.id)} className="btn-danger text-xs py-1 px-2">Tasdiq</button>
                      ) : (
                        <button onClick={() => setConfirmId(u.id)} className="btn-ghost p-1.5 text-rose-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="card p-6 w-full max-w-md animate-fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {editing ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Rol <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('TEACHER')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      role === 'TEACHER'
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Oʻqituvchi
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('ADMIN')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      role === 'ADMIN'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Administrator
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Oʻquvchi va ota-onalarni alohida sahifalarda yarating
                </p>
              </div>

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
                <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} disabled={!!editing} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Parol {!editing && <span className="text-rose-500">*</span>}
                  {editing && <span className="text-xs text-slate-400 font-normal"> (boʻsh — oʻzgarmaydi)</span>}
                </label>
                <input
                  type="text"
                  className="input font-mono"
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