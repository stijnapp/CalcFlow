import type { AnswerSpec } from '@calcflow/generators';
import { motion } from 'motion/react';
import { Tex } from './Tex';
import { cx } from '@/lib/cx';

interface Props {
  specs: AnswerSpec[];
  values: string[];
  activeField: number;
  onFocusField(index: number): void;
  onChange(value: string): void;
  onSubmit?(): void;
  state: 'editing' | 'correct' | 'wrong' | 'near';
  compact?: boolean;
  readOnly?: boolean;
}

const BORDER = {
  editing: 'border-accent',
  correct: 'border-correct',
  wrong: 'border-wrong',
  near: 'border-near',
} as const;

/**
 * He types LaTeX; the box above shows what it renders to. Two lines of the
 * same thought, so a stray brace is visible the moment it is typed.
 */
export function AnswerField({
  specs,
  values,
  activeField,
  onFocusField,
  onChange,
  onSubmit,
  state,
  compact,
  readOnly,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      {specs.map((spec, i) => {
        const active = i === activeField;
        const value = values[i] ?? '';
        return (
          <div key={i} className="flex items-start gap-3">
            {specs.length > 1 && (
              <span className={cx('w-[72px] shrink-0 text-right text-[13px] text-faint', compact ? 'pt-2' : 'pt-3')}>
                {spec.label}
              </span>
            )}
            <div
              className={cx(
                'flex min-w-0 flex-1 flex-col rounded-lg border bg-well',
                compact ? 'gap-1 px-3.5 py-2' : 'gap-1.5 px-5 py-2.5',
                active ? BORDER[state] : 'border-border',
              )}
            >
              <div
                className={cx(
                  'flex min-w-0 items-center scroll-x',
                  compact ? 'min-h-[32px] text-xl' : 'min-h-[42px] text-[26px]',
                )}
              >
                {value ? <Tex>{value}</Tex> : <span className="text-ghost">…</span>}
              </div>
              <motion.input
                data-latex-input={active ? 'active' : 'idle'}
                value={value}
                readOnly={readOnly}
                onFocus={() => onFocusField(i)}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && onSubmit) {
                    e.preventDefault();
                    onSubmit();
                  }
                }}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                enterKeyHint="done"
                placeholder="type LaTeX"
                aria-label={specs.length > 1 ? spec.label : 'Your answer, as LaTeX'}
                animate={{ opacity: active ? 1 : 0.55 }}
                className={cx(
                  'w-full border-t border-edge bg-transparent font-mono text-muted outline-none placeholder:text-ghost',
                  compact ? 'pt-1.5 text-[12px]' : 'pt-2 text-[13px]',
                )}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
