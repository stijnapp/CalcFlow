import type { Problem } from '@calcflow/generators';
import type { SavedProblem } from '@calcflow/shared';

type Ref = Pick<SavedProblem, 'generatorId' | 'seed' | 'tier'>;

/** The same problem: the same generator, seed and tier rebuild the same numbers. */
export function sameProblem(a: Ref, b: Ref): boolean {
  return a.generatorId === b.generatorId && a.seed === b.seed && a.tier === b.tier;
}

export function isSaved(list: readonly SavedProblem[], problem: Ref): boolean {
  return list.some((p) => sameProblem(p, problem));
}

/** The list with this problem on top — once, however often it is saved. */
export function withSaved(list: readonly SavedProblem[], problem: Problem, at = Date.now()): SavedProblem[] {
  const { generatorId, seed, tier } = problem;
  return [{ generatorId, seed, tier, savedAt: at }, ...list.filter((p) => !sameProblem(p, problem))];
}

export function withoutSaved(list: readonly SavedProblem[], problem: Ref): SavedProblem[] {
  return list.filter((p) => !sameProblem(p, problem));
}
