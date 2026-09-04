import type { Rng } from './types.js';

/**
 * Seeded, so a problem is fully reproducible from generatorId + seed + version.
 * That is what lets sync carry a seed instead of a rendered problem.
 */
export function makeRng(seed: string): Rng {
  let a = hash(seed);
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    nonZero(min, max) {
      for (;;) {
        const v = int(min, max);
        if (v !== 0) return v;
      }
    },
    pick<T>(items: readonly T[]): T {
      return items[int(0, items.length - 1)]!;
    },
    sign: () => (next() < 0.5 ? -1 : 1),
    bool: (p = 0.5) => next() < p,
  };
}

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A short, readable seed. Attempts store it verbatim. */
export function newSeed(rng: () => number = Math.random): string {
  return Math.floor(rng() * 0xffffffff).toString(36).padStart(7, '0');
}
