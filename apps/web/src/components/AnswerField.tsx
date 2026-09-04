import { Delete } from 'lucide-react';
import type { AnswerSpec } from '@calcflow/generators';
import { Tex } from './Tex';
import { cx } from '@/lib/cx';

interface Props {
  specs: AnswerSpec[];
  values: string[];
  activeField: number;
  onFocusField(index: number): void;
  onBackspace(): void;
  state: 'editing' | 'correct' | 'wrong' | 'near';
  compact?: boolean;
}

const BORDER = {
  editing: 'border-accent',
  correct: 'border-correct',
  wrong: 'border-wrong',
  near: 'border-near',
} as const;

export function AnswerField({
  specs,
  values,
  activeField,
  onFocusField,
  onBackspace,
  state,
  compact,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      {specs.map((spec, i) => {
        const active = i === activeField;
        return (
          <div key={i} className="flex items-center gap-3">
            {specs.length > 1 && (
              <span className="w-[72px] shrink-0 text-right text-[13px] text-faint">{spec.label}</span>
            )}
            <button
              onClick={() => onFocusField(i)}
              className={cx(
                'flex min-w-0 flex-1 items-center rounded-lg border bg-well px-5 text-left',
                compact ? 'min-h-[56px]' : 'min-h-[74px]',
                active ? BORDER[state] : 'border-border',
              )}
            >
              <span className={cx('min-w-0 flex-1 scroll-x', compact ? 'text-xl' : 'text-[26px]')}>
                {values[i] ? <Tex>{values[i]!}</Tex> : <span className="text-ghost">…</span>}
              </span>
              {active && state === 'editing' && <span className="ml-1 h-[30px] w-0.5 shrink-0 bg-accent" />}
            </button>
            {active && (
              <button
                onClick={onBackspace}
                aria-label="Delete the last symbol"
                className="grid size-9 shrink-0 place-items-center rounded-md text-muted hover:text-ink"
              >
                <Delete className="size-[19px]" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
