'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, Loader2, ScanFace } from 'lucide-react';
import { loadFaceModels, detectSingleFace, descriptorToArray } from '@/ai/face-recognition';

interface FaceScannerProps {
  /** Called whenever a face is detected & a 128-d descriptor extracted. */
  onDescriptor?: (descriptor: number[]) => void | Promise<void>;
  /** Auto-scan continuously; disable for one-shot enrollment. */
  continuous?: boolean;
  /** Cooldown (ms) between auto-scans. */
  intervalMs?: number;
  /** Disable while a request is in flight. */
  busy?: boolean;
  className?: string;
}

export default function FaceScanner({
  onDescriptor,
  continuous = true,
  intervalMs = 2000,
  busy = false,
  className,
}: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  const [modelLoading, setModelLoading] = useState(true);
  const [streamActive, setStreamActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err?.name === 'NotAllowedError'
          ? 'Kamera ruxsati berilmadi. Brauzer sozlamalarini tekshiring.'
          : 'Kamerani yoqib boʻlmadi: ' + (err?.message || 'noma\'lum xato'),
      );
      setStreamActive(false);
    }
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

  // Detection loop
  useEffect(() => {
    if (modelLoading || !streamActive) return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (cancelled) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || busy) {
        if (continuous) timeout = setTimeout(tick, 500);
        return;
      }
      setScanning(true);
      try {
        const result = await detectSingleFace(video);
        if (cancelled) return;
        drawBox(result?.box ?? null);
        if (result && onDescriptor) {
          await onDescriptor(descriptorToArray(result.descriptor));
        }
      } catch (e) {
        console.error('detection error:', e);
      } finally {
        setScanning(false);
        if (continuous && !cancelled) {
          timeout = setTimeout(tick, intervalMs);
        }
      }
    }
    tick();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [modelLoading, streamActive, continuous, intervalMs, onDescriptor, busy]);

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

        {/* Scanning indicator */}
        {streamActive && !error && (
          <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs text-white">
            {scanning ? (
              <>
                <ScanFace className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
                Skanerlanmoqda
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Faol
              </>
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
