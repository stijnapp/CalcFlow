import {
  CHAPTERS,
  type Attempt,
  type Confidence,
  type ErrorClass,
  type Tier,
} from '@calcflow/shared';
import { GENERATORS, type Generator } from '@calcflow/generators';

interface Profile {
  /** How many attempts over the window. */
  n: number;
  accuracy: number;
  /** Of the wrong ones, how many they were sure about. */
  overconfidence: number;
  medianMs: number;
}

const PROFILES: Record<number, Profile> = {
  1: { n: 46, accuracy: 0.93, overconfidence: 0.12, medianMs: 34_000 },
  2: { n: 58, accuracy: 0.9, overconfidence: 0.2, medianMs: 41_000 },
  3: { n: 52, accuracy: 0.83, overconfidence: 0.18, medianMs: 96_000 },
  4: { n: 44, accuracy: 0.73, overconfidence: 0.3, medianMs: 62_000 },
  6: { n: 40, accuracy: 0.68, overconfidence: 0.28, medianMs: 71_000 },
  7: { n: 47, accuracy: 0.41, overconfidence: 0.55, medianMs: 78_000 },
  8: { n: 51, accuracy: 0.86, overconfidence: 0.15, medianMs: 48_000 },
  9: { n: 46, accuracy: 0.7, overconfidence: 0.34, medianMs: 66_000 },
  10: { n: 42, accuracy: 0.55, overconfidence: 0.4, medianMs: 84_000 },
  11: { n: 32, accuracy: 0.48, overconfidence: 0.36, medianMs: 102_000 },
};

const WRONG: ErrorClass[] = ['wrong', 'wrong', 'not-simplified', 'not-exact', 'plus-c'];
const DAY = 86_400_000;

/**
 * How much a tier moves accuracy and time away from the chapter's profile. A
 * sample log where all three tiers come out the same makes the by-difficulty
 * readout look broken when it is only looking at flat data.
 */
const STRETCH: Record<Tier, number> = { easy: 1.12, medium: 1, hard: 0.72 };
const PACE: Record<Tier, number> = { easy: 0.8, medium: 1, hard: 1.35 };

/** mulberry32 — small, seeded, and good enough for fake history. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Easy three times in ten; medium and hard split what is left. */
function drawTier(rand: () => number): Tier {
  if (rand() < 0.3) return 'easy';
  return rand() < 0.65 ? 'medium' : 'hard';
}

/** Right answers lean sure; wrong ones are sure as often as the profile says. */
function drawConfidence(rand: () => number, correct: boolean, profile: Profile): Confidence {
  if (rand() < (correct ? 0.62 : profile.overconfidence)) return 'sure';
  return rand() < (correct ? 0.7 : 0.55) ? 'think' : 'guess';
}

interface Span {
  rand: () => number;
  now: number;
  days: number;
}

interface ChapterSample {
  chapter: number;
  profile: Profile;
  topics: Generator[];
}

function sampleOne({ rand, now, days }: Span, c: ChapterSample, i: number): Attempt {
  const { chapter, profile, topics } = c;
  // Recent attempts weigh double in mastery, so the history leans recent.
  const age = Math.floor(rand() ** 1.6 * days);
  const ts = now - age * DAY - Math.floor(rand() * 10 * 3_600_000);
  const topic = topics[Math.floor(rand() * topics.length)]!;
  // They were worse a fortnight ago than they are now.
  const drift = 1 + (age / days) * -0.18;
  // Tier is drawn before correctness, because it feeds into it.
  const tier = drawTier(rand);
  const correct = rand() < profile.accuracy * drift * STRETCH[tier];
  const confidence = drawConfidence(rand, correct, profile);
  const hintMaxRung = correct ? (rand() < 0.18 ? 1 : 0) : Math.floor(rand() * 4);
  const id = `sample-${chapter}-${i}`;

  return {
    id,
    device: 'sample data',
    ts,
    generatorId: topic.id,
    seed: id,
    genVersion: topic.version,
    chapter,
    tier,
    correct,
    confidence,
    hintsUsed: hintMaxRung,
    hintMaxRung,
    durationMs: Math.round(profile.medianMs * (0.55 + rand() * 1.1) * PACE[tier]),
    answerRaw: correct ? 'x' : 'x+1',
    errorClass: correct ? null : WRONG[Math.floor(rand() * WRONG.length)]!,
    selfGrade: null,
  };
}

/**
 * A believable 400-attempt history, so the stats screen can be judged with
 * something in it. Deterministic: the same button always produces the same
 * numbers, which makes "did that change?" answerable.
 */
export function sampleAttempts(days = 24): Attempt[] {
  const span: Span = { rand: rng(0x0ca1cf10), now: Date.now(), days };
  const out: Attempt[] = [];

  for (const { n: chapter } of CHAPTERS) {
    // A chapter added to the book without a profile here is not a crash: it is
    // a chapter with no sample history, which is what an untouched one looks
    // like anyway. Reading `.n` off the missing one is what used to throw and
    // leave the button doing nothing at all.
    const profile = PROFILES[chapter];
    const topics = GENERATORS.filter((g) => g.chapter === chapter);
    if (!profile || topics.length === 0) continue;

    for (let i = 0; i < profile.n; i += 1) {
      out.push(sampleOne(span, { chapter, profile, topics }, i));
    }
  }

  return out.sort((a, b) => a.ts - b.ts);
}

export function isSample(attempt: Attempt): boolean {
  return attempt.device === 'sample data';
}
