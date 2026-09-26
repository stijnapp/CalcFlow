import type { Problem } from '@calcflow/generators';
import { Fit } from './Fit';
import { Prose } from './Prose';
import { Tex } from './Tex';
import { Eyebrow } from './Eyebrow';
import { cx } from '@/lib/cx';

interface Props {
  problem: Problem;
  compact?: boolean;
}

export function ProblemCard({ problem, compact }: Props) {
  return (
    <div
      key={problem.seed}
      className={cx(
        'flex animate-rise flex-col gap-3 rounded-2xl border border-border bg-card',
        compact ? 'p-[18px]' : 'px-[22px] py-5',
      )}
    >
      <Eyebrow className={compact ? 'text-[10px]' : undefined}>
        {problem.instruction.toUpperCase()}
      </Eyebrow>

      {problem.promptText && (
        <Prose className="text-sm leading-relaxed text-ink2 text-pretty">{problem.promptText}</Prose>
      )}

      {/* A long question shrinks to fit rather than wrapping or running off the
          side: he wants to read the whole thing in one look. */}
      <Fit className={compact ? 'text-2xl' : 'text-[34px]'}>
        <Tex>{problem.prompt}</Tex>
      </Fit>

      {/* On the phone as well: "two solutions, the smaller first" and "in the
          form mx + c" are part of the question, not decoration. */}
      {problem.note && (
        <Prose className={cx('text-faint text-pretty', compact ? '-mt-1 text-xs' : 'text-[13px]')}>
          {problem.note}
        </Prose>
      )}
    </div>
  );
}
