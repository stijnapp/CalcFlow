import { useRef, useState } from 'react';
import {
  ArrowLeft,
  Eraser,
  Hand,
  Lasso,
  Lightbulb,
  Maximize,
  Minimize,
  PenTool,
  Redo2,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ScribbleCanvas } from '@/canvas/ScribbleCanvas';
import { AnswerField } from '@/components/AnswerField';
import { ConfidenceRow } from '@/components/ConfidenceRow';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FeedbackCard } from '@/components/FeedbackCard';
import { Fit } from '@/components/Fit';
import { HintPanel } from '@/components/HintPanel';
import { HoverLabel } from '@/components/HoverLabel';
import { PenWidth } from '@/components/PenWidth';
import { ProblemCard } from '@/components/ProblemCard';
import { ProgressDots } from '@/components/ProgressDots';
import { Sheet, SHEET_PEEK } from '@/components/Sheet';
import { Tex } from '@/components/Tex';
import { cx } from '@/lib/cx';
import { useStore } from '@/state/store';
import { usePractice } from './usePractice';

const CONFIDENCE_LABEL = { sure: 'sure', think: 'think so', guess: 'guessed' } as const;
const SPRING = { type: 'spring' as const, stiffness: 420, damping: 40 };

/**
 * Stacked: problem on top, canvas in the middle, answer sheet pinned to the
 * bottom. The sheet sits over the canvas rather than shrinking it, but the
 * canvas still stops short of the bar it leaves behind, so the last line he
 * writes is never hidden under it.
 */
export function PracticePhone() {
  const session = useStore((s) => s.session)!;
  const settings = useStore((s) => s.settings);
  const fullscreen = useStore((s) => s.canvasFullscreen);
  const setFullscreen = useStore((s) => s.setCanvasFullscreen);
  const showToast = useStore((s) => s.showToast);
  const patchSettings = useStore((s) => s.patchSettings);
  const store = useStore();
  const practice = usePractice();
  const { canvas, tool, setTool, clearAsk, setClearAsk, askClear, confirmClear, undo, redo } = practice;

  /**
   * While the caret is in the answer, everything under it goes: the confidence
   * row and the submit button sat between the field and the on-screen keyboard,
   * and every pixel they held was a line of his working he could not see. They
   * come back the moment he taps away, which is also when he needs them.
   */
  const [typing, setTyping] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function startTyping() {
    clearTimeout(blurTimer.current);
    setTyping(true);
  }
  /** Moving between two answer boxes is a blur and a focus; it is not leaving. */
  function stopTyping() {
    clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => setTyping(false), 120);
  }

  const { problem, outcome } = session;
  const answered = outcome !== null;
  const filled = problem.answers.every((_, i) => (session.answers[i] ?? '').trim() !== '');
  const ready = filled && session.confidence !== null;

  const canvasEl = (
    <ScribbleCanvas
      ref={canvas}
      className="h-full w-full"
      tool={tool}
      penWidth={settings.penWidth}
      penOnly={settings.penOnly}
      surface={settings.canvasSurface}
      problemKey={`${problem.generatorId}:${problem.seed}`}
      getInitial={practice.getCanvas}
      onPersist={practice.saveCanvas}
      onToast={showToast}
    />
  );

  const penPicker = (
    <AnimatePresence>
      {practice.penMenu && tool === 'pen' && (
        <PenWidth
          key="pen-width"
          width={settings.penWidth}
          onChange={(penWidth) => patchSettings({ penWidth })}
          className="pointer-events-auto absolute left-0 top-full mt-2"
        />
      )}
    </AnimatePresence>
  );

  const dialogs = (
    <>
      <AnimatePresence>
        {clearAsk && (
          <ConfirmDialog
            title="Clear the canvas?"
            body="Every stroke on this problem goes. Undo can still bring them back until you move on."
            confirmLabel="Clear"
            danger
            onConfirm={confirmClear}
            onCancel={() => setClearAsk(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {practice.leaveAsk && (
          <ConfirmDialog
            title="Leave this session?"
            body="The problem you are on, its working and everything on the canvas are lost. Problems you have already submitted are kept."
            confirmLabel="Leave"
            danger
            onConfirm={practice.confirmLeave}
            onCancel={() => practice.setLeaveAsk(false)}
          />
        )}
      </AnimatePresence>
    </>
  );

  if (fullscreen) {
    return (
      <div className="relative flex h-full flex-col bg-canvas">
        {/* The problem stays readable while writing, as one thin bar. */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-edge bg-page/95 px-4 py-3.5">
          <Fit className="min-w-0 flex-1 text-[17px]">
            <Tex>{problem.prompt}</Tex>
          </Fit>
          {/* Pen-only is a mode he flips mid-thought, so it keeps a fixed place
              up here rather than sliding away with the scrolling tools. */}
          <PhoneTool
            small
            tint
            active={settings.penOnly}
            onClick={() => patchSettings({ penOnly: !settings.penOnly })}
            label="Pen-only mode"
          >
            <Hand className="size-[15px]" />
          </PhoneTool>
          <button
            onClick={() => setFullscreen(false)}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] border border-border bg-raised px-2.5 text-accent"
          >
            <Minimize className="size-3.5" />
            <span className="font-mono text-[10px] tracking-[0.08em]">EXIT</span>
          </button>
        </div>

        <div className="relative min-h-0 flex-1">{canvasEl}</div>

        {/* More tools than the phone is wide, so the row scrolls. The picker
            has to live outside the scroller: a box that clips horizontally
            clips vertically too, and it opens upwards out of the row. */}
        <div className="relative shrink-0 px-4 pb-[22px] pt-3">
          <div className="scroll-x flex gap-2">
            <PhoneTool active={tool === 'pen'} onClick={() => setTool('pen')} label="Pen">
              <PenTool className="size-[18px]" />
            </PhoneTool>
            <PhoneTool active={tool === 'eraser'} onClick={() => setTool('eraser')} label="Eraser">
              <Eraser className="size-[18px]" />
            </PhoneTool>
            <PhoneTool active={tool === 'type'} onClick={() => setTool('type')} label="Type LaTeX">
              <Type className="size-[18px]" />
            </PhoneTool>
            <PhoneTool
              active={tool === 'lasso'}
              onClick={() => setTool('lasso')}
              label="Select and move"
            >
              <Lasso className="size-[18px]" />
            </PhoneTool>
            <PhoneTool onClick={undo} label="Undo">
              <Undo2 className="size-[18px]" />
            </PhoneTool>
            <PhoneTool onClick={redo} label="Redo">
              <Redo2 className="size-[18px]" />
            </PhoneTool>
            <PhoneTool onClick={askClear} label="Clear the canvas">
              <Trash2 className="size-[18px]" />
            </PhoneTool>
          </div>
          <AnimatePresence>
            {practice.penMenu && tool === 'pen' && (
              <PenWidth
                key="pen-width"
                width={settings.penWidth}
                onChange={(penWidth) => patchSettings({ penWidth })}
                className="absolute bottom-full left-4 mb-1"
              />
            )}
          </AnimatePresence>
        </div>

        {dialogs}
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-2.5 px-4 pt-3">
        <button
          onClick={() => practice.setLeaveAsk(true)}
          aria-label="End this session"
          className="grid size-8 shrink-0 place-items-center rounded-[10px] border border-border bg-card text-muted"
        >
          <ArrowLeft className="size-4" />
        </button>
        <span className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-xs text-ink2">
          {session.done.length + (answered ? 0 : 1)} / {session.target ?? '∞'}
        </span>
        <ProgressDots session={session} />
        {/* Still there after submitting: the rungs are worth reading most when
            the answer turned out to be wrong. */}
        <button
          onClick={() => store.setHintsOpen(true)}
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1"
        >
          <Lightbulb className="size-3.5 text-accent" />
          <span className="text-[11px] text-ink2">Hint</span>
        </button>
      </header>

      <div className="shrink-0 px-4 pt-3">
        <ProblemCard problem={problem} compact />
      </div>

      {/* The canvas stops above the answer bar rather than behind it. */}
      <div
        className="relative mx-4 mt-3 min-h-0 flex-1 overflow-hidden rounded-xl border border-edge"
        style={{ marginBottom: answered ? 16 : SHEET_PEEK + 12 }}
      >
        {canvasEl}
        {/* The tools scroll; pen-only and fullscreen do not. Those two are how
            he gets his hand out of the way and how he gets more room, and
            hunting for either by swiping a row is exactly the wrong moment. */}
        <div className="pointer-events-none absolute inset-x-3.5 top-3.5 flex items-start gap-1.5">
          <div className="scroll-x pointer-events-auto flex min-w-0 flex-1 gap-1.5">
            <PhoneTool small active={tool === 'pen'} onClick={() => setTool('pen')} label="Pen">
              <PenTool className="size-[15px]" />
            </PhoneTool>
            <PhoneTool small active={tool === 'eraser'} onClick={() => setTool('eraser')} label="Eraser">
              <Eraser className="size-[15px]" />
            </PhoneTool>
            <PhoneTool small active={tool === 'type'} onClick={() => setTool('type')} label="Type LaTeX">
              <Type className="size-[15px]" />
            </PhoneTool>
            <PhoneTool
              small
              active={tool === 'lasso'}
              onClick={() => setTool('lasso')}
              label="Select and move"
            >
              <Lasso className="size-[15px]" />
            </PhoneTool>
            <PhoneTool small onClick={undo} label="Undo">
              <Undo2 className="size-[15px]" />
            </PhoneTool>
            <PhoneTool small onClick={redo} label="Redo">
              <Redo2 className="size-[15px]" />
            </PhoneTool>
            <PhoneTool small onClick={askClear} label="Clear the canvas">
              <Trash2 className="size-[15px]" />
            </PhoneTool>
          </div>
          <div className="pointer-events-auto flex shrink-0 gap-1.5">
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
          {penPicker}
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
        <Sheet className="gap-3 px-4 pb-4">
          {/* The on-screen keyboard covers the card at the top of the screen, so
              the sheet carries the question with it. */}
          <div className="shrink-0 rounded-md border border-edge bg-page px-3 py-2 text-[19px]">
            <Fit>
              <Tex>{problem.prompt}</Tex>
            </Fit>
          </div>
          <div className="scroll-y flex min-h-0 flex-1 flex-col gap-3">
            <AnswerField
              specs={problem.answers}
              values={session.answers}
              activeField={session.activeField}
              onFocusField={(i) => {
                store.setActiveField(i);
                startTyping();
              }}
              onBlurField={stopTyping}
              onChange={store.setAnswer}
              onSubmit={ready ? store.submit : undefined}
              state="editing"
              compact
            />
          </div>
          <AnimatePresence initial={false}>
            {!typing && (
              <motion.div
                key="commit"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={SPRING}
                className="flex shrink-0 flex-col gap-3 overflow-hidden"
              >
                <ConfidenceRow value={session.confidence} onChange={store.setConfidence} compact />
                <button
                  onClick={store.submit}
                  disabled={!ready}
                  className={cx(
                    'grid h-[52px] shrink-0 place-items-center rounded-md text-[17px] font-semibold',
                    ready ? 'bg-accent text-on-accent' : 'cursor-not-allowed bg-raised text-faint',
                  )}
                >
                  {!filled
                    ? 'Type an answer'
                    : session.confidence === null
                      ? 'Pick a confidence'
                      : 'Submit'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </Sheet>
      )}

      <AnimatePresence>{session.hintsOpen && <HintPanel variant="sheet" />}</AnimatePresence>

      {dialogs}
    </div>
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

/*
 * The S-Pen hovers on the phone too, so the names are here as well. The small
 * row runs along the top of the canvas and the label goes beside it; the tall
 * row sits at the bottom of the screen, where beside would run off the edge.
 */
function PhoneTool({ children, label, onClick, active, small, tint }: PhoneToolProps) {
  return (
    <HoverLabel label={label} side={small ? 'right' : 'top'}>
      <motion.button
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 700, damping: 30 }}
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className={cx(
          'grid shrink-0 place-items-center rounded-[10px] border',
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
    </HoverLabel>
  );
}
