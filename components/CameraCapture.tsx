'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, SwitchCamera, X } from 'lucide-react';

const DEVICE_STORAGE_KEY = 'faceScanner.deviceId';

interface CameraCaptureProps {
  /** Har bir "Suratga olish" bosilganda kadr JPEG fayl sifatida qaytadi. */
  onCapture: (file: File) => void | Promise<void>;
  /** Panelni yopish. */
  onClose: () => void;
  /** Chegara to'lganda suratga olishni bloklash uchun. */
  disabled?: boolean;
  disabledReason?: string;
}

/**
 * Ro'yxatga olish uchun kameradan kadr olish.
 *
 * Bu yerda yuz aniqlanmaydi — kadr oddiy JPEG fayl bo'lib qaytadi va
 * yuklangan rasm bilan bir xil quvurdan o'tadi ("Yuzni aniqlash" tugmasi
 * deskriptorni o'zi hisoblaydi). Shu sababli mavjud saqlash mantig'iga
 * umuman tegilmaydi.
 *
 * Kamera faqat xavfsiz kontekstda (HTTPS yoki localhost) ochiladi.
 */
export default function CameraCapture({
  onCapture,
  onClose,
  disabled = false,
  disabledReason,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  // FaceScanner bilan bir xil kalit — bir marta tanlangan kamera ikkalasida ham eslanadi.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DEVICE_STORAGE_KEY);
      if (saved) setDeviceId(saved);
    } catch {}
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === 'videoinput'));
    } catch (e) {
      console.error('enumerateDevices xatosi:', e);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Brauzer kamerani qoʻllab-quvvatlamaydi yoki sahifa HTTPS emas.');
        return;
      }
      // Ro'yxatga olishda rasm sifati muhim — skanerlashdagi 640x480 emas,
      // iloji boricha kattaroq kadr so'raymiz (`ideal` — kamera qo'llamasa xato bermaydi).
      const constraints: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' };

      const stream = await navigator.mediaDevices.getUserMedia({ video: constraints });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setActive(true);
      }
      await refreshDevices();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.name === 'NotAllowedError'
          ? 'Kamera ruxsati berilmadi. Brauzer sozlamalaridan ruxsat bering.'
          : err?.name === 'OverconstrainedError' || err?.name === 'NotFoundError'
            ? 'Kamera topilmadi. Boshqa kamerani tanlang.'
            : 'Kamerani yoqib boʻlmadi: ' + (err?.message || 'nomaʼlum xato'),
      );
      setActive(false);
    }
  }, [deviceId, refreshDevices]);

  // Panel ochilganda kamera yonadi, yopilganda albatta o'chadi.
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  function selectDevice(id: string) {
    setDeviceId(id);
    try {
      localStorage.setItem(DEVICE_STORAGE_KEY, id);
    } catch {}
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    setShooting(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92),
      );
      if (!blob) {
        setError('Kadrni olib boʻlmadi.');
        return;
      }
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
      await onCapture(file);
    } finally {
      setShooting(false);
    }
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900">
      <div className="relative aspect-video">
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 p-6">
            <div className="text-center max-w-sm">
              <CameraOff className="w-9 h-9 text-rose-400 mx-auto mb-3" />
              <p className="text-white text-sm">{error}</p>
              <button type="button" onClick={startCamera} className="btn-primary mt-4 text-xs py-1.5 px-3">
                Qayta urinib koʻrish
              </button>
            </div>
          </div>
        )}

        {!error && !active && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70">
            <Loader2 className="w-7 h-7 animate-spin text-brand-400" />
          </div>
        )}

        {active && !error && devices.length > 1 && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs text-white">
            <SwitchCamera className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
            <select
              value={deviceId ?? ''}
              onChange={(e) => selectDevice(e.target.value)}
              className="bg-transparent text-white text-xs outline-none max-w-[10rem] cursor-pointer [&>option]:text-black"
              title="Kamerani tanlang"
            >
              {!deviceId && <option value="">Standart kamera</option>}
              {devices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Kamera ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
          title="Kamerani yopish"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 bg-slate-800 flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={capture}
          disabled={!active || shooting || disabled}
          className="btn-primary"
        >
          {shooting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          Suratga olish
        </button>
        {disabled && disabledReason && (
          <p className="text-[11px] text-slate-400">{disabledReason}</p>
        )}
      </div>
    </div>
  );
}
