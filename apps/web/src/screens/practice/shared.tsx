import { useMemo, type RefObject } from 'react';
import { AnimatePresence } from 'motion/react';
import type { PlaneView } from '@/canvas/plane';
import {
  ScribbleCanvas,
  type CanvasHandle,
  type CanvasInsets,
  type CanvasTool,
} from '@/canvas/ScribbleCanvas';
import type { CanvasState } from '@/canvas/strokes';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FeedbackCard } from '@/components/FeedbackCard';
import { SelfGradeRow } from '@/components/SelfGrade';
import { useStore, type Session } from '@/state/store';
import type { usePractice } from '../usePractice';

/** The chrome both practice layouts share, as `usePractice` hands it out. */
export type Practice = ReturnType<typeof usePractice>;

const CONFIDENCE_LABEL = { sure: 'sure', think: 'think so', guess: 'guessed' } as const;

/** Where the session stands on the problem in front of it. */
export function useProblem() {
  const session = useStore((s) => s.session)!;
  const { problem, outcome } = session;
  const filled = problem.answers.every((_, i) => (session.answers[i] ?? '').trim() !== '');
  return {
    session,
    problem,
    outcome,
    answered: outcome !== null,
    filled,
    ready: filled && session.confidence !== null,
    // A graph question is only finished once they have marked their own
    // drawing; until then nothing has been written to the log and Next would
    // throw it away.
    graded: !problem.plot || session.selfGrade !== null,
    arrows: problem.plot?.lattice ?? false,
  };
}

/** "3 / 10", counting the problem on screen until it has been answered. */
export function position(session: Session): string {
  return `${session.done.length + (session.outcome ? 0 : 1)} / ${session.target ?? '∞'}`;
}

/** What the button under a verdict says. */
export function nextLabel(session: Session, graded: boolean): string {
  if (!graded) return 'Mark your drawing to continue';
  const last = session.target !== null && session.done.length >= session.target;
  return last ? 'See the summary' : 'Next problem';
}

// Read and written straight off the store rather than through props: the
// canvas is memoised on purpose, and a page of strokes flowing back down
// through it on every save would undo that.
const getCanvas = () => useStore.getState().session?.canvas ?? null;
const saveCanvas = (canvas: CanvasState) => useStore.getState().setCanvasState(canvas);

/** The page they write on, wired to the session and the settings. */
export function PracticeCanvas({
  canvasRef,
  tool,
  className,
  insets,
}: {
  canvasRef: RefObject<CanvasHandle | null>;
  tool: CanvasTool;
  className: string;
  insets?: CanvasInsets;
}) {
  const penWidth = useStore((s) => s.settings.penWidth);
  const penOnly = useStore((s) => s.settings.penOnly);
  const snap = useStore((s) => s.settings.arrowSnap);
  const surface = useStore((s) => s.settings.canvasSurface);
  const showToast = useStore((s) => s.showToast);
  const { session, problem, answered } = useProblem();
  const reveal = answered ? session.reveal : 'none';
  // Held still between renders, so a keystroke in the answer box is not a
  // reason for the canvas to repaint its axes.
  const plane = useMemo<PlaneView | null>(
    () => (problem.plot ? { spec: problem.plot, reveal } : null),
    [problem.plot, reveal],
  );

  return (
    <ScribbleCanvas
      ref={canvasRef}
      className={className}
      tool={tool}
      penWidth={penWidth}
      penOnly={penOnly}
      snap={snap}
      surface={surface}
      plane={plane}
      problemKey={`${problem.generatorId}:${problem.seed}`}
      getInitial={getCanvas}
      onPersist={saveCanvas}
      onToast={showToast}
      insets={insets}
    />
  );
}

/** The verdict on the answer just given, and on a graph question their own mark. */
export function Verdict({ compact }: { compact?: boolean }) {
  const practiceSimilar = useStore((s) => s.practiceSimilar);
  const setSelfGrade = useStore((s) => s.setSelfGrade);
  const { session, problem, outcome, graded, arrows } = useProblem();
  if (!outcome) return null;

  return (
    <>
      <FeedbackCard
        problem={problem}
        correct={outcome.correct}
        errorClass={outcome.errorClass}
        answers={session.answers}
        confidence={CONFIDENCE_LABEL[session.confidence ?? 'think']}
        durationMs={outcome.durationMs}
        hintsUsed={session.rung}
        similar={graded ? { onPick: practiceSimilar, adds: session.target !== null } : undefined}
        compact={compact}
      />
      {problem.plot && (
        <SelfGradeRow
          value={session.selfGrade}
          onChange={setSelfGrade}
          noun={arrows ? 'arrow' : 'sketch'}
          compact={compact}
        />
      )}
    </>
  );
}

export function PracticeDialogs({ practice }: { practice: Practice }) {
  return (
    <>
      <AnimatePresence>
        {practice.clearAsk && (
          <ConfirmDialog
            title="Clear the canvas?"
            body="Every stroke on this problem goes. Undo can still bring them back until you move on."
            confirmLabel="Clear"
            danger
            onConfirm={practice.confirmClear}
            onCancel={() => practice.setClearAsk(false)}
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
}
