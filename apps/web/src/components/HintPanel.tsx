import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { cx } from '@/lib/cx';
import { useStore } from '@/state/store';
import { Tex } from './Tex';
import { buildRungs } from './hints';

interface Props {
  /** The phone gets a bottom sheet; the tablet a panel over the control column. */
  variant: 'panel' | 'sheet';
}

export function HintPanel({ variant }: Props) {
  const session = useStore((s) => s.session);
  const setHintsOpen = useStore((s) => s.setHintsOpen);
  const revealRung = useStore((s) => s.revealRung);
  const checkOnTrack = useStore((s) => s.checkOnTrack);
  const setOpenRule = useStore((s) => s.setOpenRule);
  const [line, setLine] = useState('');

  if (!session) return null;
  const rungs = buildRungs(session.problem);
  const shown = session.rung;

  return (
    <div
      className={cx(
        'z-20 flex flex-col border-strong bg-raised',
        variant === 'panel'
          ? 'absolute inset-y-0 right-0 w-[38%] animate-rise border-l shadow-[-30px_0_60px_-20px_rgba(0,0,0,0.6)]'
          : 'absolute inset-x-0 bottom-0 h-[78%] animate-rise rounded-t-4xl border-t shadow-[0_-30px_60px_-20px_rgba(0,0,0,0.6)]',
      )}
    >
      {variant === 'sheet' && (
        <div className="grid place-items-center pt-3">
          <div className="h-1 w-11 rounded-full bg-rail" />
        </div>
      )}

      <div className="flex items-center gap-3 border-b border-soft px-6 py-[18px]">
        <h2 className="text-[18px] font-semibold">Hints</h2>
        <span className="font-mono text-xs text-faint">RUNG {shown} / 4</span>
        <button
          onClick={() => setHintsOpen(false)}
          aria-label="Close hints"
          className="ml-auto grid size-8 place-items-center rounded-[9px] bg-overlay text-muted hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="scroll-y flex flex-1 flex-col gap-3 px-6 py-5">
        {rungs.map((rung, i) => {
          const open = i < shown;
          return (
            <div
              key={rung.num}
              style={{ animationDelay: `${i * 40}ms` }}
              className={cx(
                'flex animate-rise flex-col gap-2 rounded-lg border bg-sunken px-[18px] py-4',
                open ? 'border-soft' : 'border-overlay opacity-50',
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
                    <div className="scroll-x rounded-[10px] border border-border bg-page px-4 py-3.5 text-xl">
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
            </div>
          );
        })}

        {shown < 4 && (
          <button
            onClick={revealRung}
            className="grid h-12 place-items-center rounded-md border border-dashed border-rail text-sm font-medium text-accent hover:bg-overlay"
          >
            Reveal {rungs[shown]!.title.toLowerCase()}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-soft bg-sunken px-6 pb-[22px] pt-[18px]">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-medium">Am I still on track?</h3>
          <span className="text-xs text-faint">type any line from your working</span>
        </div>
        <div className="flex gap-2">
          <input
            value={line}
            onChange={(e) => setLine(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && checkOnTrack(line)}
            placeholder="\frac{1}{2\sqrt{x}}"
            className="min-w-0 flex-1 rounded-sm border border-border bg-well px-4 font-mono text-[13px] text-ink2 outline-none placeholder:text-ghost focus:border-accent"
            style={{ height: 48 }}
          />
          <button
            onClick={() => checkOnTrack(line)}
            className="w-[108px] shrink-0 rounded-sm border border-strong bg-overlay text-sm hover:border-accent"
          >
            Check
          </button>
        </div>

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
    </div>
  );
}
