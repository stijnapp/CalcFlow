import { ArrowLeft, Lightbulb } from 'lucide-react';
import { chapterTitle } from '@calcflow/shared';
import { ScribbleCanvas } from '@/canvas/ScribbleCanvas';
import { AnswerField } from '@/components/AnswerField';
import { ConfidenceRow } from '@/components/ConfidenceRow';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Eyebrow } from '@/components/Eyebrow';
import { FeedbackCard } from '@/components/FeedbackCard';
import { HintPanel } from '@/components/HintPanel';
import { MathKeyboard } from '@/components/MathKeyboard';
import { ProblemCard } from '@/components/ProblemCard';
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
  const { canvas, tool, setTool, clearAsk, setClearAsk, askClear, confirmClear, undo, redo } =
    usePractice();

  const store = useStore();
  const { problem, outcome } = session;
  const spec = problem.answers[session.activeField] ?? problem.answers[0]!;
  const answered = outcome !== null;
  const total = session.target ?? session.done.length + 1;

  return (
    <div className="relative flex h-full overflow-hidden">
      <div className="relative flex w-[62%] shrink-0 bg-canvas">
        <ToolRail
          tool={tool}
          onTool={setTool}
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
          penOnly={settings.penOnly}
          surface={settings.canvasSurface}
          problemKey={`${problem.generatorId}:${problem.seed}`}
          onToast={showToast}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col border-l border-edge bg-page">
        <header className="flex items-center gap-3 px-[26px] pt-[22px]">
          <button
            onClick={store.endSession}
            aria-label="End this session"
            className="grid size-9 place-items-center rounded-md border border-border bg-card text-muted hover:text-ink"
          >
            <ArrowLeft className="size-4" />
          </button>
          <span className="rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-sm text-ink2">
            {session.done.length + (answered ? 0 : 1)} / {session.target ?? '∞'}
          </span>
          <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-[13px] text-accent">
            Ch {problem.chapter} · {chapterTitle(problem.chapter)}
          </span>
          <div className="ml-auto flex gap-1">
            {Array.from({ length: Math.min(total, 10) }, (_, i) => {
              const item = session.done[i];
              return (
                <span
                  key={i}
                  className={cx(
                    'size-[7px] rounded-full',
                    item === undefined ? 'bg-border' : item.correct ? 'bg-correct' : 'bg-wrong',
                  )}
                />
              );
            })}
          </div>
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
              <button
                onClick={() => store.setHintsOpen(true)}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-[18px] py-3.5 text-left hover:border-accent"
              >
                <Lightbulb className="size-[17px] text-accent" />
                <span className="text-[15px] font-medium">Stuck? Show a hint</span>
                <span className="ml-auto font-mono text-xs text-faint">4 RUNGS</span>
              </button>

              <div className="flex flex-col gap-2.5">
                <Eyebrow>YOUR ANSWER</Eyebrow>
                <AnswerField
                  specs={problem.answers}
                  values={session.answers}
                  activeField={session.activeField}
                  onFocusField={store.setActiveField}
                  onBackspace={store.backspace}
                  state="editing"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Eyebrow>KEYBOARD</Eyebrow>
                <MathKeyboard
                  layout={spec.keyboard}
                  onInsert={store.typeKey}
                  onBackspace={store.backspace}
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

      {session.hintsOpen && !answered && <HintPanel variant="panel" />}

      {clearAsk && (
        <ConfirmDialog
          title="Clear the canvas?"
          body="Every stroke on this problem goes. Undo can still bring them back until you move on."
          confirmLabel="Clear"
          onConfirm={confirmClear}
          onCancel={() => setClearAsk(false)}
        />
      )}
    </div>
  );
}
