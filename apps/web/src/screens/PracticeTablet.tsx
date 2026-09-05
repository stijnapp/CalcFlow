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
import { useStore } from '@/state/store';
import { usePractice } from './usePractice';

const CONFIDENCE_LABEL = { sure: 'sure', think: 'think so', guess: 'guessed' } as const;

/**
 * Canvas on the left, controls on the right — so his writing hand rests on the
 * tablet rather than hanging off the edge. Nothing on this page scrolls; only
 * the canvas pans and the hint panel scrolls internally.
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

  return (
    <div className="relative flex h-full overflow-hidden">
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
          {!answered && (
            <button
              onClick={() => store.setHintsOpen(true)}
              className="ml-auto flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 hover:border-accent"
            >
              <Lightbulb className="size-4 text-accent" />
              <span className="text-[13px] text-ink2">Hint</span>
            </button>
          )}
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3.5 px-[26px] pb-[22px] pt-5">
          <ProblemCard problem={problem} />

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
                className="mt-auto grid h-14 place-items-center rounded-lg bg-accent text-[17px] font-semibold text-on-accent hover:bg-accent-hi"
              >
                {session.target !== null && session.done.length >= session.target
                  ? 'See the summary'
                  : 'Next problem'}
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2.5">
                <Eyebrow>YOUR ANSWER</Eyebrow>
                <AnswerField
                  specs={problem.answers}
                  values={session.answers}
                  activeField={session.activeField}
                  onFocusField={store.setActiveField}
                  onChange={store.setAnswer}
                  onSubmit={session.confidence === null ? undefined : store.submit}
                  state="editing"
                />
              </div>

              <div className="mt-auto flex flex-col gap-3">
                <Eyebrow>HOW SURE ARE YOU?</Eyebrow>
                <ConfidenceRow value={session.confidence} onChange={store.setConfidence} />
                <button
                  onClick={store.submit}
                  disabled={session.confidence === null}
                  className={cx(
                    'grid h-[60px] place-items-center rounded-lg text-[18px] font-semibold transition-colors',
                    session.confidence === null
                      ? 'cursor-not-allowed bg-raised text-faint'
                      : 'bg-accent text-on-accent hover:bg-accent-hi',
                  )}
                >
                  {session.confidence === null ? 'Pick a confidence to submit' : 'Submit'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>{session.hintsOpen && !answered && <HintPanel variant="panel" />}</AnimatePresence>

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
