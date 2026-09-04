import { Delete } from 'lucide-react';
import type { KeyboardLayoutId } from '@calcflow/generators';
import { cx } from '@/lib/cx';

interface Key {
  label: string;
  /** LaTeX inserted at the caret. Absent on the backspace key. */
  insert?: string;
  /** Digits and operators sit on a slightly darker key. */
  numeric?: boolean;
}

const N = (label: string, insert = label): Key => ({ label, insert, numeric: true });
const K = (label: string, insert: string): Key => ({ label, insert });
const BACKSPACE: Key = { label: '⌫', numeric: true };

const DIGITS = {
  row1: [N('7'), N('8'), N('9')],
  row2: [N('4'), N('5'), N('6')],
  row3: [N('1'), N('2'), N('3')],
  row4: [N('0'), N('.'), N('−', '-')],
};

/**
 * One layout per answer kind — that is the whole of the "adaptive keyboard".
 * A numeric answer never has to hunt past an integral sign to reach a 7.
 */
const LAYOUTS: Record<KeyboardLayoutId, Key[]> = {
  numeric: [
    K('a/b', '\\frac{}{}'), K('√', '\\sqrt{}'), K('xⁿ', '^{}'),
    ...DIGITS.row1,
    K('(', '('), K(')', ')'), K('π', '\\pi'),
    ...DIGITS.row2,
    K('²', '^{2}'), K('³', '^{3}'), K('·', '\\cdot'),
    ...DIGITS.row3,
    K('+', '+'), K('÷', '\\div'), BACKSPACE,
    ...DIGITS.row4,
  ],
  algebra: [
    K('x', 'x'), K('a', 'a'), K('a/b', '\\frac{}{}'),
    ...DIGITS.row1,
    K('√', '\\sqrt{}'), K('xⁿ', '^{}'), K('x²', '^{2}'),
    ...DIGITS.row2,
    K('(', '('), K(')', ')'), K('π', '\\pi'),
    ...DIGITS.row3,
    K('|x|', '\\left|\\right|'), K('·', '\\cdot'), BACKSPACE,
    ...DIGITS.row4,
    K('=', '='), K('<', '<'), K('>', '>'),
    N('+'), N('÷', '\\div'), K('y', 'y'),
  ],
  calculus: [
    K('x', 'x'), K('a', 'a'), K('a/b', '\\frac{}{}'),
    ...DIGITS.row1,
    K('√', '\\sqrt{}'), K('xⁿ', '^{}'), K('x²', '^{2}'),
    ...DIGITS.row2,
    K('(', '('), K(')', ')'), K('π', '\\pi'),
    ...DIGITS.row3,
    K('ln', '\\ln'), K('eˣ', 'e^{}'), BACKSPACE,
    ...DIGITS.row4,
    K('sin', '\\sin'), K('cos', '\\cos'), K('tan', '\\tan'),
    N('+'), N('·', '\\cdot'), K('+C', '+C'),
  ],
  trig: [
    K('sin', '\\sin'), K('cos', '\\cos'), K('tan', '\\tan'),
    ...DIGITS.row1,
    K('π', '\\pi'), K('√', '\\sqrt{}'), K('a/b', '\\frac{}{}'),
    ...DIGITS.row2,
    K('x', 'x'), K('(', '('), K(')', ')'),
    ...DIGITS.row3,
    K('x²', '^{2}'), K('·', '\\cdot'), BACKSPACE,
    ...DIGITS.row4,
  ],
  logs: [
    K('ln', '\\ln'), K('log', '\\log_{}'), K('eˣ', 'e^{}'),
    ...DIGITS.row1,
    K('x', 'x'), K('a/b', '\\frac{}{}'), K('xⁿ', '^{}'),
    ...DIGITS.row2,
    K('(', '('), K(')', ')'), K('√', '\\sqrt{}'),
    ...DIGITS.row3,
    K('·', '\\cdot'), N('+'), BACKSPACE,
    ...DIGITS.row4,
  ],
};

interface Props {
  layout: KeyboardLayoutId;
  onInsert(latex: string): void;
  onBackspace(): void;
  /** Phone keys are shorter to leave room for the canvas. */
  compact?: boolean;
}

export function MathKeyboard({ layout, onInsert, onBackspace, compact }: Props) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {LAYOUTS[layout].map((key, i) => (
        <button
          key={`${key.label}-${i}`}
          onClick={() => (key.insert ? onInsert(key.insert) : onBackspace())}
          className={cx(
            'grid place-items-center rounded-[10px] border transition-colors',
            compact ? 'h-[38px] text-sm' : 'h-[37px] text-[15px]',
            key.numeric ? 'border-edge bg-sunken' : 'border-border bg-raised',
            'text-ink hover:border-accent active:bg-overlay',
          )}
        >
          {key.label === '⌫' ? <Delete className="size-4 text-muted" /> : key.label}
        </button>
      ))}
    </div>
  );
}
