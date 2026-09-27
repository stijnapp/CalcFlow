import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft, Lightbulb } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { AnswerField } from '@/components/AnswerField';
import { ConfidenceRow } from '@/components/ConfidenceRow';
import { Eyebrow } from '@/components/Eyebrow';
import { HintPanel } from '@/components/HintPanel';
import { ProblemCard } from '@/components/ProblemCard';
import { ProgressDots } from '@/components/ProgressDots';
import { RevealToggle } from '@/components/RevealToggle';
import { RulesUsed } from '@/components/RulesUsed';
import { ToolRail } from '@/components/ToolRail';
import { cx } from '@/lib/cx';
import { useBottomInset } from '@/lib/useKeyboardInset';
import { useStore } from '@/state/store';
import {
  PracticeCanvas,
  PracticeDialogs,
  Verdict,
  nextLabel,
  position,
  useProblem,
  type Practice,
} from './practice/shared';
import { usePractice } from './usePractice';

/**
 * Canvas on the left, controls on the right — so their writing hand rests on
 * the tablet rather than hanging off the edge. The question stays put;
 * everything under it scrolls together, because a second answer box or a
 * revealed solution is more than the column can hold.
 */
export function PracticeTablet() {
  const hintsOpen = useStore((s) => s.session?.hintsOpen ?? false);
  const practice = usePractice();

  return (
    <div className="relative flex h-full overflow-clip">
      <div className="relative flex w-[62%] shrink-0 bg-canvas">
        <Rail practice={practice} />
        <PracticeCanvas canvasRef={practice.canvas} tool={practice.tool} className="flex-1" />
        <PlotLegend />
      </div>
      <Column practice={practice} />
      <AnimatePresence>{hintsOpen && <HintPanel variant="panel" />}</AnimatePresence>
      <PracticeDialogs practice={practice} />
    </div>
  );
}

function Rail({ practice }: { practice: Practice }) {
  const penWidth = useStore((s) => s.settings.penWidth);
  const arrowSnap = useStore((s) => s.settings.arrowSnap);
  const penOnly = useStore((s) => s.settings.penOnly);
  const patchSettings = useStore((s) => s.patchSettings);
  const { arrows } = useProblem();
  return (
    <ToolRail
      tool={practice.tool}
      onTool={practice.setTool}
      penWidth={penWidth}
      onPenWidth={(next) => patchSettings({ penWidth: next })}
      arrowSnap={arrowSnap}
      onArrowSnap={(next) => patchSettings({ arrowSnap: next })}
      toolMenu={practice.toolMenu}
      onCloseToolMenu={() => practice.setToolMenu(false)}
      penOnly={penOnly}
      onPenOnly={(next) => patchSettings({ penOnly: next })}
      onUndo={practice.undo}
      onRedo={practice.redo}
      onClear={practice.askClear}
      arrows={arrows}
    />
  );
}

/** What a graph question's paper does, and once answered, what it is showing. */
function PlotLegend() {
  const setReveal = useStore((s) => s.setReveal);
  const arrowSnap = useStore((s) => s.settings.arrowSnap);
  const { session, problem, answered, arrows } = useProblem();
  if (!problem.plot) return null;

  let legend: ReactNode =
    'Graph paper with real axes · the answer is drawn over your sketch when you submit';
  if (answered) {
    legend = (
      <>
        <span className="text-ink">your sketch</span> · <span className="text-accent">the answer</span>
      </>
    );
  } else if (arrows) {
    legend = arrowSnap
      ? 'Arrows snap to whole lattice points · tap the vector tool again to draw free'
      : 'Arrows go where the pen does · tap the vector tool again to snap';
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-2">
      {answered && <RevealToggle value={session.reveal} onChange={setReveal} />}
      <span className="rounded-full border border-strong bg-overlay px-3 py-1 text-[11px] text-muted">
        {legend}
      </span>
    </div>
  );
}

function Column({ practice }: { practice: Practice }) {
  const setHintsOpen = useStore((s) => s.setHintsOpen);
  const { session, problem, answered } = useProblem();
  const scroller = useRef<HTMLDivElement>(null);
  /*
   * The key bar floats over the bottom of this column while the keyboard is
   * up. Handing the strip it covers to the scroller as padding is what lets
   * the submit button scroll up clear of it.
   */
  const keyboard = useBottomInset();

  // Submitting from the bottom of a long column would otherwise leave them
  // looking at the last line of the verdict instead of at the verdict.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [answered, problem.seed]);

  return (
    <div className="flex min-w-0 flex-1 flex-col border-l border-edge bg-page">
      <header className="flex items-center gap-3 px-[26px] pt-[22px]">
        <button
          onClick={() => practice.setLeaveAsk(true)}
          aria-label="End this session"
          className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-card text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" />
        </button>
        <span className="shrink-0 rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-sm text-ink2">
          {position(session)}
        </span>
        <ProgressDots session={session} />
        {/* Still there after submitting: the rungs are worth reading most when
            the answer turned out to be wrong. */}
        <button
          onClick={() => setHintsOpen(true)}
          className="ml-auto flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 hover:border-accent"
        >
          <Lightbulb className="size-4 text-accent" />
          <span className="text-[13px] text-ink2">Hint</span>
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 px-[26px] pt-5">
        <div className="shrink-0">
          <ProblemCard problem={problem} />
        </div>

        {/* Everything under the question shares one scroll surface: two answer
            boxes, or a wrong answer with its full solution, do not fit a
            column this narrow. */}
        <div
          ref={scroller}
          style={{ paddingBottom: 22 + keyboard }}
          className="scroll-y -mx-[26px] flex min-h-0 flex-1 flex-col gap-3.5 px-[26px]"
        >
          {answered ? <Answered /> : <Answering />}
        </div>
      </div>
    </div>
  );
}

function Answered() {
  const next = useStore((s) => s.next);
  const { session, problem, graded } = useProblem();
  return (
    <>
      <Verdict />
      <RulesUsed problem={problem} />
      <button
        onClick={next}
        disabled={!graded}
        autoFocus
        className={cx(
          'mt-auto grid h-14 shrink-0 place-items-center rounded-lg text-[17px] font-semibold transition-colors',
          graded
            ? 'bg-accent text-on-accent hover:bg-accent-hi'
            : 'cursor-not-allowed bg-raised text-faint',
        )}
      >
        {nextLabel(session, graded)}
      </button>
    </>
  );
}

function submitLabel(filled: boolean, sure: boolean): string {
  if (!filled) return 'Type an answer to submit';
  return sure ? 'Submit' : 'Pick a confidence to submit';
}

function Answering() {
  const setActiveField = useStore((s) => s.setActiveField);
  const setAnswer = useStore((s) => s.setAnswer);
  const setConfidence = useStore((s) => s.setConfidence);
  const submit = useStore((s) => s.submit);
  const { session, problem, filled, ready } = useProblem();
  return (
    <>
      <div className="flex shrink-0 flex-col gap-2.5">
        <Eyebrow>YOUR ANSWER</Eyebrow>
        <AnswerField
          specs={problem.answers}
          values={session.answers}
          activeField={session.activeField}
          onFocusField={setActiveField}
          onChange={setAnswer}
          onSubmit={ready ? submit : undefined}
          state="editing"
        />
      </div>

      <div className="mt-auto flex shrink-0 flex-col gap-3 pt-2">
        <Eyebrow>HOW SURE ARE YOU?</Eyebrow>
        <ConfidenceRow value={session.confidence} onChange={setConfidence} />
        <button
          onClick={submit}
          disabled={!ready}
          className={cx(
            'grid h-[60px] place-items-center rounded-lg text-[18px] font-semibold transition-colors',
            ready
              ? 'bg-accent text-on-accent hover:bg-accent-hi'
              : 'cursor-not-allowed bg-raised text-faint',
          )}
        >
          {submitLabel(filled, session.confidence !== null)}
        </button>
      </div>
    </>
  );
}
