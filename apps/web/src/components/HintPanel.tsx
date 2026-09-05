import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { motion } from 'motion/react';
import { cx } from '@/lib/cx';
import { useBackDismiss } from '@/lib/useBackDismiss';
import { useStore } from '@/state/store';
import { LatexField } from './LatexField';
import { Sheet, SHEET_TALL } from './Sheet';
import { Tex } from './Tex';
import { buildRungs } from './hints';

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 40 };

interface Props {
  /** The phone gets a bottom sheet; the tablet a panel over the control column. */
  variant: 'panel' | 'sheet';
}

export function HintPanel({ variant }: Props) {
  const session = useStore((s) => s.session);
  const setHintsOpen = useStore((s) => s.setHintsOpen);
  useBackDismiss(true, () => setHintsOpen(false));
  if (!session) return null;

  const close = () => setHintsOpen(false);

  if (variant === 'sheet') {
    return (
      <Sheet closeable onClose={close} height={SHEET_TALL} className="px-0">
        <Body panel={false} onClose={close} />
      </Sheet>
    );
  }

  return (
    <motion.div
      /* The tablet panel belongs to the right-hand column, so it arrives from
         that edge; the phone sheet still comes up from the thumb. */
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={SPRING}
      className="absolute inset-y-0 right-0 z-20 flex w-[38%] flex-col border-l border-strong bg-raised shadow-[-30px_0_60px_-20px_rgba(0,0,0,0.6)]"
    >
      <Body panel onClose={close} />
    </motion.div>
  );
}

function Body({ panel, onClose }: { panel: boolean; onClose(): void }) {
  const session = useStore((s) => s.session)!;
  const revealRung = useStore((s) => s.revealRung);
  const checkOnTrack = useStore((s) => s.checkOnTrack);
  const setOpenRule = useStore((s) => s.setOpenRule);
  const [line, setLine] = useState('');

  const rungs = buildRungs(session.problem);
  const shown = Math.min(session.rung, rungs.length);

  return (
    <>
      <div
        className={cx(
          'flex shrink-0 items-center gap-3 border-b border-soft',
          panel ? 'px-6 py-[18px]' : 'px-4 py-3',
        )}
      >
        <h2 className="text-[18px] font-semibold">Hints</h2>
        <span className="font-mono text-xs text-faint">
          RUNG {shown} / {rungs.length}
        </span>
        <button
          onClick={onClose}
          aria-label="Close hints"
          className="ml-auto grid size-8 place-items-center rounded-[9px] bg-overlay text-muted hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className={cx('scroll-y flex min-h-0 flex-1 flex-col gap-3 pb-12 pt-5', panel ? 'px-6' : 'px-4')}>
        {rungs.map((rung, i) => {
          const open = i < shown;
          return (
            <motion.div
              key={rung.num}
              /* Position only: animating the box itself scales its contents,
                 which is what was squashing the button at the end of the list. */
              layout="position"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: open ? 1 : 0.5, y: 0 }}
              transition={{ ...SPRING, delay: i * 0.04 }}
              className={cx(
                'flex shrink-0 flex-col gap-2 rounded-lg border bg-sunken py-4',
                panel ? 'px-[18px]' : 'px-3.5',
                open ? 'border-soft' : 'border-overlay',
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className={cx('font-mono text-[11px]', open ? 'text-accent' : 'text-faint')}>
                  {rung.num}
                </span>
                <span className={cx('text-sm font-medium', open ? 'text-ink' : 'text-[#8a8177]')}>
                  {rung.title}
                </span>
                {!open && <span className="ml-auto text-xs text-faint">locked</span>}
              </div>

              {open && (
                <div className="flex flex-col gap-2.5">
                  <p className="text-sm leading-relaxed text-ink2 text-pretty">{rung.body}</p>
                  {rung.tex && (
                    <div
                      className={cx(
                        'scroll-x rounded-[10px] border border-border bg-page',
                        panel ? 'px-4 py-3.5 text-xl' : 'px-2.5 py-2.5 text-[15px]',
                      )}
                    >
                      <Tex>{rung.tex}</Tex>
                    </div>
                  )}
                  {rung.ruleId && (
                    <button
                      onClick={() => setOpenRule(rung.ruleId!)}
                      className="self-start border-b border-accent/40 text-[13px] text-accent"
                    >
                      Open the rule card
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}

        {shown < rungs.length && (
          <motion.button
            layout="position"
            whileTap={{ scale: 0.98 }}
            onClick={() => revealRung(rungs.length)}
            className="grid h-12 min-h-[48px] shrink-0 place-items-center rounded-md border border-dashed border-rail px-3 text-sm font-medium text-accent hover:bg-overlay"
          >
            Reveal {rungs[shown]!.title.toLowerCase()}
          </motion.button>
        )}
      </div>

      <div
        className={cx(
          'flex shrink-0 flex-col gap-2.5 border-t border-soft bg-sunken pb-[22px] pt-[18px]',
          panel ? 'px-6' : 'px-4',
        )}
      >
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-medium">Am I still on track?</h3>
          <span className="text-xs text-faint">type any line from your working</span>
        </div>
        <LatexField
          value={line}
          onChange={setLine}
          onSubmit={() => checkOnTrack(line)}
          placeholder="\frac{1}{2\sqrt{x}}"
          ariaLabel="A line from your working"
          compact={!panel}
          trailing={
            <button
              onClick={() => checkOnTrack(line)}
              className="h-8 shrink-0 rounded-[9px] border border-strong bg-overlay px-3 text-[13px] hover:border-accent"
            >
              Check
            </button>
          }
        />

        {session.onTrack === 'yes' && (
          <div className="flex items-center gap-2.5 rounded-sm border border-correct/30 bg-correct/10 px-3.5 py-2.5">
            <Check className="size-4 shrink-0 text-correct" />
            <span className="text-[13px] text-correct-ink">
              Equivalent to a valid intermediate line — keep going.
            </span>
          </div>
        )}
        {session.onTrack === 'no' && (
          <div className="flex items-center gap-2.5 rounded-sm border border-near/40 bg-near/10 px-3.5 py-2.5">
            <X className="size-4 shrink-0 text-near-ink" />
            <span className="text-[13px] text-near-ink">
              That does not match any line on the way to the answer. Check the step before it.
            </span>
          </div>
        )}
      </div>
    </>
  );
}
