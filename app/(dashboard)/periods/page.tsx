'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface Period {
  id: string;
  number: number;
  name: string;
  startTime: string;
  endTime: string;
}

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Period | null>(null);

  const [number, setNumber] = useState(1);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('08:45');
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/periods').then((r) => r.json());
    setPeriods(r.periods || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    const next = (periods[periods.length - 1]?.number || 0) + 1;
    setNumber(next);
    setName(`${next}-dars`);
    // Suggest time based on last period
    if (periods.length > 0) {
      const last = periods[periods.length - 1];
      const [h, m] = last.endTime.split(':').map(Number);
      const newStartMin = h * 60 + m + 5; // 5 min break
      const sh = Math.floor(newStartMin / 60);
      const sm = newStartMin % 60;
      const newEndMin = newStartMin + 45;
      const eh = Math.floor(newEndMin / 60);
      const em = newEndMin % 60;
      setStartTime(`${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`);
      setEndTime(`${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`);
    } else {
      setStartTime('08:00');
      setEndTime('08:45');
    }
    setShowForm(true);
  }

  function openEdit(p: Period) {
    setEditing(p);
    setNumber(p.number);
    setName(p.name);
    setStartTime(p.startTime);
    setEndTime(p.endTime);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (endTime <= startTime) { toast.error('Tugash boshlanishdan keyin'); return; }
    setSaving(true);
    try {
      const payload = { number, name: name.trim(), startTime, endTime };
      const res = editing
        ? await fetch(`/api/periods/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/periods', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(editing ? 'Yangilandi' : 'Para qoʻshildi');
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Xato');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const r = await fetch(`/api/periods/${id}`, { method: 'DELETE' });
    if (r.ok) { toast.success('Oʻchirildi'); load(); }
    else { toast.error('Xato'); }
    setConfirmId(null);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Paralar (Dars vaqtlari)</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Maktabingizning para jadvali
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus className="w-4 h-4" /> Yangi para
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Yuklanmoqda...</div>
      ) : periods.length === 0 ? (
        <div className="card p-16 text-center">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-2">Paralar belgilanmagan</p>
          <p className="text-xs text-slate-400 mb-4">Avval para vaqtlarini belgilang (masalan: 1-dars 08:00–08:45)</p>
          <button onClick={openNew} className="btn-primary inline-flex">
            <Plus className="w-4 h-4" /> 1-parani qoʻshish
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">№</th>
                <th className="text-left px-4 py-3 font-medium">Nomi</th>
                <th className="text-left px-4 py-3 font-medium">Boshlanish</th>
                <th className="text-left px-4 py-3 font-medium">Tugash</th>
                <th className="text-left px-4 py-3 font-medium">Davomiyligi</th>
                <th className="text-right px-4 py-3 font-medium">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {periods.map((p) => {
                const [sh, sm] = p.startTime.split(':').map(Number);
                const [eh, em] = p.endTime.split(':').map(Number);
                const duration = (eh * 60 + em) - (sh * 60 + sm);
                return (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{p.number}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{p.startTime}</td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{p.endTime}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{duration} daqiqa</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="btn-ghost p-1.5 text-slate-500">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {confirmId === p.id ? (
                          <button onClick={() => handleDelete(p.id)} className="btn-danger text-xs py-1 px-2">
                            Tasdiq
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmId(p.id)}
                            className="btn-ghost p-1.5 text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="card p-6 w-full max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {editing ? 'Parani tahrirlash' : 'Yangi para'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Raqami</label>
                  <input type="number" className="input" value={number} onChange={(e) => setNumber(parseInt(e.target.value))} min={1} max={20} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nomi</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="masalan: 1-dars" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Boshlanish</label>
                  <input type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tugash</label>
                  <input type="time" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
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
