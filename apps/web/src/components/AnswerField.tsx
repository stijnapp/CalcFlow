import type { AnswerSpec } from '@calcflow/generators';
import { cx } from '@/lib/cx';
import { LatexField, type FieldTone } from './LatexField';

interface Props {
  specs: AnswerSpec[];
  values: string[];
  activeField: number;
  onFocusField(index: number): void;
  onBlurField?(): void;
  onChange(value: string): void;
  onSubmit?(): void;
  state: FieldTone;
  compact?: boolean;
  readOnly?: boolean;
}

/**
 * One `LatexField` per answer the problem asks for. Each carries its own
 * notation row, so "smaller x" and "larger x" never argue over which one a key
 * was meant for.
 */
export function AnswerField({
  specs,
  values,
  activeField,
  onFocusField,
  onBlurField,
  onChange,
  onSubmit,
  state,
  compact,
  readOnly,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      {specs.map((spec, i) => (
        /* The label sits over the box rather than beside it. A column this
           narrow has no 72 pixels to spare on the word "smaller", and the
           answer it names is the thing that needs the width. */
        <div key={i} className="flex min-w-0 flex-col gap-1">
          {specs.length > 1 && (
            <span className={cx('text-[13px] text-faint', compact ? 'px-0.5' : 'px-1')}>
              {spec.label}
            </span>
          )}
          <div className="min-w-0">
            <LatexField
              value={values[i] ?? ''}
              onChange={onChange}
              onSubmit={onSubmit}
              onFocus={() => onFocusField(i)}
              onBlur={onBlurField}
              active={i === activeField}
              tone={state}
              compact={compact}
              readOnly={readOnly}
              ariaLabel={specs.length > 1 ? (spec.label ?? `Answer ${i + 1}`) : 'Your answer, as LaTeX'}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
