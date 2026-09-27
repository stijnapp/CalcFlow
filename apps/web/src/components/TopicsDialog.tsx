import { createPortal } from 'react-dom';
import { RotateCcw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { chapterTitle } from '@calcflow/shared';
import type { Generator } from '@calcflow/generators';
import { cx } from '@/lib/cx';
import { topicState, tuning, type TopicState } from '@/lib/topics';
import { useBackDismiss } from '@/lib/useBackDismiss';
import { useStore } from '@/state/store';

interface Props {
  open: boolean;
  onClose(): void;
  /** Every topic the chapters and tier can ask, before their own say is applied. */
  topics: readonly Generator[];
  onSet(id: string, state: TopicState): void;
  onReset(): void;
  compact?: boolean;
}

const STATES: Array<{ id: TopicState; label: string }> = [
  { id: 'off', label: 'Off' },
  { id: 'on', label: 'On' },
  { id: 'always', label: 'Always' },
];

/**
 * The topics behind "11 topics ask this", each one switchable off or wanted in
 * every set. Grouped by chapter, because with three chapters on the list is
 * long and the chapter is how they find their way down it.
 */
export function TopicsDialog({ open, onClose, topics, onSet, onReset, compact }: Props) {
  useBackDismiss(open, onClose);
  const settings = useStore((s) => s.settings);
  const ids = topics.map((g) => g.id);
  const { off, always } = tuning(settings, ids);
  const live = ids.length - off;

  const chapters = [...new Set(topics.map((g) => g.chapter))].sort((a, b) => a - b);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Topics"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className={cx(
            'fixed inset-0 z-50 flex items-center justify-center bg-scrim',
            compact ? 'p-3.5' : 'p-6',
          )}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 20, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 440, damping: 36 }}
            className={cx(
              'flex max-h-full w-full flex-col border border-strong bg-overlay shadow-[0_40px_80px_-20px_var(--color-shadow)]',
              compact ? 'gap-3 rounded-2xl p-4' : 'max-w-[620px] gap-4 rounded-3xl p-[30px]',
            )}
          >
            <div className="flex shrink-0 items-start gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className={cx('font-semibold', compact ? 'text-[17px]' : 'text-[21px]')}>Topics</h2>
                <p className="text-[13px] text-faint text-pretty">
                  <span className="text-muted">Off</span> never comes up.{' '}
                  <span className="text-accent">Always</span> comes up in every set: together the
                  always topics get about half the questions, and the rest still come in between.
                  After each answer, the verdict names the topic it was.
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="ml-auto grid size-8 shrink-0 place-items-center rounded-[9px] border border-strong bg-raised text-muted hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="scroll-y -mx-1 flex min-h-0 flex-1 flex-col gap-4 px-1">
              {chapters.map((n) => (
                <section key={n} className="flex flex-col gap-1.5">
                  {chapters.length > 1 && (
                    <div className="flex items-center gap-2.5 pt-1 text-xs text-faint">
                      <span className="font-mono">{n}</span>
                      <span>{chapterTitle(n)}</span>
                      <div className="h-px flex-1 bg-line" />
                    </div>
                  )}
                  {topics
                    .filter((g) => g.chapter === n)
                    .map((g) => {
                      const state = topicState(settings, g.id);
                      return (
                        <TopicRow
                          key={g.id}
                          title={g.title}
                          state={state}
                          // The last topic still asking cannot go too: a home
                          // screen with nothing to draw has no way to say so.
                          lastOne={state !== 'off' && live === 1}
                          onSet={(next) => onSet(g.id, next)}
                        />
                      );
                    })}
                </section>
              ))}
            </div>

            <div className="flex shrink-0 items-center gap-3 border-t border-line pt-3 text-[13px] text-muted">
              <span>
                {live} of {ids.length} asking
                {always > 0 && <span className="text-accent"> · {always} always</span>}
              </span>
              {(off > 0 || always > 0) && (
                <button
                  onClick={onReset}
                  className="ml-auto flex items-center gap-1.5 rounded-md border border-strong bg-raised px-3 py-1.5 text-ink2 hover:border-accent hover:text-ink"
                >
                  <RotateCcw className="size-3.5" />
                  All topics
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function TopicRow({
  title,
  state,
  lastOne,
  onSet,
}: {
  title: string;
  state: TopicState;
  lastOne: boolean;
  onSet(state: TopicState): void;
}) {
  return (
    <div
      className={cx(
        'flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
        state === 'always' ? 'border-accent/60 bg-accent/5' : 'border-edge bg-card',
      )}
    >
      <span className={cx('min-w-0 flex-1 text-sm text-pretty', state === 'off' ? 'text-faint' : 'text-ink')}>
        {title}
      </span>
      <div role="radiogroup" aria-label={title} className="flex shrink-0 rounded-md border border-edge bg-page p-0.5">
        {STATES.map((s) => {
          const active = state === s.id;
          return (
            <button
              key={s.id}
              role="radio"
              aria-checked={active}
              disabled={s.id === 'off' && lastOne}
              onClick={() => onSet(s.id)}
              className={cx(
                'rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                !active && 'text-faint hover:text-ink2',
                active && s.id === 'on' && 'bg-raised text-ink',
                active && s.id === 'off' && 'bg-raised text-muted',
                active && s.id === 'always' && 'bg-accent text-on-accent',
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
