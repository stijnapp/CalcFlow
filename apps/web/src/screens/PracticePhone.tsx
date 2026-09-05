import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Eraser,
  Hand,
  Lightbulb,
  Maximize,
  Minimize,
  PenTool,
  Redo2,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';
import { AnimatePresence, animate, motion, useDragControls, useMotionValue } from 'motion/react';
import { chapterTitle } from '@calcflow/shared';
import { ScribbleCanvas } from '@/canvas/ScribbleCanvas';
import { AnswerField } from '@/components/AnswerField';
import { ConfidenceRow } from '@/components/ConfidenceRow';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FeedbackCard } from '@/components/FeedbackCard';
import { HintPanel } from '@/components/HintPanel';
import { LatexKeyRow } from '@/components/LatexKeyRow';
import { ProblemCard } from '@/components/ProblemCard';
import { Tex } from '@/components/Tex';
import { cx } from '@/lib/cx';
import { useStore } from '@/state/store';
import { usePractice } from './usePractice';

const CONFIDENCE_LABEL = { sure: 'sure', think: 'think so', guess: 'guessed' } as const;

/** How much of the sheet stays on screen when it is down. */
const PEEK = 34;
const SPRING = { type: 'spring' as const, stiffness: 420, damping: 40 };

/**
 * Stacked: problem on top, canvas in the middle, answer sheet pinned to the
 * bottom. The sheet sits over the canvas rather than shrinking it, so there is
 * always room to write.
 */
export function PracticePhone() {
  const session = useStore((s) => s.session)!;
  const settings = useStore((s) => s.settings);
  const fullscreen = useStore((s) => s.canvasFullscreen);
  const setFullscreen = useStore((s) => s.setCanvasFullscreen);
  const showToast = useStore((s) => s.showToast);
  const patchSettings = useStore((s) => s.patchSettings);
  const store = useStore();
  const { canvas, tool, setTool, clearAsk, setClearAsk, askClear, confirmClear, undo, redo } =
    usePractice();

  const { problem, outcome } = session;
  const answered = outcome !== null;

  const canvasEl = (
    <ScribbleCanvas
      ref={canvas}
      className="h-full w-full"
      tool={tool}
      penOnly={settings.penOnly}
      surface={settings.canvasSurface}
      problemKey={`${problem.generatorId}:${problem.seed}`}
      onToast={showToast}
    />
  );

  if (fullscreen) {
    return (
      <div className="relative flex h-full flex-col bg-canvas">
        {/* The problem stays readable while writing, as one thin bar. */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-edge bg-page/95 px-4 py-3.5">
          <span className="min-w-0 scroll-x text-[17px]">
            <Tex>{problem.prompt}</Tex>
          </span>
          <button
            onClick={() => setFullscreen(false)}
            className="ml-auto flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] border border-border bg-raised px-2.5 text-accent"
          >
            <Minimize className="size-3.5" />
            <span className="font-mono text-[10px] tracking-[0.08em]">EXIT</span>
          </button>
        </div>

        <div className="relative min-h-0 flex-1">{canvasEl}</div>

        <div className="flex shrink-0 justify-center gap-2 px-4 pb-[22px] pt-3">
          <PhoneTool active={tool === 'pen2'} onClick={() => setTool('pen2')} label="Pen">
            <PenTool className="size-[18px]" />
          </PhoneTool>
          <PhoneTool active={tool === 'eraser'} onClick={() => setTool('eraser')} label="Eraser">
            <Eraser className="size-[18px]" />
          </PhoneTool>
          <PhoneTool active={tool === 'type'} onClick={() => setTool('type')} label="Type LaTeX">
            <Type className="size-[18px]" />
          </PhoneTool>
          <PhoneTool onClick={undo} label="Undo">
            <Undo2 className="size-[18px]" />
          </PhoneTool>
          <PhoneTool onClick={redo} label="Redo">
            <Redo2 className="size-[18px]" />
          </PhoneTool>
          <PhoneTool onClick={askClear} label="Clear">
            <Trash2 className="size-[18px]" />
          </PhoneTool>
        </div>

        <AnimatePresence>
          {clearAsk && (
            <ConfirmDialog
              title="Clear the canvas?"
              body="Every stroke on this problem goes. Undo can still bring them back until you move on."
              confirmLabel="Clear"
              onConfirm={confirmClear}
              onCancel={() => setClearAsk(false)}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-2.5 px-4 pt-3">
        <button
          onClick={store.endSession}
          aria-label="End this session"
          className="grid size-8 place-items-center rounded-[10px] border border-border bg-card text-muted"
        >
          <ArrowLeft className="size-4" />
        </button>
        <span className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-xs text-ink2">
          {session.done.length + (answered ? 0 : 1)} / {session.target ?? '∞'}
        </span>
        <span className="truncate rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] text-accent">
          Ch {problem.chapter} · {chapterTitle(problem.chapter)}
        </span>
        {!answered && (
          <button
            onClick={() => store.setHintsOpen(true)}
            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1"
          >
            <Lightbulb className="size-3.5 text-accent" />
            <span className="text-[11px] text-ink2">Hint</span>
          </button>
        )}
      </header>

      <div className="shrink-0 px-4 pt-3">
        <ProblemCard problem={problem} compact />
      </div>

      <div className="relative mx-4 mb-4 mt-3 min-h-0 flex-1 overflow-hidden rounded-xl border border-edge">
        {canvasEl}
        <div className="pointer-events-none absolute inset-x-3.5 top-3.5 flex justify-between">
          <div className="pointer-events-auto flex gap-1.5">
            <PhoneTool small active={tool === 'pen2'} onClick={() => setTool('pen2')} label="Pen">
              <PenTool className="size-[15px]" />
            </PhoneTool>
            <PhoneTool small active={tool === 'eraser'} onClick={() => setTool('eraser')} label="Eraser">
              <Eraser className="size-[15px]" />
            </PhoneTool>
            <PhoneTool small active={tool === 'type'} onClick={() => setTool('type')} label="Type LaTeX">
              <Type className="size-[15px]" />
            </PhoneTool>
            <PhoneTool small onClick={undo} label="Undo">
              <Undo2 className="size-[15px]" />
            </PhoneTool>
            <PhoneTool small onClick={redo} label="Redo">
              <Redo2 className="size-[15px]" />
            </PhoneTool>
          </div>
          <div className="pointer-events-auto flex gap-1.5">
            <PhoneTool
              small
              tint
              active={settings.penOnly}
              onClick={() => patchSettings({ penOnly: !settings.penOnly })}
              label="Pen-only mode"
            >
              <Hand className="size-[15px]" />
            </PhoneTool>
            <PhoneTool small onClick={() => setFullscreen(true)} label="Fullscreen canvas">
              <Maximize className="size-[15px] text-accent" />
            </PhoneTool>
          </div>
        </div>
      </div>

      {answered ? (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={SPRING}
          className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 rounded-t-3xl border-t border-border bg-card p-4 shadow-[0_-24px_50px_-20px_rgba(0,0,0,0.7)]"
        >
          <FeedbackCard
            problem={problem}
            correct={outcome.correct}
            errorClass={outcome.errorClass}
            answers={session.answers}
            confidence={CONFIDENCE_LABEL[session.confidence ?? 'think']}
            durationMs={session.done.at(-1)?.durationMs ?? 0}
            hintsUsed={session.rung}
            compact
          />
          <button
            onClick={store.next}
            className="grid h-13 min-h-[52px] place-items-center rounded-md bg-accent text-[17px] font-semibold text-on-accent"
          >
            {session.target !== null && session.done.length >= session.target
              ? 'See the summary'
              : 'Next problem'}
          </button>
        </motion.div>
      ) : (
        <AnswerSheet>
          <AnswerField
            specs={problem.answers}
            values={session.answers}
            activeField={session.activeField}
            onFocusField={store.setActiveField}
            onChange={store.setAnswer}
            onSubmit={session.confidence === null ? undefined : store.submit}
            state="editing"
            compact
          />
          <LatexKeyRow compact />
          <ConfidenceRow value={session.confidence} onChange={store.setConfidence} compact />
          <button
            onClick={store.submit}
            disabled={session.confidence === null}
            className={cx(
              'grid h-[52px] shrink-0 place-items-center rounded-md text-[17px] font-semibold',
              session.confidence === null
                ? 'cursor-not-allowed bg-raised text-faint'
                : 'bg-accent text-on-accent',
            )}
          >
            {session.confidence === null ? 'Pick a confidence' : 'Submit'}
          </button>
        </AnswerSheet>
      )}

      <AnimatePresence>{session.hintsOpen && !answered && <HintPanel variant="sheet" />}</AnimatePresence>

      <AnimatePresence>
        {clearAsk && (
          <ConfirmDialog
            title="Clear the canvas?"
            body="Every stroke on this problem goes. Undo can still bring them back until you move on."
            confirmLabel="Clear"
            onConfirm={confirmClear}
            onCancel={() => setClearAsk(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Two positions and nothing in between: down, where only the grab bar shows and
 * the canvas is his; or up, with the whole answer in reach. Dragging follows
 * the finger, and letting go picks the nearer of the two.
 */
function AnswerSheet({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const controls = useDragControls();
  const y = useMotionValue(0);
  const [down, setDown] = useState(0);
  const [open, setOpen] = useState(true);

  useLayoutEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => setDown(Math.max(0, el.offsetHeight - PEEK)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const controls = animate(y, open ? 0 : down, SPRING);
    return () => controls.stop();
  }, [open, down, y]);

  function settle(offset: number, velocity: number) {
    const at = y.get();
    const target = velocity > 500 ? false : velocity < -500 ? true : at < down / 2;
    void offset;
    setOpen(target);
    animate(y, target ? 0 : down, SPRING);
  }

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      drag="y"
      dragListener={false}
      dragControls={controls}
      dragConstraints={{ top: 0, bottom: down }}
      dragElastic={0.04}
      onDragEnd={(_, info) => settle(info.offset.y, info.velocity.y)}
      className="absolute inset-x-0 bottom-0 z-10 flex touch-none flex-col gap-3 rounded-t-3xl border-t border-border bg-card px-4 pb-4 shadow-[0_-24px_50px_-20px_rgba(0,0,0,0.7)]"
    >
      {/* The bar is 4px; the target around it is not. */}
      <button
        onPointerDown={(e) => controls.start(e)}
        onClick={() => setOpen((v) => !v)}
        className="mx-auto flex h-[34px] w-24 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
        aria-label={open ? 'Put the answer sheet down' : 'Bring the answer sheet up'}
      >
        <span className="h-1 w-11 rounded-full bg-rail" />
      </button>
      {children}
    </motion.div>
  );
}

interface PhoneToolProps {
  children: React.ReactNode;
  label: string;
  onClick(): void;
  active?: boolean;
  small?: boolean;
  tint?: boolean;
}

function PhoneTool({ children, label, onClick, active, small, tint }: PhoneToolProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 700, damping: 30 }}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cx(
        'grid place-items-center rounded-[10px] border',
        small ? 'size-[34px]' : 'size-[46px] rounded-md',
        active
          ? tint
            ? 'border-accent bg-accent/15 text-accent'
            : 'border-accent bg-accent text-on-accent'
          : 'border-border bg-raised text-muted',
      )}
    >
      {children}
    </motion.button>
  );
}
