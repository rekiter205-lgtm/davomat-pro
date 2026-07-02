import { describe, it, expect } from 'vitest';
import {
  euclideanDistance,
  cosineSimilarity,
  findBestMatch,
  isValidDescriptor,
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

describe('findBestMatch', () => {
  const candidates: MatchCandidate[] = [
    { studentId: 'a', fullName: 'A', groupId: 'g', descriptor: vec(0.0) },
    { studentId: 'b', fullName: 'B', groupId: 'g', descriptor: vec(1.0) },
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
});
