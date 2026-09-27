import { useMemo } from 'react';
import { sessionChapters } from './session';
import { useStore } from './store';

/**
 * The chapters Start would draw from right now: the ones ticked, or the ones
 * weak spots and build speed chose. The home screen shows these, so the sample
 * and the topic count are of the set they are about to get.
 */
export function useSessionChapters(): number[] {
  const mode = useStore((s) => s.settings.mode);
  const picked = useStore((s) => s.settings.chapters);
  const stats = useStore((s) => s.stats);
  return useMemo(() => sessionChapters(mode, picked, stats), [mode, picked, stats]);
}
