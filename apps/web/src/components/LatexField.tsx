import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { TapDetector } from '@/canvas/gestures';
import { cx } from '@/lib/cx';
import { caretOffset, resolveKeys, type LatexKey } from '@/lib/latexKeys';
import { useEditHistory } from '@/lib/useEditHistory';
import { useStore } from '@/state/store';
import { NotationRow } from './NotationRow';
import { Tex } from './Tex';

export type FieldTone = 'editing' | 'correct' | 'wrong' | 'near';

interface Props {
  value: string;
  onChange(next: string): void;
  onSubmit?(): void;
  onFocus?(): void;
  onBlur?(): void;
  /** Dims the field when a sibling owns the caret. */
  active?: boolean;
  tone?: FieldTone;
  placeholder?: string;
  ariaLabel?: string;
  compact?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  /** Sits at the end of the raw line — a delete button, a check button. */
  trailing?: ReactNode;
  /** Lets an owner outside the field put the caret in it. */
  fieldRef?: RefObject<HTMLInputElement | null>;
}

/**
 * A verdict is worth a coloured edge whether or not the caret is in the box.
 * `editing` is not a verdict, so it is left to the focus ring below.
 */
const BORDER: Record<FieldTone, string> = {
  editing: '',
  correct: 'border-correct',
  wrong: 'border-wrong',
  near: 'border-near',
};

/**
 * One box, three storeys: the notation he cannot type, what it renders to, and
 * the raw LaTeX underneath. Keeping the keys inside the field is what makes two
 * answer boxes work — each one types into itself — and puts them above the
 * on-screen keyboard rather than behind it.
 */
export function LatexField({
  value,
  onChange,
  onSubmit,
  onFocus,
  onBlur,
  active = true,
  tone = 'editing',
  placeholder = 'type LaTeX',
  ariaLabel = 'Your answer, as LaTeX',
  compact,
  readOnly,
  autoFocus,
  trailing,
  fieldRef,
}: Props) {
  const ownRef = useRef<HTMLInputElement>(null);
  const inputRef = fieldRef ?? ownRef;
  // Which box the keyboard is typing into is worth saying out loud: on a screen
  // with a notation row, an answer field and a hint field all in accent, an
  // edge that is always lit says nothing at all.
  const [focused, setFocused] = useState(false);
  const ids = useStore((s) => s.settings.keys);
  const custom = useStore((s) => s.settings.customKeys);
  const keys = resolveKeys(ids, custom);
  const showToast = useStore((s) => s.showToast);

  /**
   * Two fingers step back, three step forward — the same tap he already uses on
   * the canvas, on the one part of the field big enough to land both on.
   */
  const history = useEditHistory(value, onChange);
  const taps = useRef(new TapDetector());
  /** A gesture that fired must not also count as a tap into the field. */
  const gestured = useRef(false);

  function tapDown(e: ReactPointerEvent) {
    if (e.pointerType !== 'touch') return;
    if (taps.current.activeCount === 0) gestured.current = false;
    taps.current.down(e.pointerId, e.clientX, e.clientY);
  }

  function tapUp(e: ReactPointerEvent) {
    if (e.pointerType !== 'touch') return;
    const fingers = taps.current.up(e.pointerId);
    if (fingers < 2) return;
    gestured.current = true;
    const moved = fingers >= 3 ? history.redo() : history.undo();
    if (fingers >= 3) showToast(moved ? 'Redo' : 'Nothing to redo');
    else showToast(moved ? 'Undo' : 'Nothing to undo');
  }

  /** Puts the caret back where the key left it, after React has repainted. */
  function place(caret: number) {
    const el = inputRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.focus({ preventScroll: true });
      el.setSelectionRange(caret, caret);
    });
  }

  function insert(key: LatexKey) {
    const el = inputRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    onChange(value.slice(0, start) + key.insert + value.slice(end));
    place(start + caretOffset(key));
  }

  function step(by: -1 | 1) {
    const el = inputRef.current;
    if (!el) return;
    const at = el.selectionStart ?? value.length;
    place(Math.min(value.length, Math.max(0, at + by)));
  }

  return (
    <div
      className={cx(
        'flex min-w-0 flex-col rounded-lg border bg-well transition-colors',
        BORDER[tone] || (focused ? 'border-accent' : 'border-border'),
      )}
    >
      {!readOnly && (
        <div className={cx('flex items-stretch gap-1.5 border-b border-edge', compact ? 'p-1.5' : 'p-2')}>
          <NotationRow keys={keys} compact={compact} onInsert={insert} />
          {(['left', 'right'] as const).map((dir) => (
            <motion.button
              key={dir}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 700, damping: 30 }}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => step(dir === 'left' ? -1 : 1)}
              aria-label={dir === 'left' ? 'Move the caret left' : 'Move the caret right'}
              className={cx(
                'grid shrink-0 place-items-center rounded-[9px] border border-edge bg-sunken text-muted hover:border-accent hover:text-ink',
                compact ? 'size-9' : 'size-10',
              )}
            >
              {dir === 'left' ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
            </motion.button>
          ))}
        </div>
      )}

      {/* The rendered line is the biggest target in the box, so it is also the
          one that opens the keyboard. */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Edit this line"
        onPointerDown={tapDown}
        onPointerMove={(e) => {
          if (e.pointerType === 'touch') taps.current.move(e.pointerId, e.clientX, e.clientY);
        }}
        onPointerUp={tapUp}
        onPointerCancel={(e) => taps.current.cancel(e.pointerId)}
        onClick={() => {
          if (gestured.current) return;
          inputRef.current?.focus();
        }}
        className={cx(
          'flex min-w-0 items-center scroll-x text-left',
          compact ? 'min-h-[34px] px-3.5 pt-2 text-xl' : 'min-h-[44px] px-5 pt-2.5 text-[26px]',
        )}
      >
        <span className="w-max">
          {value ? <Tex>{value}</Tex> : <span className="text-ghost">…</span>}
        </span>
      </button>

      <div className={cx('flex items-center gap-2', compact ? 'px-3.5 pb-2' : 'px-5 pb-2.5')}>
        <motion.input
          ref={inputRef}
          value={value}
          readOnly={readOnly}
          autoFocus={autoFocus}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSubmit) {
              e.preventDefault();
              onSubmit();
            }
          }}
          type="text"
          inputMode="text"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          /* Everything the platform reads as "this is not a credential", so the
             keyboard has no reason to offer a password or an address above it. */
          autoComplete="off"
          name="latex-line"
          aria-autocomplete="none"
          data-form-type="other"
          data-lpignore="true"
          data-1p-ignore=""
          enterKeyHint="done"
          placeholder={placeholder}
          aria-label={ariaLabel}
          animate={{ opacity: active ? 1 : 0.55 }}
          className={cx(
            'min-w-0 flex-1 border-t border-edge bg-transparent font-mono text-muted outline-none placeholder:text-ghost',
            compact ? 'pt-1.5 text-[12px]' : 'pt-2 text-[13px]',
          )}
        />
        {trailing}
      </div>
    </div>
  );
}
