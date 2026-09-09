import { useEffect, useRef } from 'react';
import { ArrowLeft, Lightbulb } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { ScribbleCanvas } from '@/canvas/ScribbleCanvas';
import { AnswerField } from '@/components/AnswerField';
import { ConfidenceRow } from '@/components/ConfidenceRow';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Eyebrow } from '@/components/Eyebrow';
import { FeedbackCard } from '@/components/FeedbackCard';
import { HintPanel } from '@/components/HintPanel';
import { ProblemCard } from '@/components/ProblemCard';
import { ProgressDots } from '@/components/ProgressDots';
import { RulesUsed } from '@/components/RulesUsed';
import { ToolRail } from '@/components/ToolRail';
import { cx } from '@/lib/cx';
import { useKeyboardInset } from '@/lib/useKeyboardInset';
import { useStore } from '@/state/store';
import { usePractice } from './usePractice';

const CONFIDENCE_LABEL = { sure: 'sure', think: 'think so', guess: 'guessed' } as const;

/**
 * Canvas on the left, controls on the right — so his writing hand rests on the
 * tablet rather than hanging off the edge. The question stays put; everything
 * under it scrolls together, because a second answer box or a revealed solution
 * is more than the column can hold.
 */
export function PracticeTablet() {
  const session = useStore((s) => s.session)!;
  const settings = useStore((s) => s.settings);
  const showToast = useStore((s) => s.showToast);
  const patchSettings = useStore((s) => s.patchSettings);
  const practice = usePractice();
  const { canvas, tool, setTool, clearAsk, setClearAsk, askClear, confirmClear, undo, redo } = practice;

  const store = useStore();
  const { problem, outcome } = session;
  const answered = outcome !== null;
  const scroller = useRef<HTMLDivElement>(null);
  /*
   * The keyboard covers the bottom of this column, submit button and all, and
   * the page itself cannot move: the layout is pinned to the screen so that the
   * canvas keeps its height. Handing the covered strip to the scroller as
   * padding is what lets him push the column up and see what is under it.
   */
  const keyboard = useKeyboardInset();

  // Submitting from the bottom of a long column would otherwise leave him
  // looking at the last line of the verdict instead of at the verdict.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [answered, problem.seed]);

  const filled = problem.answers.every((_, i) => (session.answers[i] ?? '').trim() !== '');
  const ready = filled && session.confidence !== null;

  return (
    <div className="relative flex h-full overflow-clip">
      <div className="relative flex w-[62%] shrink-0 bg-canvas">
        <ToolRail
          tool={tool}
          onTool={setTool}
          penWidth={settings.penWidth}
          onPenWidth={(penWidth) => patchSettings({ penWidth })}
          penMenu={practice.penMenu}
          onClosePenMenu={() => practice.setPenMenu(false)}
          penOnly={settings.penOnly}
          onPenOnly={(penOnly) => patchSettings({ penOnly })}
          onUndo={undo}
          onRedo={redo}
          onClear={askClear}
        />
        <ScribbleCanvas
          ref={canvas}
          className="flex-1"
          tool={tool}
          penWidth={settings.penWidth}
          penOnly={settings.penOnly}
          surface={settings.canvasSurface}
          problemKey={`${problem.generatorId}:${problem.seed}`}
          getInitial={practice.getCanvas}
          onPersist={practice.saveCanvas}
          onToast={showToast}
        />
      </div>

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
            {session.done.length + (answered ? 0 : 1)} / {session.target ?? '∞'}
          </span>
          <ProgressDots session={session} />
          {/* Still there after submitting: the rungs are worth reading most when
              the answer turned out to be wrong. */}
          <button
            onClick={() => store.setHintsOpen(true)}
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
            {answered ? (
              <>
                <FeedbackCard
                  problem={problem}
                  correct={outcome.correct}
                  errorClass={outcome.errorClass}
                  answers={session.answers}
                  confidence={CONFIDENCE_LABEL[session.confidence ?? 'think']}
                  durationMs={session.done.at(-1)?.durationMs ?? 0}
                  hintsUsed={session.rung}
                />
                <RulesUsed problem={problem} />
                <button
                  onClick={store.next}
                  autoFocus
                  className="mt-auto grid h-14 shrink-0 place-items-center rounded-lg bg-accent text-[17px] font-semibold text-on-accent hover:bg-accent-hi"
                >
                  {session.target !== null && session.done.length >= session.target
                    ? 'See the summary'
                    : 'Next problem'}
                </button>
              </>
            ) : (
              <>
                <div className="flex shrink-0 flex-col gap-2.5">
                  <Eyebrow>YOUR ANSWER</Eyebrow>
                  <AnswerField
                    specs={problem.answers}
                    values={session.answers}
                    activeField={session.activeField}
                    onFocusField={store.setActiveField}
                    onChange={store.setAnswer}
                    onSubmit={ready ? store.submit : undefined}
                    state="editing"
                  />
                </div>

                <div className="mt-auto flex shrink-0 flex-col gap-3 pt-2">
                  <Eyebrow>HOW SURE ARE YOU?</Eyebrow>
                  <ConfidenceRow value={session.confidence} onChange={store.setConfidence} />
                  <button
                    onClick={store.submit}
                    disabled={!ready}
                    className={cx(
                      'grid h-[60px] place-items-center rounded-lg text-[18px] font-semibold transition-colors',
                      ready
                        ? 'bg-accent text-on-accent hover:bg-accent-hi'
                        : 'cursor-not-allowed bg-raised text-faint',
                    )}
                  >
                    {!filled
                      ? 'Type an answer to submit'
                      : session.confidence === null
                        ? 'Pick a confidence to submit'
                        : 'Submit'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>{session.hintsOpen && <HintPanel variant="panel" />}</AnimatePresence>

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
    </div>
  );
}
