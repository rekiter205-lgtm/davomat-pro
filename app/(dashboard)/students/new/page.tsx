'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Loader2, ScanFace, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { loadFaceModels, descriptorFromImage, descriptorToArray } from '@/ai/face-recognition';
import { MAX_FACE_SAMPLES } from '@/lib/face-utils';

interface Group { id: string; name: string }

type SampleStatus = 'pending' | 'ok' | 'noface' | 'error';

interface PhotoSample {
  id: string;
  file: File;
  previewUrl: string;
  descriptor: number[] | null;
  status: SampleStatus;
}

/** Faylni data-URL sifatida o'qiydi (oldindan ko'rish va yuz aniqlash uchun). */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target?.result as string);
    reader.onerror = () => reject(new Error('Faylni oʻqib boʻlmadi'));
    reader.readAsDataURL(file);
  });
}

/**
 * Rasmni DOM'ga qo'shmasdan yuklaydi. face-api.js istalgan yuklangan
 * HTMLImageElement bilan ishlaydi, shuning uchun har bir namuna uchun
 * sahifada <img> va ref saqlash shart emas.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Rasmni yuklab boʻlmadi'));
    img.src = src;
  });
}

const STATUS_LABEL: Record<SampleStatus, string> = {
  pending: 'Aniqlanmagan',
  ok: 'Yuz olindi',
  noface: 'Yuz topilmadi',
  error: 'Xato',
};

export default function StudentFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEdit = !!editId;

  const [groups, setGroups] = useState<Group[]>([]);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [groupId, setGroupId] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [samples, setSamples] = useState<PhotoSample[]>([]);
  const [existingSampleCount, setExistingSampleCount] = useState(0);

  const [extracting, setExtracting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFaceModels()
      .then(() => setModelsLoading(false))
      .catch((err) => {
        console.error(err);
        toast.error('AI modellarni yuklashda xato');
        setModelsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch('/api/groups').then(r => r.json()).then(d => setGroups(d.groups || []));
  }, []);

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/students/${editId}`)
      .then(r => r.json())
      .then(d => {
        if (d.student) {
          setFullName(d.student.fullName);
          setPhone(d.student.phone || '');
          setParentPhone(d.student.parentPhone || '');
          setGroupId(d.student.group?.id || '');
          setPhotoUrl(d.student.photoUrl);
          setExistingSampleCount(d.student.faceSampleCount ?? 0);
        }
      })
      .catch(() => toast.error('Talabani yuklashda xato'));
  }, [editId]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    // Bir xil faylni qayta tanlash mumkin bo'lishi uchun inputni tozalaymiz.
    e.target.value = '';
    if (files.length === 0) return;

    const room = MAX_FACE_SAMPLES - samples.length;
    if (room <= 0) {
      toast.error(`Eng koʻpi ${MAX_FACE_SAMPLES} ta rasm`);
      return;
    }
    const accepted = files.slice(0, room);
    if (files.length > room) {
      toast(`Faqat ${room} ta rasm qoʻshildi (chegara — ${MAX_FACE_SAMPLES} ta)`);
    }

    try {
      const added = await Promise.all(
        accepted.map(async (file) => ({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          file,
          previewUrl: await readAsDataUrl(file),
          descriptor: null,
          status: 'pending' as const,
        })),
      );
      setSamples((prev) => [...prev, ...added]);
    } catch {
      toast.error('Rasmlarni oʻqishda xato');
    }
  }

  function removeSample(id: string) {
    setSamples((prev) => prev.filter((s) => s.id !== id));
  }

  /**
   * Aniqlanmagan har bir rasmdan deskriptor chiqaradi.
   * Ketma-ket — bir vaqtda bir nechta aniqlash sekin qurilmalarni bo'g'adi.
   */
  async function extractFaces() {
    const todo = samples.filter((s) => s.status !== 'ok');
    if (todo.length === 0) {
      toast('Barcha rasmlardan yuz allaqachon olingan');
      return;
    }

    setExtracting(true);
    try {
      const results = new Map<string, Pick<PhotoSample, 'descriptor' | 'status'>>();
      for (const sample of todo) {
        try {
          const img = await loadImage(sample.previewUrl);
          const desc = await descriptorFromImage(img);
          results.set(
            sample.id,
            desc
              ? { descriptor: descriptorToArray(desc), status: 'ok' }
              : { descriptor: null, status: 'noface' },
          );
        } catch (err) {
          console.error(err);
          results.set(sample.id, { descriptor: null, status: 'error' });
        }
      }

      setSamples((prev) =>
        prev.map((s) => (results.has(s.id) ? { ...s, ...results.get(s.id)! } : s)),
      );

      const ok = Array.from(results.values()).filter((r) => r.status === 'ok').length;
      const failed = results.size - ok;
      if (ok > 0) {
        toast.success(
          failed > 0
            ? `${ok} ta rasmdan yuz olindi, ${failed} tasida topilmadi`
            : `${ok} ta rasmdan yuz maʼlumotlari olindi`,
        );
      } else {
        toast.error('Hech qaysi rasmda yuz topilmadi. Yorugʻroq va aniqroq rasm tanlang.');
      }
    } finally {
      setExtracting(false);
    }
  }

  async function uploadPhoto(file: File): Promise<string | null> {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data.url;
    } catch (err: any) {
      toast.error(err.message || 'Yuklashda xato');
      return null;
    } finally {
      setUploading(false);
    }
  }

  const readySamples = samples.filter((s) => s.status === 'ok' && s.descriptor);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Ismni kiriting');
      return;
    }
    if (!isEdit && samples.length === 0) {
      toast.error('Kamida bitta rasm yuklang');
      return;
    }
    if (!isEdit && readySamples.length === 0) {
      toast.error('"Yuzni aniqlash" tugmasini bosing va yuz maʼlumotlarini oling');
      return;
    }

    setSaving(true);
    try {
      let finalPhotoUrl = photoUrl;
      // Ko'rsatish uchun faqat bitta rasm saqlanadi — qolganlaridan faqat
      // deskriptor olinadi va rasmning o'zi hech qayerga yozilmaydi.
      const displaySample = readySamples[0] ?? samples[0];
      if (displaySample) {
        const url = await uploadPhoto(displaySample.file);
        if (!url) { setSaving(false); return; }
        finalPhotoUrl = url;
      }

      const payload: any = {
        fullName: fullName.trim(),
        phone: phone || null,
        parentPhone: parentPhone || null,
        groupId: groupId || null,
        photoUrl: finalPhotoUrl,
      };
      if (readySamples.length > 0) {
        payload.faceDescriptor = readySamples.map((s) => s.descriptor!);
      }

      const res = isEdit
        ? await fetch(`/api/students/${editId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xato');

      toast.success(isEdit ? 'Yangilandi' : 'Talaba qoʻshildi');
      router.push('/students');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Saqlashda xato');
    } finally {
      setSaving(false);
    }
  }

  const canSave = fullName.trim() && (isEdit || readySamples.length > 0);
  const pendingCount = samples.filter((s) => s.status !== 'ok').length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <Link href="/students" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-3">
          <ArrowLeft className="w-4 h-4 mr-1" /> Talabalar roʻyxatiga qaytish
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          {isEdit ? 'Talabani tahrirlash' : 'Yangi talaba qoʻshish'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isEdit ? 'Maʼlumotlarni yangilang' : 'Maʼlumotlarni toʻldiring va yuz maʼlumotlarini oling'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Rasm va yuz maʼlumotlari
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Turli yorugʻlik va rakursda {MAX_FACE_SAMPLES} tagacha rasm yuklang — yuz
              tanish shuncha ishonchli boʻladi. Roʻyxatda faqat birinchi rasm saqlanadi.
            </p>
          </div>

          {/* Namunalar to'ri */}
          {samples.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {samples.map((s) => (
                <div key={s.id} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.previewUrl} alt="Namuna" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeSample(s.id)}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                    title="Olib tashlash"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div
                    className={`absolute bottom-0 inset-x-0 px-1.5 py-0.5 text-[10px] text-white text-center ${
                      s.status === 'ok'
                        ? 'bg-emerald-600/90'
                        : s.status === 'pending'
                          ? 'bg-slate-600/90'
                          : 'bg-rose-600/90'
                    }`}
                  >
                    {STATUS_LABEL[s.status]}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="aspect-square w-full max-w-sm mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden relative border-2 border-dashed border-slate-300 dark:border-slate-700">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="Joriy rasm" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <Upload className="w-10 h-10 mb-2" />
                  <p className="text-sm">Rasm tanlang</p>
                </div>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={samples.length >= MAX_FACE_SAMPLES}
              className="btn-secondary flex-1"
            >
              <Upload className="w-4 h-4" /> Rasm qoʻshish ({samples.length}/{MAX_FACE_SAMPLES})
            </button>
            <button
              type="button"
              onClick={extractFaces}
              disabled={pendingCount === 0 || extracting || modelsLoading}
              className="btn-primary flex-1"
            >
              {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanFace className="w-4 h-4" />}
              Yuzni aniqlash
            </button>
          </div>

          {modelsLoading && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> AI modellar yuklanmoqda...
            </p>
          )}

          {readySamples.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>
                {readySamples.length} ta yuz namunasi tayyor
                {readySamples.length === 1 && ' — yana rasm qoʻshsangiz aniqlik oshadi'}
              </span>
            </div>
          )}

          {samples.some((s) => s.status === 'noface' || s.status === 'error') && (
            <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Baʼzi rasmlarda yuz topilmadi — ularni olib tashlang yoki almashtiring.</span>
            </div>
          )}

          {isEdit && existingSampleCount > 0 && readySamples.length === 0 && (
            <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
              <span>
                Bazada {existingSampleCount} ta yuz namunasi bor. Yangi rasm yuklab
                &quot;Yuzni aniqlash&quot; tugmasini bossangiz, ular butunlay almashtiriladi.
              </span>
            </div>
          )}
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Shaxsiy maʼlumotlar</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Toʻliq ismi <span className="text-rose-500">*</span>
            </label>
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Familiya Ism Sharif"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Telefon raqami
            </label>
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998901234567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Ota-ona telefon raqami
            </label>
            <input
              className="input"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="+998901234567"
            />
            <p className="text-xs text-slate-400 mt-1">SMS xabarnoma uchun ishlatiladi</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Guruh
            </label>
            <select
              className="input"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
            >
              <option value="">Guruh tanlanmagan</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={!canSave || saving || uploading}
              className="btn-primary flex-1"
            >
              {(saving || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saving || uploading ? 'Saqlanmoqda...' : (isEdit ? 'Yangilash' : 'Saqlash')}
            </button>
            <Link href="/students" className="btn-secondary">
              <X className="w-4 h-4" /> Bekor qilish
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
