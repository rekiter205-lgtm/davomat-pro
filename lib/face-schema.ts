/**
 * Yuz ma'lumotlari uchun so'rov sxemasi.
 *
 * `face-utils.ts` ataylab sof matematika bo'lib qoladi (uni test va mijoz
 * kodi ham import qiladi), shuning uchun zod'ga bog'liqlik shu yerda.
 */
import { z } from 'zod';

import { MAX_FACE_SAMPLES } from './face-utils';

/** Bitta 128 o'lchovli deskriptor. `.finite()` NaN/Infinity'ni rad etadi. */
const singleDescriptor = z.array(z.number().finite()).length(128);

/**
 * Ro'yxatga olishdan kelayotgan yuz ma'lumoti — ikki shakl ham qabul qilinadi:
 *   • bitta deskriptor        (eski mijozlar va bulk-import)
 *   • namunalar ro'yxati      (yangi ko'p-fotoli ro'yxatga olish)
 *
 * Bazaga yozishdan oldin `normalizeDescriptors()` ikkalasini ham bir xil
 * ko'rinishga keltiradi.
 */
export const faceDescriptorInput = z.union([
  singleDescriptor,
  z.array(singleDescriptor).min(1).max(MAX_FACE_SAMPLES),
]);
