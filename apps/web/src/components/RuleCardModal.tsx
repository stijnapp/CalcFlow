import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { makeRng, newSeed, ruleById, ruleExample } from '@calcflow/generators';
import { useBackDismiss } from '@/lib/useBackDismiss';
import { useLayout } from '@/lib/useLayout';
import { cx } from '@/lib/cx';
import { useStore } from '@/state/store';
import { Eyebrow } from './Eyebrow';
import { Fit } from './Fit';
import { HoverLabel } from './HoverLabel';
import { Tex } from './Tex';

export function RuleCardModal() {
  const openRule = useStore((s) => s.openRule);
  const setOpenRule = useStore((s) => s.setOpenRule);
  const compact = useLayout() === 'phone';
  const rule = openRule ? ruleById(openRule) : undefined;
  useBackDismiss(rule !== undefined, () => setOpenRule(null));

  /**
   * The example is a draw, and this is the draw. Rerolled on the way in as well
   * as on the button, so opening the same card twice is not the same numbers
   * twice — half the value of an example is seeing the rule survive a different
   * set of them.
   */
  const [seed, setSeed] = useState(newSeed);
  useEffect(() => {
    if (openRule) setSeed(newSeed());
  }, [openRule]);

  const example = useMemo(
    () => (rule ? ruleExample(rule.id, makeRng(`${rule.id}:${seed}`)) : undefined),
    [rule, seed],
  );

  return (
    <AnimatePresence>
      {rule && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={rule.name}
          onClick={() => setOpenRule(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className={cx(
            'absolute inset-0 z-50 grid place-items-center bg-[rgba(8,7,6,0.66)]',
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
              'flex max-h-full w-full flex-col border border-strong bg-overlay shadow-[0_40px_80px_-20px_#000]',
              compact ? 'gap-3 rounded-2xl p-4' : 'max-w-[560px] gap-4 rounded-3xl p-[30px]',
            )}
          >
            <div className="flex shrink-0 items-center gap-3">
              <h2 className={cx('min-w-0 font-semibold', compact ? 'text-[17px]' : 'text-[21px]')}>
                {rule.name}
              </h2>
              <button
                onClick={() => setOpenRule(null)}
                aria-label="Close"
                className="ml-auto grid size-8 shrink-0 place-items-center rounded-[9px] border border-strong bg-raised text-muted hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* The card itself stays put; only the worked example scrolls, so
                the rule he came to read is never the part that goes off-screen. */}
            <div className="scroll-y flex min-h-0 flex-1 flex-col gap-4">
              <div
                className={cx(
                  'grid shrink-0 place-items-center scroll-x rounded-lg border border-border bg-card',
                  compact ? 'p-3 text-[17px]' : 'p-[26px] text-[26px]',
                )}
              >
                <Tex>{rule.tex}</Tex>
              </div>

              <p
                className={cx(
                  'shrink-0 leading-relaxed text-ink2 text-pretty',
                  compact ? 'text-[13px]' : 'text-sm',
                )}
              >
                {rule.note}
              </p>

              {example && (
                <section className="flex shrink-0 flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <Eyebrow>EXAMPLE</Eyebrow>
                    <div className="h-px flex-1 bg-line" />
                    <HoverLabel label="Another set of numbers">
                      <button
                        onClick={() => setSeed(newSeed())}
                        aria-label="Show a different example"
                        className="flex items-center gap-1.5 rounded-sm border border-strong bg-raised px-2.5 py-1 text-[12px] text-muted hover:border-accent hover:text-ink"
                      >
                        <RefreshCw className="size-3" />
                        Randomise
                      </button>
                    </HoverLabel>
                  </div>

                  {/* Keyed on the seed so a reroll reads as a new example
                      arriving rather than as the old one silently changing. */}
                  <motion.div
                    key={seed}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className={cx(
                      'flex flex-col gap-2 rounded-lg border border-edge bg-card',
                      compact ? 'px-3 py-3' : 'px-4 py-3.5',
                    )}
                  >
                    {example.given && (
                      <Fit className={cx('text-muted', compact ? 'text-[14px]' : 'text-[15px]')}>
                        <Tex>{example.given}</Tex>
                      </Fit>
                    )}
                    {example.steps.map((line, i) => (
                      <Fit key={i} className={compact ? 'text-[15px]' : 'text-[17px]'}>
                        <Tex>{line}</Tex>
                      </Fit>
                    ))}
                  </motion.div>
                </section>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
