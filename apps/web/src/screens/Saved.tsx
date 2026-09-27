import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Bookmark, Trash2 } from 'lucide-react';
import { generatorById, rebuild, type Problem } from '@calcflow/generators';
import { TIER_LABEL, type SavedProblem } from '@calcflow/shared';
import { Eyebrow } from '@/components/Eyebrow';
import { Fit } from '@/components/Fit';
import { Tex } from '@/components/Tex';
import { cx } from '@/lib/cx';
import { daysAgo } from '@/lib/format';
import { useStore } from '@/state/store';

interface Entry {
  saved: SavedProblem;
  problem: Problem;
}

/**
 * The problems put aside for later — skipped from the hints, or kept after a
 * wrong answer — each one a tap from being practised on its own. The question
 * is shown in full, because deciding which one to go and figure out means
 * reading them.
 */
export function Saved({ compact }: { compact?: boolean }) {
  const go = useStore((s) => s.go);
  const saved = useStore((s) => s.settings.saved);
  // Rebuilt from their seeds; one whose generator has gone is left out.
  const entries = useMemo(
    () =>
      saved.flatMap((s): Entry[] => {
        const problem = rebuild(s.generatorId, s.seed, s.tier);
        return problem ? [{ saved: s, problem }] : [];
      }),
    [saved],
  );

  return (
    <div className="flex h-full flex-col">
      <div className={cx('flex shrink-0 flex-col gap-2 border-b border-line', compact ? 'px-5 py-4' : 'px-10 py-5')}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => go('home')}
            aria-label="Back"
            className="grid size-10 place-items-center rounded-md border border-border bg-card text-muted hover:text-ink"
          >
            <ArrowLeft className="size-[17px]" />
          </button>
          <h1 className={cx('font-semibold tracking-[-0.02em]', compact ? 'text-[21px]' : 'text-[28px]')}>
            Saved for later
          </h1>
          {entries.length > 0 && <span className="font-mono text-sm text-faint">{entries.length}</span>}
        </div>
        <p className="text-[13px] text-faint text-pretty">
          Skip one from the hints and it waits here. Get it right and it comes off the list.
        </p>
      </div>

      {entries.length === 0 ? (
        <Empty />
      ) : (
        <div
          className={cx(
            'scroll-y grid flex-1 content-start gap-3',
            compact ? 'px-5 pb-16 pt-4' : 'grid-cols-2 px-10 pb-12 pt-6',
          )}
        >
          <AnimatePresence initial={false}>
            {entries.map((e) => (
              <SavedCard key={`${e.saved.generatorId}:${e.saved.seed}:${e.saved.tier}`} entry={e} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function Empty() {
  return (
    <div className="grid flex-1 place-items-center px-8">
      <div className="flex max-w-[340px] flex-col items-center gap-3 text-center">
        <span className="grid size-12 place-items-center rounded-full border border-border bg-card text-faint">
          <Bookmark className="size-5" />
        </span>
        <p className="text-[15px] font-medium text-ink2">Nothing saved yet</p>
        <p className="text-[13px] leading-relaxed text-faint text-pretty">
          When a problem is too hard for now, open the hints and tap “Skip for later”. It lands
          here, and the set carries on without it.
        </p>
      </div>
    </div>
  );
}

function SavedCard({ entry: { saved, problem } }: { entry: Entry }) {
  const practiseSaved = useStore((s) => s.practiseSaved);
  const forgetSaved = useStore((s) => s.forgetSaved);
  const topic = generatorById(problem.generatorId)?.title;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 460, damping: 38 }}
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex min-w-0 items-baseline gap-2.5">
        <span className="shrink-0 font-mono text-[11px] tracking-[0.12em] text-accent">CH {problem.chapter}</span>
        <span className="min-w-0 truncate text-[13px] text-ink2">{topic}</span>
        <span className="ml-auto shrink-0 text-xs text-faint">
          {TIER_LABEL[problem.tier]} · {daysAgo(saved.savedAt)}
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-edge bg-page px-3.5 py-3">
        <Eyebrow className="text-[10px]">{problem.instruction.toUpperCase()}</Eyebrow>
        <Fit className="text-[19px]">
          <Tex>{problem.prompt}</Tex>
        </Fit>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => practiseSaved(saved)}
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-accent text-sm font-semibold text-on-accent hover:bg-accent-hi"
        >
          Practise this one
          <ArrowRight className="size-4" />
        </button>
        <button
          onClick={() => forgetSaved(saved)}
          aria-label="Remove from saved"
          className="grid size-10 shrink-0 place-items-center rounded-md border border-border bg-raised text-muted hover:border-wrong hover:text-wrong-ink"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </motion.div>
  );
}
