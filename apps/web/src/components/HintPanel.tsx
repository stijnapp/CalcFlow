import { useEffect, useRef } from 'react';
import { Bookmark, BookmarkCheck, ChevronRight, Check, Lock, X } from 'lucide-react';
import { motion } from 'motion/react';
import { ruleById } from '@calcflow/generators';
import { cx } from '@/lib/cx';
import { useBackDismiss } from '@/lib/useBackDismiss';
import { isSaved } from '@/state/saved';
import { useStore } from '@/state/store';
import { LatexField } from './LatexField';
import { Fit } from './Fit';
import { Prose } from './Prose';
import { Sheet, SHEET_TALL } from './Sheet';
import { Tex } from './Tex';
import { buildHints, hintCount, type Hint, type HintCard } from './hints';

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 40 };
/**
 * The panel's shadow falls on the column to its left, so it is still on screen
 * after the panel itself has slid out of it. Faded on its own and quicker than
 * the slide, it is gone before the panel is, rather than vanishing after it.
 */
const SHADOW = '-30px 0 60px -20px rgba(0,0,0,0.6)';
const NO_SHADOW = '-30px 0 60px -20px rgba(0,0,0,0)';

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
      initial={{ x: '100%', boxShadow: NO_SHADOW }}
      animate={{ x: 0, boxShadow: SHADOW }}
      exit={{ x: '100%', boxShadow: NO_SHADOW }}
      transition={{ ...SPRING, boxShadow: { duration: 0.25, ease: 'easeOut' } }}
      className="absolute inset-y-0 right-0 z-30 flex w-[38%] flex-col border-l border-strong bg-raised"
    >
      <Body panel onClose={close} />
    </motion.div>
  );
}

function Body({ panel, onClose }: { panel: boolean; onClose(): void }) {
  const session = useStore((s) => s.session)!;
  const revealRung = useStore((s) => s.revealRung);
  const setOpenRule = useStore((s) => s.setOpenRule);

  const cards = buildHints(session.problem);
  const total = hintCount(cards);
  const shown = Math.min(session.rung, total);
  const next = nextHint(cards, shown);
  const list = useNewestInView(shown);

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
          {shown} / {total}
        </span>
        <SaveForLater />
        <button
          onClick={onClose}
          aria-label="Close hints"
          className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-overlay text-muted hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>

      <div
        ref={list}
        className={cx('scroll-y flex min-h-0 flex-1 flex-col gap-3 pt-5', panel ? 'px-6' : 'px-4', !next && 'pb-8')}
      >
        {cards.map((card, i) => (
          <CardView
            key={card.label}
            card={card}
            index={i}
            shown={shown}
            panel={panel}
            onOpenRule={setOpenRule}
          />
        ))}

        {/* Held at the foot of the list, so the next tap is always under their
            thumb however far the working has grown. */}
        {next && (
          <div
            className={cx(
              'sticky bottom-0 -mx-1 mt-auto shrink-0 bg-linear-to-t from-70% to-transparent px-1 pb-4 pt-6',
              panel ? 'from-raised' : 'from-card',
            )}
          >
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => revealRung(total)}
              className="grid h-12 min-h-[48px] w-full place-items-center rounded-md border border-dashed border-rail bg-sunken px-3 text-sm font-medium text-accent hover:bg-overlay"
            >
              {next}
            </motion.button>
          </div>
        )}
      </div>

      <OnTrack panel={panel} />
    </>
  );
}

/**
 * Put the problem aside. Here because the hints are where they are when it is
 * too hard for now: before an answer it is a skip, and the set moves on to
 * another; after one it only keeps it, for coming back to.
 */
function SaveForLater() {
  const saveForLater = useStore((s) => s.saveForLater);
  const answered = useStore((s) => s.session?.outcome != null);
  const saved = useStore((s) => (s.session ? isSaved(s.settings.saved, s.session.problem) : false));
  const done = answered && saved;
  return (
    <button
      onClick={saveForLater}
      disabled={done}
      className={cx(
        'ml-auto flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] border px-2.5 text-[12px] font-medium',
        done ? 'border-accent/40 text-accent' : 'border-border bg-overlay text-ink2 hover:border-accent hover:text-ink',
      )}
    >
      {done ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5 text-accent" />}
      {done ? 'Saved' : answered ? 'Save for later' : 'Skip for later'}
    </button>
  );
}

/**
 * The newest hint is brought into view: on a phone, the one they just asked
 * for would otherwise open below the fold of the sheet, under the button.
 */
function useNewestInView(shown: number) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const box = list.current;
      // Found by attribute: a motion element keeps the ref it mounted with, so
      // a ref handed from card to card stays on the first one.
      const el = box?.querySelector('[data-newest]');
      if (!box || !el) return;
      // Measured, not `scrollIntoView`: that also scrolls every ancestor that
      // can be, overflow hidden or not, and the practice screen must not move.
      const over = el.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom + 72;
      if (over > 0) box.scrollBy({ top: over, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [shown]);
  return list;
}

function CardView({
  card,
  index,
  shown,
  panel,
  onOpenRule,
}: {
  card: HintCard;
  index: number;
  shown: number;
  panel: boolean;
  onOpenRule(id: string): void;
}) {
  const seen = Math.max(0, Math.min(card.hints.length, shown - card.from));
  const open = seen > 0;
  const latest = open && shown > card.from && shown <= card.from + card.hints.length;
  return (
    <motion.div
      data-newest={latest || undefined}
      /* Position only: animating the box itself scales its contents,
         which is what was squashing the button at the end of the list. */
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: open ? 1 : 0.55, y: 0 }}
      transition={{ ...SPRING, delay: index * 0.03 }}
      className={cx(
        'flex shrink-0 flex-col gap-2.5 rounded-lg border bg-sunken',
        panel ? 'px-[18px]' : 'px-3.5',
        open ? 'border-soft py-4' : 'border-overlay py-3',
      )}
    >
      {/* Where it is, never what it says. */}
      <div className="flex items-center gap-2.5">
        <span
          className={cx(
            'font-mono text-[11px] uppercase tracking-[0.08em]',
            open ? 'text-accent' : 'text-faint',
          )}
        >
          {card.label}
        </span>
        {!open && <Lock className="ml-auto size-3.5 text-faint" aria-label="locked" />}
      </div>

      {card.hints.slice(0, seen).map((hint, j) => (
        <motion.div
          key={j}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
        >
          <HintBody hint={hint} panel={panel} onOpenRule={onOpenRule} />
        </motion.div>
      ))}
    </motion.div>
  );
}

/** A line of their own working, checked against every line on the way to the answer. */
function OnTrack({ panel }: { panel: boolean }) {
  const onTrack = useStore((s) => s.session?.onTrack);
  const line = useStore((s) => s.session?.onTrackLine ?? '');
  const checkOnTrack = useStore((s) => s.checkOnTrack);
  const setLine = useStore((s) => s.setOnTrackLine);
  return (
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

      {onTrack === 'yes' && (
        <div className="flex items-center gap-2.5 rounded-sm border border-correct/30 bg-correct/10 px-3.5 py-2.5">
          <Check className="size-4 shrink-0 text-correct" />
          <span className="text-[13px] text-correct-ink">
            Equivalent to a valid intermediate line — keep going.
          </span>
        </div>
      )}
      {onTrack === 'no' && (
        <div className="flex items-center gap-2.5 rounded-sm border border-near/40 bg-near/10 px-3.5 py-2.5">
          <X className="size-4 shrink-0 text-near-ink" />
          <span className="text-[13px] text-near-ink">
            That does not match any line on the way to the answer. Check the step before it.
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * What the next tap is, in words that give none of it away: the step it
 * belongs to, or that it is the answer — which they should get to decide to see.
 */
function nextHint(cards: readonly HintCard[], shown: number): string | null {
  for (const card of cards) {
    const i = shown - card.from;
    if (i < 0 || i >= card.hints.length) continue;
    const hint = card.hints[i]!;
    switch (hint.kind) {
      case 'start':
        return 'Where to start';
      case 'move':
        return `Show ${card.label.toLowerCase()}`;
      case 'line':
        return hint.answer ? 'Show the answer' : 'Show what it gives';
      case 'answer':
        return 'Show the answer';
    }
  }
  return null;
}

function HintBody({
  hint,
  panel,
  onOpenRule,
}: {
  hint: Hint;
  panel: boolean;
  onOpenRule(id: string): void;
}) {
  if (hint.kind === 'start') {
    return (
      <div className="flex flex-col gap-2.5">
        <Prose className="text-sm leading-relaxed text-ink2 text-pretty">{hint.body}</Prose>
        {/* Every card the problem leans on, each one a tap from its statement
            and a worked example of it. */}
        {hint.ruleIds.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {hint.ruleIds.map((id) => {
              const card = ruleById(id);
              if (!card) return null;
              return (
                <button
                  key={id}
                  onClick={() => onOpenRule(id)}
                  className="flex items-center gap-2 rounded-md border border-border bg-page px-3 py-2 text-left text-[13px] text-accent hover:border-accent"
                >
                  {card.name}
                  <ChevronRight className="ml-auto size-3.5 shrink-0 text-faint" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (hint.kind === 'move') {
    // A move that applies a boxed rule opens that rule's card, as the same
    // line does under "See the steps".
    const rule = hint.ruleId ? ruleById(hint.ruleId) : undefined;
    return (
      <div className="flex flex-col gap-1.5">
        {rule ? (
          <button
            onClick={() => onOpenRule(rule.id)}
            className="flex items-center gap-1.5 self-start text-left text-[15px] font-medium text-accent hover:underline"
          >
            {hint.title}
            <ChevronRight className="size-3.5 shrink-0 text-faint" />
          </button>
        ) : (
          <p className="text-[15px] font-medium text-ink">{hint.title}</p>
        )}
        {hint.body && (
          <Prose className="text-sm leading-relaxed text-ink2 text-pretty">{hint.body}</Prose>
        )}
      </div>
    );
  }

  const box = (answer: boolean) =>
    cx(
      'rounded-[10px] border bg-page',
      answer ? 'border-accent/50' : 'border-border',
      panel ? 'px-4 py-3.5 text-xl' : 'px-2.5 py-2.5 text-[15px]',
    );

  if (hint.kind === 'line') {
    return (
      <div className={box(hint.answer)}>
        <Fit>
          <Tex>{hint.tex}</Tex>
        </Fit>
      </div>
    );
  }

  // Three bare numbers in a row say nothing about which box each one goes in,
  // so each sits under its field's name, as the fields themselves do.
  return (
    <div className={cx(box(true), 'flex flex-col gap-2.5')}>
      {hint.answers.map((a, i) => (
        <div key={i} className="flex min-w-0 flex-col gap-0.5">
          {a.label && <span className="text-[13px] text-faint">{a.label}</span>}
          <Fit>
            <Tex>{a.tex}</Tex>
          </Fit>
        </div>
      ))}
    </div>
  );
}
