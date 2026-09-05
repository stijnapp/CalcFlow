/**
 * One dial instead of two. The stops get further apart as they climb so the
 * scale has somewhere to grow: today's generators top out around stop 9, and
 * new topics can claim the thin air above without renumbering what he already
 * knows a "5" feels like.
 */
export const LEVELS = [1, 2, 3, 5, 7, 10, 15, 20, 30] as const;

export const MAX_LEVEL = LEVELS.length;

export interface LevelSpec {
  /** How many operations are chained, 1–5. */
  steps: number;
  /** How ugly the numbers get, 1–5. */
  difficulty: number;
}

/**
 * A level is an index into `LEVELS`, 1-based. Climbing it raises steps and
 * difficulty in step with each other — harder problems are longer problems, and
 * asking him to set both separately only ever produced cells nothing filled.
 */
export function levelSpec(level: number): LevelSpec {
  const i = Math.min(MAX_LEVEL, Math.max(1, Math.round(level))) - 1;
  return {
    difficulty: Math.min(5, 1 + Math.floor(i / 2)),
    steps: Math.min(5, 1 + Math.ceil(i / 2)),
  };
}

/** The number shown on the slider for a level. */
export function levelLabel(level: number): number {
  return LEVELS[Math.min(MAX_LEVEL, Math.max(1, Math.round(level))) - 1]!;
}
