import { describe, it, expect } from 'vitest';
import {
  euclideanDistance,
  cosineSimilarity,
  findBestMatch,
  isValidDescriptor,
  normalizeDescriptors,
  type MatchCandidate,
} from '@/lib/face-utils';

const vec = (fill: number) => Array.from({ length: 128 }, () => fill);

describe('euclideanDistance', () => {
  it('is 0 for identical vectors', () => {
    expect(euclideanDistance(vec(0.1), vec(0.1))).toBe(0);
  });

  it('computes the L2 distance', () => {
    const a = [0, 0, 0];
    const b = [3, 4, 0];
    expect(euclideanDistance(a, b)).toBe(5);
  });

  it('throws on length mismatch', () => {
    expect(() => euclideanDistance([1, 2], [1, 2, 3])).toThrow(/mismatch/);
  });
});

describe('cosineSimilarity', () => {
  it('is 1 for parallel vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 6);
  });

  it('is 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it('returns 0 when a vector is all zeros (no NaN)', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe('isValidDescriptor', () => {
  it('accepts a 128-length finite-number array', () => {
    expect(isValidDescriptor(vec(0.5))).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(isValidDescriptor(vec(0.5).slice(0, 100))).toBe(false);
  });

  it('rejects non-arrays and NaN/Infinity', () => {
    expect(isValidDescriptor('nope')).toBe(false);
    expect(isValidDescriptor(null)).toBe(false);
    const bad = vec(0.5);
    bad[0] = NaN;
    expect(isValidDescriptor(bad)).toBe(false);
  });
});

describe('normalizeDescriptors', () => {
  it('wraps a legacy single descriptor', () => {
    const out = normalizeDescriptors(vec(0.5));
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual(vec(0.5));
  });

  it('passes through a list of descriptors', () => {
    expect(normalizeDescriptors([vec(0.1), vec(0.2), vec(0.3)])).toHaveLength(3);
  });

  it('drops invalid samples but keeps the good ones', () => {
    // Bitta buzuq namuna butun o'quvchini yo'qotib qo'ymasligi kerak.
    const out = normalizeDescriptors([vec(0.1), 'junk', vec(0.2).slice(0, 50), vec(0.3)]);
    expect(out).toHaveLength(2);
  });

  it('returns an empty list for null / non-arrays', () => {
    expect(normalizeDescriptors(null)).toEqual([]);
    expect(normalizeDescriptors(undefined)).toEqual([]);
    expect(normalizeDescriptors({ a: 1 })).toEqual([]);
    expect(normalizeDescriptors('nope')).toEqual([]);
  });

  it('does not confuse the two shapes', () => {
    // 128 ta namunali ro'yxat eski bitta deskriptor deb o'qilmasligi kerak.
    const many = Array.from({ length: 128 }, (_, i) => vec(i / 1000));
    expect(normalizeDescriptors(many)).toHaveLength(128);
  });
});

describe('findBestMatch', () => {
  const candidates: MatchCandidate[] = [
    { studentId: 'a', fullName: 'A', groupId: 'g', descriptors: [vec(0.0)] },
    { studentId: 'b', fullName: 'B', groupId: 'g', descriptors: [vec(1.0)] },
  ];

  it('returns null when there are no candidates', () => {
    expect(findBestMatch(vec(0.0), [], 0.55)).toBeNull();
  });

  it('picks the closest candidate within threshold', () => {
    const m = findBestMatch(vec(0.001), candidates, 0.55);
    expect(m?.studentId).toBe('a');
    expect(m?.confidence).toBeGreaterThan(0.9);
  });

  it('returns null when the closest is beyond threshold', () => {
    // probe is far from both (distance ~ sqrt(128 * 0.25) ≈ 5.6)
    const m = findBestMatch(vec(0.5), candidates, 0.55);
    expect(m).toBeNull();
  });

  it('matches on the closest of several samples', () => {
    // Ro'yxatga olishdagi birinchi rakurs mos kelmasa ham, ikkinchisi topadi.
    const multi: MatchCandidate[] = [
      { studentId: 'a', fullName: 'A', groupId: 'g', descriptors: [vec(1.0), vec(0.0)] },
    ];
    const m = findBestMatch(vec(0.001), multi, 0.55);
    expect(m?.studentId).toBe('a');
    expect(m?.distance).toBeLessThan(0.1);
  });

  it('ignores a candidate with no samples', () => {
    const empty: MatchCandidate[] = [
      { studentId: 'a', fullName: 'A', groupId: 'g', descriptors: [] },
    ];
    expect(findBestMatch(vec(0.0), empty, 0.55)).toBeNull();
  });

  it('prefers the student whose best sample is closest', () => {
    const two: MatchCandidate[] = [
      { studentId: 'a', fullName: 'A', groupId: 'g', descriptors: [vec(0.30), vec(0.20)] },
      { studentId: 'b', fullName: 'B', groupId: 'g', descriptors: [vec(0.25), vec(0.001)] },
    ];
    expect(findBestMatch(vec(0.0), two, 0.55)?.studentId).toBe('b');
  });
});
