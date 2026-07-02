'use client';

import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, FileArchive, Download, CheckCircle2, AlertCircle, Loader2, Copy, X, Image as ImageIcon, Folder } from 'lucide-react';
import toast from 'react-hot-toast';

interface Credential {
  fullName: string;
  username: string;
  password: string;
  groupName?: string;
}

export default function ImportPage() {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[]; credentials: Credential[] } | null>(null);

  const excelRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    if (!excelFile) { toast.error('Excel faylni tanlang'); return; }
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('excel', excelFile);
      if (zipFile) fd.append('zip', zipFile);

      const res = await fetch('/api/students/bulk-import', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      toast.success(`${data.imported} ta talaba yuklandi`);
    } catch (err: any) {
      toast.error(err.message || 'Xato');
    } finally {
      setUploading(false);
    }
  }

  function downloadCredentials() {
    if (!result?.credentials) return;
    let text = 'F.I.Sh\tUsername\tParol\tSinf\n';
    text += result.credentials.map((c) =>
      `${c.fullName}\t${c.username}\t${c.password}\t${c.groupName || ''}`
    ).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'login-parollar.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadTemplate() {
    const csv = [
      'F.I.Sh,Telefon,Ota-ona telefoni,Sinf,Rasm',
      'Abdullayev Jasur,+998901234567,+998907654321,5-A,jasur.jpg',
      'Bekmurodova Madina,+998901111111,+998902222222,5-A,madina.jpg',
      'Choriyev Sherzod,,+998903333333,5-B,sherzod.jpg',
    ].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'talabalar-shabloni.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Excel orqali talabalarni yuklash</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Bir vaqtning oʻzida koʻp talabani yuklang
        </p>
      </div>

      {/* DETAILED INSTRUCTIONS */}
      <div className="card p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border-blue-200 dark:border-blue-500/30">
        <h2 className="text-base font-semibold text-blue-900 dark:text-blue-200 mb-4 flex items-center gap-2">
          📖 Yoʻriqnoma — qanday qilib tayyorlash
        </h2>

        {/* Step 1: Excel */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            1-qadam: Excel faylni tayyorlash
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
            Excel'da quyidagi <strong>5 ta ustun</strong> boʻlishi kerak (birinchi qator — sarlavhalar):
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium text-slate-700 dark:text-slate-300">A: F.I.Sh</th>
                  <th className="px-2 py-1.5 text-left font-medium text-slate-700 dark:text-slate-300">B: Telefon</th>
                  <th className="px-2 py-1.5 text-left font-medium text-slate-700 dark:text-slate-300">C: Ota-ona telefoni</th>
                  <th className="px-2 py-1.5 text-left font-medium text-slate-700 dark:text-slate-300">D: Sinf</th>
                  <th className="px-2 py-1.5 text-left font-medium text-slate-700 dark:text-slate-300">E: Rasm</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900">
                <tr className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-2 py-1.5 text-slate-900 dark:text-slate-100">Abdullayev Jasur</td>
                  <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">+998901234567</td>
                  <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">+998907654321</td>
                  <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300 font-medium">5-A</td>
                  <td className="px-2 py-1.5 text-blue-600 font-mono">jasur.jpg</td>
                </tr>
                <tr className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-2 py-1.5 text-slate-900 dark:text-slate-100">Bekmurodova Madina</td>
                  <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">+998901111111</td>
                  <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">+998902222222</td>
                  <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300 font-medium">5-A</td>
                  <td className="px-2 py-1.5 text-blue-600 font-mono">madina.jpg</td>
                </tr>
                <tr className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-2 py-1.5 text-slate-900 dark:text-slate-100">Choriyev Sherzod</td>
                  <td className="px-2 py-1.5 text-slate-400 italic">—</td>
                  <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">+998903333333</td>
                  <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300 font-medium">5-B</td>
                  <td className="px-2 py-1.5 text-blue-600 font-mono">sherzod.jpg</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul className="mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-0.5 list-disc list-inside">
            <li><strong>F.I.Sh</strong> — majburiy (toʻliq ism familiya)</li>
            <li><strong>Telefon</strong> — ixtiyoriy (talaba telefoni)</li>
            <li><strong>Ota-ona telefoni</strong> — ixtiyoriy (SMS xabarnoma uchun)</li>
            <li><strong>Sinf</strong> — masalan: 5-A, 5-B (yoʻq boʻlsa avtomatik yaratiladi)</li>
            <li><strong>Rasm</strong> — ZIP ichidagi rasm fayli nomi (masalan: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">jasur.jpg</code>)</li>
          </ul>
        </div>

        {/* Step 2: ZIP */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
            <FileArchive className="w-4 h-4 text-purple-600" />
            2-qadam: Rasmlarni ZIP qilish
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
            Talabalarning rasmlarini bitta papkaga yigʻib, ZIP qiling. <strong>Rasm nomlari Excel\'dagi "Rasm" ustunidagi nomlar bilan bir xil boʻlishi shart.</strong>
          </p>
          <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700 font-mono text-xs">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 mb-1">
              <Folder className="w-3.5 h-3.5 text-amber-500" /> rasmlar.zip
            </div>
            <div className="ml-5 space-y-0.5 text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3 text-blue-400" /> jasur.jpg
              </div>
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3 text-blue-400" /> madina.jpg
              </div>
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3 text-blue-400" /> sherzod.jpg
              </div>
            </div>
          </div>
          <ul className="mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-0.5 list-disc list-inside">
            <li>Rasm formatlari: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">.jpg</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">.jpeg</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">.png</code></li>
            <li>Tavsiya: rasmlarni <strong>500 KB dan kichik</strong> qiling (tezroq yuklanadi)</li>
            <li>Yuz aniq ko'rinib turishi kerak (front view, yorug', oydin)</li>
            <li>Bir rasmda <strong>faqat bitta inson</strong> bo'lsin</li>
          </ul>
        </div>

        {/* Step 3: Auto */}
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
            <Upload className="w-4 h-4 text-brand-600" />
            3-qadam: Yuklash va avtomatik akkauntlar
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Tizim avtomatik bajaradi:</p>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5 list-disc list-inside">
            <li>✅ Har bir oʻquvchi uchun <strong>login va parol generatsiya</strong> qiladi</li>
            <li>✅ Sinflarni <strong>avtomatik yaratadi</strong> (agar yoʻq boʻlsa)</li>
            <li>✅ Rasmlarni saqlaydi va talaba kartasiga biriktiradi</li>
            <li>✅ <strong>Login va parollar roʻyxati</strong>ni TXT fayl sifatida yuklab olasiz</li>
          </ul>
        </div>

        <button onClick={downloadTemplate} className="btn-primary mt-2">
          <Download className="w-4 h-4" /> Tayyor shablonni yuklab olish (CSV)
        </button>
        <p className="text-xs text-slate-500 mt-2">
          💡 CSV'ni Excel'da oching va talabalar bilan toʻldiring, soʻng <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">.xlsx</code> formatida saqlang
        </p>
      </div>

      {/* Upload form */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-4">📤 Fayllarni yuklash</h2>

        <div className="space-y-4">
          {/* Excel */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              📊 Excel fayl <span className="text-rose-500">*</span>
            </label>
            <div
              onClick={() => excelRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                excelFile
                  ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-700'
                  : 'border-slate-300 dark:border-slate-700 hover:border-brand-400'
              }`}
            >
              <input
                ref={excelRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
              />
              {excelFile ? (
                <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="font-medium">{excelFile.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setExcelFile(null); }}
                    className="ml-2 text-slate-400 hover:text-rose-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-slate-500">
                  <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm">Excel faylni tanlash uchun bosing</p>
                  <p className="text-xs text-slate-400 mt-1">.xlsx yoki .xls</p>
                </div>
              )}
            </div>
          </div>

          {/* ZIP */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              📁 Rasmlar ZIP <span className="text-slate-400 text-xs">(ixtiyoriy, lekin tavsiya etiladi)</span>
            </label>
            <div
              onClick={() => zipRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                zipFile
                  ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-700'
                  : 'border-slate-300 dark:border-slate-700 hover:border-brand-400'
              }`}
            >
              <input
                ref={zipRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => setZipFile(e.target.files?.[0] || null)}
              />
              {zipFile ? (
                <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <FileArchive className="w-5 h-5" />
                  <span className="font-medium">{zipFile.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setZipFile(null); }}
                    className="ml-2 text-slate-400 hover:text-rose-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-slate-500">
                  <FileArchive className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm">ZIP faylni tanlash uchun bosing</p>
                  <p className="text-xs text-slate-400 mt-1">Talabalar rasmlari bilan</p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!excelFile || uploading}
            className="btn-primary w-full py-2.5"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Yuklanmoqda...' : 'Yuklashni boshlash'}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {result.imported} ta talaba muvaffaqiyatli yuklandi
            </h2>
          </div>

          {result.errors.length > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  {result.errors.length} ta ogohlantirish
                </span>
              </div>
              <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1 max-h-32 overflow-y-auto">
                {result.errors.map((e, i) => <li key={i}>· {e}</li>)}
              </ul>
            </div>
          )}

          {result.credentials.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Yaratilgan login va parollar
                </h3>
                <button onClick={downloadCredentials} className="btn-secondary text-xs py-1.5">
                  <Download className="w-3.5 h-3.5" /> Yuklab olish (TXT)
                </button>
              </div>
              <div className="card overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">F.I.Sh</th>
                      <th className="text-left px-4 py-2 font-medium">Sinf</th>
                      <th className="text-left px-4 py-2 font-medium">Login</th>
                      <th className="text-left px-4 py-2 font-medium">Parol</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {result.credentials.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">{c.fullName}</td>
                        <td className="px-4 py-2 text-slate-500">{c.groupName || '—'}</td>
                        <td className="px-4 py-2 font-mono text-brand-600">{c.username}</td>
                        <td className="px-4 py-2 font-mono text-amber-600">{c.password}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}