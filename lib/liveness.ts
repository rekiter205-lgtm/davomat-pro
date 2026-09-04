/**
 * Liveness (tiriklik) tekshiruvi — ko'z pirillatishni aniqlash.
 *
 * Muammo: kamera oldiga o'quvchining fotosini (qog'ozda yoki telefon
 * ekranida) tutsa, yuz tanish uni haqiqiy odam deb qabul qiladi va
 * davomat belgilanadi. Foto ko'z pirillata olmaydi.
 *
 * Usul: Eye Aspect Ratio (EAR) — Soukupová & Čech, 2016. Ko'z landmark
 * nuqtalaridan hisoblanadigan nisbat: ko'z ochiq bo'lsa ~0.3, yumilganda
 * ~0.1 ga tushadi. Nisbat pastga tushib, keyin qaytib ko'tarilsa —
 * pirillash sodir bo'lgan.
 *
 * Bu yerdagi kod sof matematika — brauzer API'lariga bog'liq emas,
 * shuning uchun test qilinadi (tests/liveness.test.ts).
 *
 * CHEKLOV: bu faqat *statik* fotoni to'sadi. Telefon ekranida o'ynatilgan
 * videoda ko'z pirillaydi, demak undan o'tib ketadi. Shuningdek tekshiruv
 * brauzerda bajarilgani uchun texnik jihatdan tayyorgarlikka ega odam
 * API'ga to'g'ridan-to'g'ri deskriptor yubora oladi. To'liq himoya uchun
 * kadrni serverga yuborib, tekshiruvni serverda qilish kerak.
 */

export interface Point {
  x: number;
  y: number;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Ko'zning ochiqlik nisbati.
 *
 * face-api.js `getLeftEye()` / `getRightEye()` 6 ta nuqta qaytaradi:
 *
 *        p2   p3
 *   p1              p4      EAR = (|p2−p6| + |p3−p5|) / (2·|p1−p4|)
 *        p6   p5
 *
 * Gorizontal masofa (p1–p4) maxrajda turgani uchun natija yuzning
 * kameraga yaqin-uzoqligiga bog'liq emas.
 *
 * @returns 0..~0.4 oralig'ida nisbat; nuqtalar yaroqsiz bo'lsa 0.
 */
export function eyeAspectRatio(eye: Point[]): number {
  if (eye.length !== 6) return 0;
  const [p1, p2, p3, p4, p5, p6] = eye;
  const horizontal = distance(p1, p4);
  if (horizontal === 0) return 0;
  return (distance(p2, p6) + distance(p3, p5)) / (2 * horizontal);
}

/** Ikkala ko'zning o'rtacha nisbati — bitta ko'z soya ostida qolsa ham ishlaydi. */
export function averageEyeAspectRatio(leftEye: Point[], rightEye: Point[]): number {
  const left = eyeAspectRatio(leftEye);
  const right = eyeAspectRatio(rightEye);
  if (left === 0) return right;
  if (right === 0) return left;
  return (left + right) / 2;
}

export interface BlinkDetectorOptions {
  /** Ochiq ko'z darajasining shu ulushidan pastga tushsa — yumiq. */
  closedRatio?: number;
  /** Shu ulushdan yuqoriga qaytsa — ochiq. closedRatio bilan orasidagi
   *  bo'shliq gisterezis: chegara atrofidagi titrash pirillash sanalmaydi. */
  openRatio?: number;
  /** Pirillash deb tan olish uchun ko'z yumiq turishi kerak bo'lgan eng kam kadr. */
  minClosedFrames?: number;
  /** Bundan uzoq yumiq tursa — bu pirillash emas (odam ko'zini yumib olgan
   *  yoki yuz aniqlanmay qolgan). Hisob bekor qilinadi. */
  maxClosedFrames?: number;
}

const DEFAULTS: Required<BlinkDetectorOptions> = {
  closedRatio: 0.75,
  openRatio: 0.88,
  minClosedFrames: 1,
  maxClosedFrames: 10,
};

/**
 * EAR qiymatlari oqimini kuzatib, pirillash sodir bo'lganini aytadi.
 *
 * Chegaralar **nisbiy**. Qat'iy son (masalan "yumiq < 0.21") ishlamaydi:
 * ochiq ko'zning EAR qiymati kamera sifati, masofa, rakurs va odamning
 * ko'z kesimiga qarab 0.20 dan 0.40 gacha farq qiladi. Arzon veb-kamerada
 * ochiq ko'z ham 0.25 chiqishi mumkin — qat'iy "ochiq > 0.27" sharti hech
 * qachon bajarilmaydi va pirillash umuman aniqlanmaydi.
 *
 * Shuning uchun kuzatuvchi ochiq ko'zning o'z darajasini (`baseline`)
 * o'lchab boradi va chegaralarni shundan foizda oladi.
 *
 * Holat mashinasi: OCHIQ → (EAR < baseline·closedRatio) → YUMIQ →
 * (EAR > baseline·openRatio, yumiqlik davomiyligi me'yorda) → pirillash.
 */
export class BlinkDetector {
  private readonly opts: Required<BlinkDetectorOptions>;
  private closedFrames = 0;
  private eyesClosed = false;
  private blinks = 0;
  /** Ochiq ko'zning joriy darajasi. Birinchi kadrda o'rnatiladi. */
  private baseline: number | null = null;

  constructor(options: BlinkDetectorOptions = {}) {
    this.opts = { ...DEFAULTS, ...options };
  }

  /**
   * Ochiq ko'z darajasini yangilaydi: yuqoriga tez ko'tariladi (ko'z ochildi
   * — bu haqiqiy daraja), pastga juda sekin tushadi (pirillash paytidagi
   * past qiymatlar darajani pasaytirib yubormasligi kerak).
   */
  private updateBaseline(ear: number): void {
    if (this.baseline === null) {
      this.baseline = ear;
      return;
    }
    const rate = ear > this.baseline ? 0.5 : 0.02;
    this.baseline += rate * (ear - this.baseline);
  }

  /** Joriy o'lchov bo'yicha hisoblangan chegaralar. */
  get thresholds(): { closed: number; open: number } {
    const base = this.baseline ?? 0;
    return { closed: base * this.opts.closedRatio, open: base * this.opts.openRatio };
  }

  /**
   * Navbatdagi kadrning EAR qiymatini qo'shadi.
   * @returns shu kadrda pirillash yakunlangan bo'lsa `true`.
   */
  push(ear: number): boolean {
    const { minClosedFrames, maxClosedFrames } = this.opts;
    const { closed: closedThreshold, open: openThreshold } = this.thresholds;
    this.updateBaseline(ear);

    if (ear < closedThreshold) {
      this.eyesClosed = true;
      this.closedFrames += 1;
      return false;
    }

    if (this.eyesClosed && ear > openThreshold) {
      const duration = this.closedFrames;
      this.eyesClosed = false;
      this.closedFrames = 0;
      // Juda uzoq yumiqlik pirillash emas — o'tkazib yuboramiz.
      if (duration >= minClosedFrames && duration <= maxClosedFrames) {
        this.blinks += 1;
        return true;
      }
    }

    return false;
  }

  /** Yuz kadrdan chiqib ketganda chaqiriladi — yarim qolgan holatni tozalaydi. */
  reset(): void {
    this.closedFrames = 0;
    this.eyesClosed = false;
  }

  /** Sanoqni ham nolga tushiradi (yangi o'quvchi kelganda).
   *  Ochiq ko'z darajasi ham tozalanadi — keyingi odamniki boshqacha. */
  resetAll(): void {
    this.reset();
    this.blinks = 0;
    this.baseline = null;
  }

  get blinkCount(): number {
    return this.blinks;
  }
}
