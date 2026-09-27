import type { Problem } from '@calcflow/generators';
import { ArrowLeft, Lightbulb, Maximize, Minimize } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { CanvasInsets } from '@/canvas/ScribbleCanvas';
import { AnswerField } from '@/components/AnswerField';
import { ConfidenceRow } from '@/components/ConfidenceRow';
import { Eyebrow } from '@/components/Eyebrow';
import { Fit } from '@/components/Fit';
import { HintPanel } from '@/components/HintPanel';
import { ProblemCard } from '@/components/ProblemCard';
import { ProgressDots } from '@/components/ProgressDots';
import { Prose } from '@/components/Prose';
import { RevealToggle } from '@/components/RevealToggle';
import { Sheet, SHEET_PEEK } from '@/components/Sheet';
import { Tex } from '@/components/Tex';
import { cx } from '@/lib/cx';
import { useKeyBar } from '@/lib/keyBar';
import { useHeight } from '@/lib/useHeight';
import { useStore } from '@/state/store';
import { MenuScrim, PenOnlyButton, PhoneTool, ToolButtons, ToolPicker } from './practice/PhoneTools';
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

const SPRING = { type: 'spring' as const, stiffness: 420, damping: 40 };

/**
 * The fullscreen tools' frost is whole under the buttons and eases out above
 * them, so the page is not cut off by a hard edge where the frost begins.
 */
const FROST_FADE = (() => {
  const mask =
    'linear-gradient(to top, #000 0, #000 22px, rgba(0,0,0,0.92) 40px, rgba(0,0,0,0.72) 58px, rgba(0,0,0,0.45) 72px, rgba(0,0,0,0.2) 86px, rgba(0,0,0,0.06) 96px, transparent 104px)';
  return { maskImage: mask, WebkitMaskImage: mask };
})();

/**
 * Stacked: problem on top, canvas in the middle, answer sheet pinned to the
 * bottom. The sheet sits over the canvas rather than shrinking it, but the
 * canvas still stops short of the bar it leaves behind, so the last line they
 * write is never hidden under it.
 */
export function PracticePhone() {
  const fullscreen = useStore((s) => s.canvasFullscreen);
  const practice = usePractice();
  return fullscreen ? <FullscreenPhone practice={practice} /> : <StackedPhone practice={practice} />;
}

/** The canvas, and once a graph question is answered, the switch for what it shows. */
function PhoneCanvas({ practice, insets }: { practice: Practice; insets?: CanvasInsets }) {
  const setReveal = useStore((s) => s.setReveal);
  const { session, problem, answered } = useProblem();
  return (
    <>
      <PracticeCanvas
        canvasRef={practice.canvas}
        tool={practice.tool}
        className="h-full w-full"
        insets={insets}
      />
      {problem.plot && answered && (
        <div
          className="pointer-events-none absolute inset-x-0 flex justify-center"
          style={{ bottom: (insets?.bottom ?? 0) + 12 }}
        >
          <RevealToggle value={session.reveal} onChange={setReveal} />
        </div>
      )}
    </>
  );
}

function FullscreenPhone({ practice }: { practice: Practice }) {
  const { arrows } = useProblem();
  // What floats over the fullscreen canvas, which runs on underneath it.
  const [headerRef, headerHeight] = useHeight<HTMLDivElement>();
  const [toolsRef, toolsHeight] = useHeight<HTMLDivElement>();
  // While a line is being typed, the key bar takes the tool row's place at
  // the bottom rather than half covering it.
  const keyBarUp = useKeyBar((s) => s.height > 0);

  return (
    <div className="relative h-full bg-canvas">
      <div className="absolute inset-0">
        <PhoneCanvas
          practice={practice}
          insets={{ top: headerHeight, bottom: keyBarUp ? 0 : toolsHeight }}
        />
      </div>

      <FrostedQuestion boxRef={headerRef} />
      <MenuScrim practice={practice} />

      {/* More tools than the phone is wide, so the row scrolls. The picker
          has to live outside the scroller: a box that clips horizontally
          clips vertically too, and it opens upwards out of the row. */}
      {/* The padding belongs to the scroller, not to the wrapper: a row that
          stops short of the screen looks like it has run out of tools, and
          one that runs to the edge and pads its own ends looks the same at
          rest and honest once it moves. */}
      <div
        ref={toolsRef}
        className={cx(
          'absolute inset-x-0 bottom-0 z-30 pb-[22px] pt-3 transition-opacity duration-150',
          keyBarUp && 'pointer-events-none opacity-0',
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-6 bottom-0 bg-page/55 backdrop-blur-md"
          style={FROST_FADE}
        />
        <div className="scroll-x relative flex gap-2 px-4">
          <ToolButtons practice={practice} arrows={arrows} />
        </div>
        <ToolPicker practice={practice} className="absolute bottom-full left-4 mb-1" />
      </div>

      <PracticeDialogs practice={practice} />
    </div>
  );
}

/**
 * The problem stays readable while writing, as one thin bar — or, tapped, as
 * the whole question. Frosted, so the page reads as carrying on underneath it.
 */
function FrostedQuestion({ boxRef }: { boxRef(el: HTMLDivElement | null): void }) {
  const toggleQuestion = useStore((s) => s.toggleQuestion);
  const setFullscreen = useStore((s) => s.setCanvasFullscreen);
  const { session, problem } = useProblem();
  const open = session.questionOpen;

  return (
    <div
      ref={boxRef}
      className="absolute inset-x-0 top-0 z-30 flex flex-col border-b border-edge/60 bg-page/65 backdrop-blur-md"
    >
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <button
          onClick={toggleQuestion}
          aria-expanded={open}
          aria-label={open ? 'Shrink the question' : 'Show the whole question'}
          className="relative min-w-0 flex-1 text-left"
        >
          <QuestionLine open={open} problem={problem} />
        </button>
        <PenOnlyButton />
        <button
          onClick={() => setFullscreen(false)}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] border border-border bg-raised px-2.5 text-accent"
        >
          <Minimize className="size-3.5" />
          <span className="font-mono text-[10px] tracking-[0.08em]">EXIT</span>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && <WholeQuestion key="whole" problem={problem} onClose={toggleQuestion} />}
      </AnimatePresence>
    </div>
  );
}

/** The bar's one line: the sum while closed, what to do with it while open. */
function QuestionLine({ open, problem }: { open: boolean; problem: Problem }) {
  return (
    <AnimatePresence initial={false} mode="popLayout">
      {open ? (
        <motion.div
          key="instruction"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={SPRING}
        >
          <Eyebrow className="text-[10px] leading-snug">{problem.instruction.toUpperCase()}</Eyebrow>
        </motion.div>
      ) : (
        <motion.div
          key="line"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={SPRING}
        >
          <Fit className="text-[17px]">
            <Tex>{problem.prompt}</Tex>
          </Fit>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function WholeQuestion({ problem, onClose }: { problem: Problem; onClose(): void }) {
  return (
    <motion.button
      onClick={onClose}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={SPRING}
      className="block w-full shrink-0 overflow-hidden text-left"
    >
      {/* Grows out of the line it replaces, rather than fading in over it. */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.8 }}
        transition={SPRING}
        className="flex origin-top-left flex-col gap-3 px-4 pb-4"
      >
        {problem.promptText && (
          <Prose className="text-sm leading-relaxed text-ink2 text-pretty">
            {problem.promptText}
          </Prose>
        )}
        <Fit className="text-2xl">
          <Tex>{problem.prompt}</Tex>
        </Fit>
        {problem.note && (
          <Prose className="-mt-1 text-xs text-faint text-pretty">{problem.note}</Prose>
        )}
      </motion.div>
    </motion.button>
  );
}

function StackedPhone({ practice }: { practice: Practice }) {
  const { session, problem, answered } = useProblem();
  return (
    <div className="relative flex h-full flex-col overflow-clip">
      <PhoneHeader practice={practice} />

      {/* It stays put while they type. Folding it away on focus bought a line
          of notes and cost a screen that jumped every time the caret went in
          or came out. */}
      <div className="shrink-0 px-4 pt-3">
        <ProblemCard problem={problem} compact />
      </div>

      {/* The canvas stops above the answer bar rather than behind it. */}
      <div
        className="relative mx-4 mt-3 min-h-0 flex-1 overflow-hidden rounded-xl border border-edge"
        style={{ marginBottom: answered ? 16 : SHEET_PEEK + 12 }}
      >
        <PhoneCanvas practice={practice} />
        <CanvasTools practice={practice} />
      </div>

      <MenuScrim practice={practice} />
      {answered ? <VerdictSheet /> : <AnswerSheet />}
      <AnimatePresence>{session.hintsOpen && <HintPanel variant="sheet" />}</AnimatePresence>
      <PracticeDialogs practice={practice} />
    </div>
  );
}

function PhoneHeader({ practice }: { practice: Practice }) {
  const setHintsOpen = useStore((s) => s.setHintsOpen);
  const { session } = useProblem();
  return (
    <header className="flex shrink-0 items-center gap-2.5 px-4 pt-3">
      <button
        onClick={() => practice.setLeaveAsk(true)}
        aria-label="End this session"
        className="grid size-8 shrink-0 place-items-center rounded-[10px] border border-border bg-card text-muted"
      >
        <ArrowLeft className="size-4" />
      </button>
      <span className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-xs text-ink2">
        {position(session)}
      </span>
      <ProgressDots session={session} />
      {/* Still there after submitting: the rungs are worth reading most when
          the answer turned out to be wrong. */}
      <button
        onClick={() => setHintsOpen(true)}
        className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1"
      >
        <Lightbulb className="size-3.5 text-accent" />
        <span className="text-[11px] text-ink2">Hint</span>
      </button>
    </header>
  );
}

/**
 * The tools scroll; pen-only and fullscreen do not. Those two are how they get
 * their hand out of the way and how they get more room, and hunting for either
 * by swiping a row is exactly the wrong moment.
 */
function CanvasTools({ practice }: { practice: Practice }) {
  const setFullscreen = useStore((s) => s.setCanvasFullscreen);
  const { arrows } = useProblem();
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3.5 z-30 flex items-start gap-1.5">
      {/* Only the left end runs to the border: pen-only and fullscreen are
          parked against the right one, and a row sliding under them would
          read as tools falling off the screen rather than as a scroller. */}
      <div className="scroll-x pointer-events-auto flex min-w-0 flex-1 gap-1.5 pl-3.5">
        <ToolButtons practice={practice} arrows={arrows} small />
      </div>
      <div className="pointer-events-auto flex shrink-0 gap-1.5 pr-3.5">
        <PenOnlyButton />
        <PhoneTool small onClick={() => setFullscreen(true)} label="Fullscreen canvas">
          <Maximize className="size-[15px] text-accent" />
        </PhoneTool>
      </div>
      <ToolPicker practice={practice} className="pointer-events-auto absolute left-3.5 top-full mt-2" />
    </div>
  );
}

function VerdictSheet() {
  const next = useStore((s) => s.next);
  const { session, graded } = useProblem();
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={SPRING}
      className="scroll-y absolute inset-x-0 bottom-0 z-30 flex max-h-full flex-col gap-3 rounded-t-3xl border-t border-border bg-card p-4 shadow-[0_-24px_50px_-20px_rgba(0,0,0,0.7)]"
    >
      <Verdict compact />
      <button
        onClick={next}
        disabled={!graded}
        className={cx(
          'grid h-13 min-h-[52px] place-items-center rounded-md text-[17px] font-semibold',
          graded ? 'bg-accent text-on-accent' : 'bg-raised text-faint',
        )}
      >
        {nextLabel(session, graded)}
      </button>
    </motion.div>
  );
}

function AnswerSheet() {
  const setActiveField = useStore((s) => s.setActiveField);
  const setAnswer = useStore((s) => s.setAnswer);
  const setConfidence = useStore((s) => s.setConfidence);
  const submit = useStore((s) => s.submit);
  const { session, problem, ready } = useProblem();
  return (
    <Sheet className="gap-3 px-4 pb-4">
      {/* No copy of the question in here: the keyboard shrinks the page
          rather than sliding it up, so the card above stays in sight. */}
      <div className="scroll-y flex min-h-0 flex-1 flex-col gap-3">
        <AnswerField
          specs={problem.answers}
          values={session.answers}
          activeField={session.activeField}
          onFocusField={setActiveField}
          onChange={setAnswer}
          onSubmit={ready ? submit : undefined}
          state="editing"
          compact
        />
      </div>
      {/* One line, always: the row used to fold onto one line only while they
          typed, and a layout that rearranges itself under their thumb as the
          keyboard comes and goes is the thing they asked to be rid of. */}
      <div className="flex shrink-0 items-stretch gap-2">
        <div className="min-w-0 flex-1">
          <ConfidenceRow value={session.confidence} onChange={setConfidence} compact />
        </div>
        <button
          onClick={submit}
          disabled={!ready}
          className={cx(
            'grid h-10 w-[84px] shrink-0 place-items-center rounded-md text-[14px] font-semibold',
            ready ? 'bg-accent text-on-accent' : 'cursor-not-allowed bg-raised text-faint',
          )}
        >
          Submit
        </button>
      </div>
    </Sheet>
  );
}
