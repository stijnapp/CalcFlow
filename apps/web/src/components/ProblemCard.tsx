import type { Problem } from '@calcflow/generators';
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
        <p className="text-sm leading-relaxed text-ink2 text-pretty">{problem.promptText}</p>
      )}

      <div className={compact ? 'text-2xl' : 'text-[34px]'}>
        <Tex>{problem.prompt}</Tex>
      </div>

      {problem.note && !compact && <p className="text-[13px] text-faint text-pretty">{problem.note}</p>}
    </div>
  );
}
