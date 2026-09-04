import { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import type { ErrorClass } from '@calcflow/shared';
import type { Problem } from '@calcflow/generators';
import { Tex } from './Tex';
import { Eyebrow } from './Eyebrow';
import { cx } from '@/lib/cx';
import { duration } from '@/lib/format';

interface Props {
  problem: Problem;
  correct: boolean;
  errorClass: ErrorClass | null;
  answers: string[];
  confidence: string;
  durationMs: number;
  hintsUsed: number;
  compact?: boolean;
}

/**
 * The near misses get their own wording rather than a flat red: the maths was
 * right and only the form was not, which is a different thing to be told.
 */
const NEAR_MISS: Record<string, { title: string; body: string; glyph: string }> = {
  'plus-c': {
    title: 'Forgot the +C',
    body: 'The antiderivative itself is right. An indefinite integral needs the constant of integration.',
    glyph: '+',
  },
  'not-exact': {
    title: 'Not in exact form',
    body: 'The value is right, but the book wants it exact rather than as a decimal.',
    glyph: '≈',
  },
  'not-simplified': {
    title: 'Not fully simplified',
    body: 'Equivalent to the answer, but there is still something to collapse.',
    glyph: '⁄',
  },
};

export function FeedbackCard({
  problem,
  correct,
  errorClass,
  answers,
  confidence,
  durationMs,
  hintsUsed,
  compact,
}: Props) {
  const [showSteps, setShowSteps] = useState(false);
  const near = errorClass ? NEAR_MISS[errorClass] : undefined;
  const reference = problem.answers.map((a) => a.tex);
  const meta = `${confidence} · ${duration(durationMs)} · ${hintsUsed === 0 ? 'no hints' : `${hintsUsed} hint`}`;

  if (correct) {
    return (
      <div className="animate-correct flex flex-col gap-3 rounded-xl border border-correct bg-card p-[22px]">
        <div className="flex items-center gap-2.5">
          <span className="grid size-[26px] place-items-center rounded-full bg-correct text-[#06241a]">
            <Check className="size-4" />
          </span>
          <h2 className="text-[19px] font-semibold text-correct">Correct</h2>
          <span className="ml-auto text-xs text-faint">{meta}</span>
        </div>
        <div className={compact ? 'text-xl' : 'text-2xl'}>
          <Tex>{reference[0]!}</Tex>
        </div>
      </div>
    );
  }

  if (near) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-near bg-card p-[22px]">
        <div className="flex items-center gap-2.5">
          <span className="grid size-[26px] place-items-center rounded-full bg-near text-[15px] text-[#241905]">
            {near.glyph}
          </span>
          <h2 className="text-[19px] font-semibold text-near-ink">{near.title}</h2>
        </div>
        <p className="text-sm leading-relaxed text-ink2 text-pretty">{near.body}</p>
        <div className="flex flex-wrap items-center gap-3.5 text-[22px]">
          <span className="text-muted">
            <Tex>{answers[0] || '\\text{—}'}</Tex>
          </span>
          <span className="text-[15px] text-faint">→</span>
          <Tex>{reference[0]!}</Tex>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-wrong flex flex-col gap-3.5 rounded-xl border border-wrong bg-card p-[22px]">
      <div className="flex items-center gap-2.5">
        <span className="grid size-[26px] place-items-center rounded-full bg-wrong text-[#2b0708]">
          <X className="size-4" />
        </span>
        <h2 className="text-[19px] font-semibold text-wrong">Not right</h2>
        {confidence === 'sure' && (
          <span className="ml-auto text-xs text-wrong-ink">confident · logged as a misconception</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Eyebrow>YOU WROTE</Eyebrow>
        <div className="scroll-x text-xl text-muted">
          <Tex>{answers.filter(Boolean).join(',\\ ') || '\\text{(nothing)}'}</Tex>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Eyebrow>ANSWER</Eyebrow>
        <div className="scroll-x text-[22px]">
          <Tex>{reference.join(',\\ ')}</Tex>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 border-t border-border pt-3">
        <button
          onClick={() => setShowSteps((v) => !v)}
          aria-expanded={showSteps}
          className="flex items-center gap-1.5 self-start text-[13px] text-accent"
        >
          See the steps
          <ChevronDown className={cx('size-3.5 transition-transform', showSteps && 'rotate-180')} />
        </button>

        {showSteps && (
          <div className="flex flex-col gap-2">
            {problem.solution.map((s, i) => (
              <div
                key={i}
                style={{ animationDelay: `${i * 40}ms` }}
                className="flex animate-rise items-center gap-3 rounded-[10px] border border-edge bg-page px-3.5 py-2.5"
              >
                <span className="w-[108px] shrink-0 text-xs text-faint">{s.ruleLabel}</span>
                <span className="min-w-0 scroll-x text-[17px]">
                  <Tex>{s.expr}</Tex>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
