import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ruleById } from '@calcflow/generators';
import { useBackDismiss } from '@/lib/useBackDismiss';
import { useLayout } from '@/lib/useLayout';
import { cx } from '@/lib/cx';
import { useStore } from '@/state/store';
import { Tex } from './Tex';

export function RuleCardModal() {
  const openRule = useStore((s) => s.openRule);
  const setOpenRule = useStore((s) => s.setOpenRule);
  const compact = useLayout() === 'phone';
  const rule = openRule ? ruleById(openRule) : undefined;
  useBackDismiss(rule !== undefined, () => setOpenRule(null));

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
              'flex w-full flex-col border border-strong bg-overlay shadow-[0_40px_80px_-20px_#000]',
              compact ? 'gap-3 rounded-2xl p-4' : 'max-w-[560px] gap-4 rounded-3xl p-[30px]',
            )}
          >
            <div className={cx('flex gap-3', compact ? 'flex-wrap items-baseline' : 'items-center')}>
              <span className="font-mono text-[11px] tracking-[0.12em] text-accent">
                CH {rule.chapter} · RULE CARD
              </span>
              <h2 className={cx('font-semibold', compact ? 'text-[17px]' : 'text-[21px]')}>{rule.name}</h2>
              <button
                onClick={() => setOpenRule(null)}
                aria-label="Close"
                className="ml-auto grid size-8 shrink-0 place-items-center rounded-[9px] border border-strong bg-raised text-muted hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>

            <div
              className={cx(
                'grid place-items-center scroll-x rounded-lg border border-border bg-card',
                compact ? 'p-3 text-[17px]' : 'p-[26px] text-[26px]',
              )}
            >
              <Tex>{rule.tex}</Tex>
            </div>

            <p className={cx('leading-relaxed text-ink2 text-pretty', compact ? 'text-[13px]' : 'text-sm')}>
              {rule.note}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
