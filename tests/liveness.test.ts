import { describe, it, expect } from 'vitest';
import {
  eyeAspectRatio,
  averageEyeAspectRatio,
  BlinkDetector,
  type Point,
} from '@/lib/liveness';

/**
 * Ko'zni 6 nuqtali ko'pburchak sifatida yasaydi.
 * @param width  gorizontal kenglik (p1–p4)
 * @param height vertikal ochiqlik — 0 ga yaqin bo'lsa ko'z yumiq
 */
function makeEye(width: number, height: number): Point[] {
  const h = height / 2;
  return [
    { x: 0, y: 0 },              // p1 — chap burchak
    { x: width * 0.3, y: -h },   // p2 — yuqori chap
    { x: width * 0.7, y: -h },   // p3 — yuqori o'ng
    { x: width, y: 0 },          // p4 — o'ng burchak
    { x: width * 0.7, y: h },    // p5 — pastki o'ng
    { x: width * 0.3, y: h },    // p6 — pastki chap
  ];
}

const OPEN_EYE = makeEye(30, 12);   // EAR ≈ 0.40
const CLOSED_EYE = makeEye(30, 2);  // EAR ≈ 0.07

describe('eyeAspectRatio', () => {
  it('is high for an open eye', () => {
    expect(eyeAspectRatio(OPEN_EYE)).toBeGreaterThan(0.3);
  });

  it('is low for a closed eye', () => {
    expect(eyeAspectRatio(CLOSED_EYE)).toBeLessThan(0.15);
  });

  it('does not change when the face moves closer to the camera', () => {
    // Yuz kameraga yaqinlashsa hamma masofa bir xil koeffitsiyentga ko'payadi.
    const near = makeEye(60, 24);
    expect(eyeAspectRatio(near)).toBeCloseTo(eyeAspectRatio(OPEN_EYE), 6);
  });

  it('returns 0 for a wrong number of landmarks', () => {
    expect(eyeAspectRatio([])).toBe(0);
    expect(eyeAspectRatio(OPEN_EYE.slice(0, 5))).toBe(0);
  });

  it('returns 0 when the eye has no width', () => {
    expect(eyeAspectRatio(makeEye(0, 10))).toBe(0);
  });
});

describe('averageEyeAspectRatio', () => {
  it('averages both eyes', () => {
    const avg = averageEyeAspectRatio(OPEN_EYE, CLOSED_EYE);
    expect(avg).toBeCloseTo((eyeAspectRatio(OPEN_EYE) + eyeAspectRatio(CLOSED_EYE)) / 2, 6);
  });

  it('falls back to the usable eye when one is unreadable', () => {
    // Bitta ko'z soyada qolib landmark topilmasa, ikkinchisi bo'yicha ishlaymiz.
    expect(averageEyeAspectRatio([], OPEN_EYE)).toBeCloseTo(eyeAspectRatio(OPEN_EYE), 6);
    expect(averageEyeAspectRatio(OPEN_EYE, [])).toBeCloseTo(eyeAspectRatio(OPEN_EYE), 6);
  });
});

describe('BlinkDetector', () => {
  it('reports a blink after eyes close and reopen', () => {
    const d = new BlinkDetector();
    expect(d.push(0.35)).toBe(false); // ochiq
    expect(d.push(0.10)).toBe(false); // yumildi
    expect(d.push(0.35)).toBe(true);  // ochildi → pirillash
    expect(d.blinkCount).toBe(1);
  });

  it('does not report a blink for a static open eye', () => {
    // Kameraga tutilgan foto — EAR o'zgarmaydi.
    const d = new BlinkDetector();
    for (let i = 0; i < 100; i++) {
      expect(d.push(0.33)).toBe(false);
    }
    expect(d.blinkCount).toBe(0);
  });

  it('does not report a blink for a photo of closed eyes', () => {
    const d = new BlinkDetector();
    for (let i = 0; i < 100; i++) {
      expect(d.push(0.08)).toBe(false);
    }
    expect(d.blinkCount).toBe(0);
  });

  it('ignores flicker in the gap between the two thresholds', () => {
    // Gisterezis: 0.21 va 0.27 orasidagi tebranish pirillash emas.
    const d = new BlinkDetector();
    d.push(0.35);
    for (let i = 0; i < 20; i++) {
      expect(d.push(i % 2 === 0 ? 0.23 : 0.26)).toBe(false);
    }
    expect(d.blinkCount).toBe(0);
  });

  it('ignores eyes held shut for too long', () => {
    const d = new BlinkDetector({ maxClosedFrames: 5 });
    d.push(0.35);
    for (let i = 0; i < 20; i++) d.push(0.08);
    expect(d.push(0.35)).toBe(false);
    expect(d.blinkCount).toBe(0);
  });

  it('requires the configured minimum closed duration', () => {
    const d = new BlinkDetector({ minClosedFrames: 3 });
    d.push(0.35);
    d.push(0.10);
    expect(d.push(0.35)).toBe(false); // atigi 1 kadr — kam
    expect(d.blinkCount).toBe(0);

    d.push(0.10);
    d.push(0.10);
    d.push(0.10);
    expect(d.push(0.35)).toBe(true);
    expect(d.blinkCount).toBe(1);
  });

  it('counts several blinks in a row', () => {
    const d = new BlinkDetector();
    for (let i = 0; i < 3; i++) {
      d.push(0.35);
      d.push(0.10);
      d.push(0.35);
    }
    expect(d.blinkCount).toBe(3);
  });

  it('drops a half-finished blink when the face leaves the frame', () => {
    const d = new BlinkDetector();
    d.push(0.35);
    d.push(0.10);  // ko'z yumildi
    d.reset();     // yuz kadrdan chiqib ketdi
    expect(d.push(0.35)).toBe(false); // qaytib kelgani pirillash sanalmaydi
    expect(d.blinkCount).toBe(0);
  });

  it('detects a blink on a camera whose open-eye ratio is low', () => {
    // Arzon veb-kamerada ochiq ko'z ~0.24 chiqadi. Qat'iy "ochiq > 0.27"
    // sharti bunda hech qachon bajarilmasdi va pirillash aniqlanmasdi.
    const d = new BlinkDetector();
    for (let i = 0; i < 5; i++) d.push(0.24);
    expect(d.push(0.16)).toBe(false); // yumildi
    expect(d.push(0.24)).toBe(true);  // ochildi → pirillash
    expect(d.blinkCount).toBe(1);
  });

  it('exposes thresholds scaled to the measured open-eye level', () => {
    const d = new BlinkDetector();
    d.push(0.40);
    expect(d.thresholds.closed).toBeCloseTo(0.40 * 0.75, 6);
    expect(d.thresholds.open).toBeCloseTo(0.40 * 0.88, 6);
  });

  it('resetAll clears the counter too', () => {
    const d = new BlinkDetector();
    d.push(0.35);
    d.push(0.10);
    d.push(0.35);
    expect(d.blinkCount).toBe(1);
    d.resetAll();
    expect(d.blinkCount).toBe(0);
  });
});
