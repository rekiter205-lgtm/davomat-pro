/**
 * Pure math helpers for face descriptor comparison.
 * No browser dependencies — safe to import server-side.
 *
 * face-api.js produces 128-dim float vectors; the canonical
 * matching metric is **Euclidean distance** (lower = more similar).
 * Typical thresholds: 0.5 (strict) – 0.6 (lenient).
 */

export type FaceDescriptor = number[]; // length 128

/** Euclidean (L2) distance between two descriptors. */
export function euclideanDistance(a: FaceDescriptor, b: FaceDescriptor): number {
  if (a.length !== b.length) {
    throw new Error(`Descriptor length mismatch: ${a.length} vs ${b.length}`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/** Cosine similarity (1 = identical, 0 = orthogonal). */
export function cosineSimilarity(a: FaceDescriptor, b: FaceDescriptor): number {
  if (a.length !== b.length) {
    throw new Error(`Descriptor length mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export interface MatchCandidate {
  studentId: string;
  fullName: string;
  groupId: string | null;
  descriptor: FaceDescriptor;
}

export interface MatchResult {
  studentId: string;
  fullName: string;
  groupId: string | null;
  distance: number;     // lower = better
  confidence: number;   // 0..1, higher = better (= 1 - distance)
}

/**
 * Find the best matching candidate for a probe descriptor.
 * @param threshold maximum euclidean distance to consider a match (default 0.55)
 */
export function findBestMatch(
  probe: FaceDescriptor,
  candidates: MatchCandidate[],
  threshold = 0.55,
): MatchResult | null {
  if (candidates.length === 0) return null;

  let best: MatchResult | null = null;
  for (const c of candidates) {
    const distance = euclideanDistance(probe, c.descriptor);
    if (!best || distance < best.distance) {
      best = {
        studentId: c.studentId,
        fullName: c.fullName,
        groupId: c.groupId,
        distance,
        confidence: Math.max(0, Math.min(1, 1 - distance)),
      };
    }
  }
  return best && best.distance <= threshold ? best : null;
}

/** Validate a stored descriptor (must be array of 128 finite numbers). */
export function isValidDescriptor(d: unknown): d is FaceDescriptor {
  return (
    Array.isArray(d) &&
    d.length === 128 &&
    d.every((v) => typeof v === 'number' && Number.isFinite(v))
  );
}
