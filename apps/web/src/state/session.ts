import {
  equivalent,
  grade,
  readDerivative,
  stripPlusC,
  tryParse,
  type GradeResult,
} from '@calcflow/engine';
import { alwaysTopics, type Problem, type TopicFilter } from '@calcflow/generators';
import type {
  Attempt,
  Confidence,
  ErrorClass,
  SelfGrade,
  SessionMode,
  Settings,
  Tier,
} from '@calcflow/shared';
import type { CanvasState } from '@/canvas/strokes';
import { deviceLabel } from '@/lib/deviceName';
import { ulid } from '@/lib/ulid';
import { nextLevel } from './adaptive';
import { slowChapters, weakChapters, type Stats } from './stats';

export interface SessionItem {
  problem: Problem;
  correct: boolean;
  errorClass: ErrorClass | null;
  confidence: Confidence;
  durationMs: number;
  hintMaxRung: number;
}

export interface Outcome {
  correct: boolean;
  errorClass: ErrorClass | null;
  /** Per answer field, in order. */
  fields: GradeResult[];
  /** How long the problem took. Carried here because a graph question's
   *  attempt is not written until the sketch has been marked, and the verdict
   *  card needs the time before then. */
  durationMs: number;
}

export interface Summary {
  target: number | null;
  done: SessionItem[];
}

export interface Session {
  mode: SessionMode;
  /** null in endless mode. */
  target: number | null;
  chapters: number[];
  /**
   * How hard this session is drawing at, from 0 (all easy) to 2 (all hard).
   * Fixed at the tier they picked unless adaptive mode is on; see `adaptive.ts`.
   */
  level: number;
  only?: string[];
  /** The home screen's say over the topics, as it stood when the set began. */
  topics?: TopicFilter;
  done: SessionItem[];
  problem: Problem;
  startedAt: number;
  /** One raw answer per field. */
  answers: string[];
  activeField: number;
  confidence: Confidence | null;
  hintsOpen: boolean;
  /** Rungs revealed so far, 0–4. */
  rung: number;
  outcome: Outcome | null;
  /**
   * Graph questions only. The sketch cannot be graded, so they mark it
   * themselves against the answer drawn over it — and until they have, the
   * attempt is not written: half a verdict in the log is worse than a slower one.
   */
  selfGrade: SelfGrade | null;
  /** Which marks the canvas is showing while the answer is up. */
  reveal: 'both' | 'mine' | 'answer';
  onTrack: 'yes' | 'no' | null;
  /** What is typed into the hint panel's "am I on track" box. */
  onTrackLine: string;
  /**
   * The fullscreen canvas shows the question at full size rather than as one
   * thin line. Theirs to open and close; it lasts until the next problem, and
   * is not saved — reopening the app starts from the thin line again.
   */
  questionOpen: boolean;
  /**
   * The working on the canvas. It is state like any other: closing the app and
   * coming back, or dropping the canvas into fullscreen — which remounts it —
   * used to throw the derivation away and leave them with the question again.
   */
  canvas: CanvasState | null;
}

/** Everything about a session that belongs to the problem on screen, as it starts. */
export function fresh(problem: Problem) {
  return {
    problem,
    startedAt: Date.now(),
    answers: problem.answers.map(() => ''),
    activeField: 0,
    confidence: null,
    hintsOpen: false,
    rung: 0,
    outcome: null,
    selfGrade: null,
    reveal: 'both',
    onTrack: null,
    onTrackLine: '',
    questionOpen: false,
    canvas: null,
  } satisfies Partial<Session>;
}

/**
 * A derivative may be written with any of the notations in the book, so the
 * label in front of it — `f'(x) =`, `\frac{dy}{dx} =`, `D_x(6x^3) =` — is read
 * off before the expression is graded. A label that does not say what they
 * meant it to say is a near miss, not a wrong answer: the maths behind it is right.
 */
export function gradeFields(problem: Problem, answers: string[]): GradeResult[] {
  const derivative = problem.verify?.kind === 'derivative' ? problem.verify : undefined;
  return problem.answers.map((spec, i) => {
    const raw = answers[i] ?? '';
    const read = derivative
      ? readDerivative(raw, { wrt: derivative.wrt, of: derivative.of })
      : undefined;
    const result = grade({
      raw: read?.body ?? raw,
      reference: spec.value,
      domain: spec.domain,
      requires: spec.requires,
      upToConstant: spec.upToConstant ?? false,
    });
    if (result.correct && read?.complaint) {
      return { ...result, correct: false, errorClass: 'notation' as const };
    }
    return result;
  });
}

const NEAR_MISSES: readonly ErrorClass[] = ['notation', 'plus-c', 'not-exact', 'not-simplified'];

/**
 * A flat wrong beats any near miss: if the maths is wrong somewhere, that is
 * what they need telling. Only when every field is mathematically right does
 * the form complaint become the message.
 */
export function worstClass(fields: GradeResult[]): ErrorClass {
  if (fields.some((f) => f.errorClass === 'wrong')) return 'wrong';
  return NEAR_MISSES.find((cls) => fields.some((f) => f.errorClass === cls)) ?? 'wrong';
}

/** The verdict on a set of graded fields, before any sketch is marked. */
export function outcomeOf(fields: GradeResult[], durationMs: number): Outcome {
  const correct = fields.every((f) => f.correct);
  return { correct, errorClass: correct ? null : worstClass(fields), fields, durationMs };
}

const SKETCH_CLASS: Record<SelfGrade, ErrorClass | null> = {
  got: null,
  close: 'sketch',
  missed: 'wrong',
};

/**
 * The typed fields decide whether a graph question counts as understood; the
 * sketch can only pull it down. A near-miss drawing lands in the same near-miss
 * bucket as a missing +C — fluency to work on, not a misconception.
 */
export function withSketch(outcome: Outcome, selfGrade: SelfGrade): Outcome {
  if (!outcome.correct) return outcome;
  const errorClass = SKETCH_CLASS[selfGrade];
  return { ...outcome, correct: errorClass === null, errorClass };
}

/**
 * Any line from any solution path counts as on track, so long as it is
 * equivalent to something on the way to the answer.
 */
export function onTrackOf(problem: Problem, latex: string): 'yes' | 'no' {
  const line = tryParse(latex);
  if (!line) return 'no';
  const targets = [
    ...problem.solution.filter((s) => !s.display).map((s) => s.expr),
    ...problem.answers.map((a) => a.tex),
  ];
  const hit = targets.some((tex) => {
    const target = tryParse(tex);
    return target ? equivalent(stripPlusC(line), stripPlusC(target)) : false;
  });
  return hit ? 'yes' : 'no';
}

/** The log entry for a finished problem. */
export function attemptOf(
  session: Session,
  outcome: Outcome,
  settings: Settings,
  selfGrade: SelfGrade | null,
): Attempt {
  const { problem } = session;
  return {
    id: ulid(),
    device: deviceLabel(settings.deviceName),
    ts: Date.now(),
    generatorId: problem.generatorId,
    seed: problem.seed,
    genVersion: problem.genVersion,
    chapter: problem.chapter,
    tier: problem.tier,
    correct: outcome.correct,
    confidence: session.confidence ?? 'think',
    hintsUsed: session.rung > 0 ? 1 : 0,
    hintMaxRung: session.rung,
    durationMs: outcome.durationMs,
    answerRaw: session.answers.join(' | '),
    errorClass: outcome.errorClass,
    selfGrade,
  };
}

/** The session once a problem's attempt is in the log: closed, and added to the set. */
export function closed(session: Session, outcome: Outcome, attempt: Attempt, adaptive: boolean): Session {
  return {
    ...session,
    // Once per answer, here where the answer is final: a streak counted again
    // at every draw is what used to carry a session up two tiers.
    level: adaptive ? nextLevel(session.level, attempt) : session.level,
    hintsOpen: false,
    outcome,
    done: [
      ...session.done,
      {
        problem: session.problem,
        correct: outcome.correct,
        errorClass: outcome.errorClass,
        confidence: attempt.confidence,
        durationMs: outcome.durationMs,
        hintMaxRung: session.rung,
      },
    ],
  };
}

export function chaptersFor(mode: SessionMode, settings: Settings, stats: Stats): number[] {
  const ranked = mode === 'weak' ? weakChapters(stats) : mode === 'speed' ? slowChapters(stats) : [];
  const chosen = ranked.filter((c) => settings.chapters.includes(c));
  return chosen.length ? chosen : settings.chapters;
}

/**
 * The topics they want in every set that this one has not asked yet — but only
 * once the set is down to as many problems as there are of them. Until then
 * they are left to the draw, which already reaches for them often.
 */
export function owedTopics(
  s: Pick<Session, 'target' | 'done' | 'chapters' | 'only' | 'topics'>,
  tier: Tier,
): string[] | undefined {
  if (s.target === null) return undefined;
  const asked = new Set(s.done.map((d) => d.problem.generatorId));
  const owed = alwaysTopics({ ...s, tier }).filter((id) => !asked.has(id));
  return owed.length > 0 && owed.length >= s.target - s.done.length ? owed : undefined;
}

/** Every question of a fixed-length set has been answered. */
export function isComplete(session: Session): boolean {
  return session.target !== null && session.done.length >= session.target;
}
