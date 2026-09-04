'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, Eye, Loader2, ScanFace, SwitchCamera } from 'lucide-react';
import {
  loadFaceModels,
  detectSingleFace,
  detectLandmarks,
  descriptorToArray,
} from '@/ai/face-recognition';
import { BlinkDetector, averageEyeAspectRatio } from '@/lib/liveness';

const DEVICE_STORAGE_KEY = 'faceScanner.deviceId';

/** Tiriklik kuzatuvida kadrlar orasidagi interval. Pirillash ~100–400 ms
 *  davom etadi, shuning uchun namuna olish shundan tez bo'lishi kerak. */
const LIVENESS_SAMPLE_MS = 120;

/**
 * Yuz shuncha vaqt kadrda turib ham pirillash aniqlanmasa, foydalanuvchiga
 * qo'lda o'tkazish tugmasi ko'rsatiladi. Bu bo'lmasa kamera jim qotib qoladi:
 * hech qanday so'rov ketmaydi, ekranda ham hech narsa o'zgarmaydi va nima
 * bo'layotgani tushunarsiz bo'ladi.
 */
const BLINK_STUCK_MS = 8000;

/**
 * Telefon/planshetmi? Sensorli qurilmada o'qituvchi qurilmani o'quvchiga
 * qaratadi — orqa kamera kerak. Noutbukda esa yagona kamera old kamera.
 */
function prefersBackCamera(): boolean {
  if (typeof window === 'undefined') return false;
  return navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches;
}

interface FaceScannerProps {
  /** Called whenever a face is detected & a 128-d descriptor extracted. */
  onDescriptor?: (descriptor: number[]) => void | Promise<void>;
  /** Auto-scan continuously; disable for one-shot enrollment. */
  continuous?: boolean;
  /** Cooldown (ms) between auto-scans. */
  intervalMs?: number;
  /**
   * Deskriptor yuborishdan oldin ko'z pirillatishni talab qilish.
   * Kameraga tutilgan fotoni to'sadi — yo'qlamada doim yoqiq bo'lishi kerak.
   */
  requireLiveness?: boolean;
  /** Disable while a request is in flight. */
  busy?: boolean;
  className?: string;
}

export default function FaceScanner({
  onDescriptor,
  continuous = true,
  intervalMs = 2000,
  requireLiveness = true,
  busy = false,
  className,
}: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  const [modelLoading, setModelLoading] = useState(true);
  const [streamActive, setStreamActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  /** Pirillash kutilmoqda (false) yoki tasdiqlangan (true). */
  const [liveConfirmed, setLiveConfirmed] = useState(false);
  /** Yuz ko'rinib turibdi, lekin pirillash uzoq vaqt aniqlanmadi. */
  const [blinkStuck, setBlinkStuck] = useState(false);
  /** Tugma bosilganda bir martaga pirillash talabini chetlab o'tish. */
  const skipBlinkRef = useRef(false);

  // Kamera qurilmalari (telefonni veb-kamera sifatida tanlash uchun)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  // Saqlangan tanlovni tiklash (pitch paytida sahifa yangilansa ham qoladi)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DEVICE_STORAGE_KEY);
      if (saved) setDeviceId(saved);
    } catch {}
  }, []);

  // Mavjud kamera qurilmalarini yangilash
  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === 'videoinput'));
    } catch (e) {
      console.error('enumerateDevices xatosi:', e);
    }
  }, []);

  // Load models once
  useEffect(() => {
    loadFaceModels()
      .then(() => setModelLoading(false))
      .catch((e) => {
        console.error(e);
        setError('AI modellarni yuklashda xato. /public/models papkasini tekshiring.');
        setModelLoading(false);
      });
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      // Tanlangan qurilma bo'lsa — o'shani. Aks holda telefonda orqa,
      // kompyuterda old kamera. `ideal` — mos kamera bo'lmasa xato bermaydi.
      const video: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
        : {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: prefersBackCamera() ? { ideal: 'environment' } : 'user',
          };
      const stream = await navigator.mediaDevices.getUserMedia({ video });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreamActive(true);
      }
      // Ruxsat berilgach qurilma nomlari (label) ko'rinadi — ro'yxatni yangilaymiz
      await refreshDevices();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.name === 'NotAllowedError'
          ? 'Kamera ruxsati berilmadi. Brauzer sozlamalarini tekshiring.'
          : err?.name === 'OverconstrainedError' || err?.name === 'NotFoundError'
            ? 'Tanlangan kamera topilmadi. Boshqa kamerani tanlang (telefon ulanganini tekshiring).'
            : 'Kamerani yoqib boʻlmadi: ' + (err?.message || 'noma\'lum xato'),
      );
      setStreamActive(false);
    }
  }, [deviceId, refreshDevices]);

  // Kamera tanlanganda saqlab qo'yamiz (startCamera identifikatori o'zgarib qayta ishga tushadi)
  const selectDevice = useCallback((id: string) => {
    setDeviceId(id);
    try {
      localStorage.setItem(DEVICE_STORAGE_KEY, id);
    } catch {}
  }, []);

  const stopCamera = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreamActive(false);
  }, []);

  // Auto-start once models are ready
  useEffect(() => {
    if (!modelLoading) startCamera();
    return () => stopCamera();
  }, [modelLoading, startCamera, stopCamera]);

  // Draw overlay box
  function drawBox(box: { x: number; y: number; width: number; height: number } | null) {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!box) return;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
  }

  // ── Detection loop ────────────────────────────────────────
  //
  // Ikki bosqichli. Avval yengil landmark kuzatuvi ko'z pirillashini kutadi
  // (foto pirillamaydi), pirillash tasdiqlangach — og'ir deskriptor
  // hisoblanadi va yuboriladi. Har bir belgilash uchun yangi pirillash
  // kerak, aks holda bitta pirillash bilan ketma-ket bir necha o'quvchini
  // foto orqali o'tkazib yuborish mumkin bo'lardi.
  useEffect(() => {
    if (modelLoading || !streamActive) return;
    // Liveness sikli faqat uzluksiz rejimda — bir martalik olishda (ro'yxatga
    // olish) operator ataylab suratga oladi, u yerda pirillash talab etilmaydi.
    if (!continuous) return;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const blinks = new BlinkDetector();
    let armed = !requireLiveness;
    /** Yuz uzluksiz ko'rinib turgan vaqt — pirillash kutish cho'zilganini bilish uchun. */
    let faceSeenSince: number | null = null;

    const schedule = (ms: number) => {
      if (!cancelled) timeout = setTimeout(tick, ms);
    };

    async function tick() {
      if (cancelled) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || busy) {
        schedule(500);
        return;
      }

      // 1-bosqich: pirillashni kutish.
      if (!armed) {
        // O'qituvchi "pirillashsiz" tugmasini bosgan bo'lsa — bir martaga o'tkazamiz.
        if (skipBlinkRef.current) {
          skipBlinkRef.current = false;
          armed = true;
          faceSeenSince = null;
          setLiveConfirmed(true);
          setBlinkStuck(false);
        } else {
          try {
            const sample = await detectLandmarks(video);
            if (cancelled) return;
            drawBox(sample?.box ?? null);
            if (!sample) {
              // Yuz kadrdan chiqdi — yarim qolgan pirillash hisobga olinmaydi.
              blinks.reset();
              faceSeenSince = null;
              setBlinkStuck(false);
            } else if (blinks.push(averageEyeAspectRatio(sample.leftEye, sample.rightEye))) {
              armed = true;
              faceSeenSince = null;
              setLiveConfirmed(true);
              setBlinkStuck(false);
            } else {
              faceSeenSince ??= Date.now();
              if (Date.now() - faceSeenSince > BLINK_STUCK_MS) setBlinkStuck(true);
            }
          } catch (e) {
            console.error('liveness error:', e);
          }
          schedule(LIVENESS_SAMPLE_MS);
          return;
        }
      }

      // 2-bosqich: pirillash tasdiqlandi — deskriptorni olamiz.
      setScanning(true);
      try {
        const result = await detectSingleFace(video);
        if (cancelled) return;
        drawBox(result?.box ?? null);
        if (result && onDescriptor) {
          await onDescriptor(descriptorToArray(result.descriptor));
          if (requireLiveness) {
            // Keyingi o'quvchi uchun yangidan pirillash kerak.
            armed = false;
            blinks.reset();
            faceSeenSince = null;
            setLiveConfirmed(false);
            setBlinkStuck(false);
          }
        }
      } catch (e) {
        console.error('detection error:', e);
      } finally {
        setScanning(false);
        schedule(intervalMs);
      }
    }

    tick();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [modelLoading, streamActive, continuous, intervalMs, onDescriptor, busy, requireLiveness]);

  // ── Manual capture (for non-continuous mode) ──────────────
  async function captureOnce() {
    const video = videoRef.current;
    if (!video) return;
    setScanning(true);
    try {
      const result = await detectSingleFace(video);
      drawBox(result?.box ?? null);
      if (!result) {
        setError('Yuz topilmadi. Iltimos, yaxshiroq yorugʻlikda urining.');
        return;
      }
      setError(null);
      await onDescriptor?.(descriptorToArray(result.descriptor));
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-slate-900 ${className ?? ''}`}>
      <div className="aspect-video relative">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas
          ref={overlayRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Status overlays */}
        {modelLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-brand-400 mx-auto" />
              <p className="text-white text-sm mt-3">AI modellar yuklanmoqda...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 p-6">
            <div className="text-center max-w-sm">
              <CameraOff className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <p className="text-white text-sm">{error}</p>
              <button onClick={startCamera} className="btn-primary mt-4 text-xs py-1.5 px-3">
                Qayta urinib koʻrish
              </button>
            </div>
          </div>
        )}

        {!error && !modelLoading && !streamActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button onClick={startCamera} className="btn-primary">
              <Camera className="w-4 h-4" /> Kamerani yoqish
            </button>
          </div>
        )}

        {/* Kamera tanlash — telefonni (DroidCam/Iriun) yoki boshqa kamerani tanlash uchun */}
        {streamActive && !error && devices.length > 1 && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs text-white">
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

        {/* Scanning indicator */}
        {streamActive && !error && (
          <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs text-white">
            {scanning ? (
              <>
                <ScanFace className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
                Skanerlanmoqda
              </>
            ) : continuous && requireLiveness && !liveConfirmed ? (
              <>
                <Eye className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                Pirillash kutilmoqda
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Faol
              </>
            )}
          </div>
        )}

        {/* Tiriklik ko'rsatmasi — o'quvchi nima qilishini bilishi kerak */}
        {streamActive && !error && continuous && requireLiveness && !liveConfirmed && !scanning && (
          <div className="absolute bottom-3 inset-x-3 flex flex-col items-center gap-2">
            <div className="px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-xs text-white flex items-center gap-2 pointer-events-none">
              <Eye className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              Kameraga qarab koʻzingizni pirillating
            </div>
            {blinkStuck && (
              <button
                type="button"
                onClick={() => { skipBlinkRef.current = true; }}
                className="px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs font-medium hover:bg-amber-600"
                title="Pirillash aniqlanmadi — bir martaga tiriklik tekshiruvisiz skanerlaydi"
              >
                Pirillash aniqlanmadi — shundoq skanerlash
              </button>
            )}
          </div>
        )}
      </div>

      {!continuous && streamActive && (
        <div className="p-3 bg-slate-800 flex justify-center">
          <button onClick={captureOnce} disabled={scanning || busy} className="btn-primary">
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanFace className="w-4 h-4" />}
            Yuzni olish
          </button>
        </div>
      )}
    </div>
  );
}
