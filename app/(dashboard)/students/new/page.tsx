'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Loader2, ScanFace, CheckCircle2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { loadFaceModels, descriptorFromImage, descriptorToArray } from '@/ai/face-recognition';

interface Group { id: string; name: string }

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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const [hasFaceData, setHasFaceData] = useState(false);

  const [extractingFace, setExtractingFace] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

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
          setPreviewUrl(d.student.photoUrl);
          setHasFaceData(!!d.student.hasFaceData);
        }
      })
      .catch(() => toast.error('Talabani yuklashda xato'));
  }, [editId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    setDescriptor(null);

    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function extractFace() {
    if (!imgRef.current || !previewUrl) {
      toast.error('Avval rasmni yuklang');
      return;
    }
    setExtractingFace(true);
    try {
      if (!imgRef.current.complete) {
        await new Promise<void>((resolve) => {
          imgRef.current!.onload = () => resolve();
        });
      }
      const desc = await descriptorFromImage(imgRef.current);
      if (!desc) {
        toast.error('Yuz topilmadi. Boshqa rasm tanlang yoki yuz aniq koʻrinishini taʼminlang.');
        return;
      }
      setDescriptor(descriptorToArray(desc));
      toast.success('Yuz maʼlumotlari muvaffaqiyatli olindi!');
    } catch (err) {
      console.error(err);
      toast.error('Yuzni aniqlashda xato');
    } finally {
      setExtractingFace(false);
    }
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!photoFile) return photoUrl || null;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', photoFile);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Ismni kiriting');
      return;
    }
    if (!isEdit && !photoFile) {
      toast.error('Rasmni yuklang');
      return;
    }
    if (!isEdit && !descriptor) {
      toast.error('"Yuzni aniqlash" tugmasini bosing va yuz maʼlumotlarini oling');
      return;
    }

    setSaving(true);
    try {
      let finalPhotoUrl = photoUrl;
      if (photoFile) {
        const url = await uploadPhoto();
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
      if (descriptor) payload.faceDescriptor = descriptor;

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

  const canSave = fullName.trim() && (isEdit || (photoFile && descriptor));

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
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Rasm va yuz maʼlumotlari</h2>

          <div className="aspect-square w-full max-w-sm mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden relative border-2 border-dashed border-slate-300 dark:border-slate-700">
            {previewUrl ? (
              <img
                ref={imgRef}
                src={previewUrl}
                alt="Preview"
                crossOrigin="anonymous"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <Upload className="w-10 h-10 mb-2" />
                <p className="text-sm">Rasm tanlang</p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary flex-1"
            >
              <Upload className="w-4 h-4" /> {previewUrl ? 'Rasmni almashtirish' : 'Rasm yuklash'}
            </button>
            <button
              type="button"
              onClick={extractFace}
              disabled={!previewUrl || extractingFace || modelsLoading}
              className="btn-primary flex-1"
            >
              {extractingFace ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanFace className="w-4 h-4" />}
              Yuzni aniqlash
            </button>
          </div>

          {modelsLoading && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> AI modellar yuklanmoqda...
            </p>
          )}

          {descriptor && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Yuz maʼlumotlari muvaffaqiyatli olindi (128-oʻlchovli vektor)</span>
            </div>
          )}

          {isEdit && hasFaceData && !descriptor && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>Yuz maʼlumotlari mavjud. Yangilash uchun rasm yuklab "Yuzni aniqlash" tugmasini bosing.</span>
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
