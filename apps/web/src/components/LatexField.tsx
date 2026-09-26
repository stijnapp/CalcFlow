import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { Sigma } from 'lucide-react';
import { motion } from 'motion/react';
import { TapDetector } from '@/canvas/gestures';
import { cx } from '@/lib/cx';
import { claimKeyBar, releaseKeyBar, type KeyTarget } from '@/lib/keyBar';
import { caretOffset, type LatexKey } from '@/lib/latexKeys';
import { useEditHistory } from '@/lib/useEditHistory';
import { useStore } from '@/state/store';
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
 * One box, two storeys: what it renders to, and the raw LaTeX underneath. The
 * notation he cannot type is on the key bar over the keyboard, which types into
 * whichever box has the caret — so two answer boxes still each type into
 * themselves, without each carrying its own row of keys.
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
  const showToast = useStore((s) => s.showToast);
  const keyBar = useStore((s) => s.settings.keyBar);
  const patchSettings = useStore((s) => s.patchSettings);

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

  // The bar holds on to one object for as long as this field has the caret, so
  // it is stable and reads the latest `value` through the ref at each press.
  const latest = useRef({ insert, step });
  latest.current = { insert, step };
  const box = useRef<HTMLDivElement>(null);
  const target = useMemo<KeyTarget>(
    () => ({
      insert: (key) => latest.current.insert(key),
      step: (by) => latest.current.step(by),
      anchor: () => box.current,
    }),
    [],
  );
  useEffect(() => () => releaseKeyBar(target), [target]);

  return (
    <div
      ref={box}
      className={cx(
        'flex min-w-0 flex-col rounded-lg border bg-well transition-colors',
        BORDER[tone] || (focused ? 'border-accent' : 'border-border'),
      )}
    >
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
            if (!readOnly) claimKeyBar(target);
            onFocus?.();
          }}
          onBlur={() => {
            setFocused(false);
            releaseKeyBar(target);
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
        {!readOnly && (
          <button
            type="button"
            // Pressing it must not take the caret out of the field, or the
            // keyboard the bar sits on closes as the bar comes up.
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              patchSettings({ keyBar: !keyBar });
              if (!keyBar) inputRef.current?.focus({ preventScroll: true });
            }}
            aria-pressed={keyBar}
            aria-label={keyBar ? 'Hide the key bar' : 'Show the key bar'}
            className={cx(
              'grid shrink-0 place-items-center rounded-md border transition-colors',
              compact ? 'size-7' : 'size-8',
              keyBar ? 'border-accent/60 bg-accent/10 text-accent' : 'border-edge bg-sunken text-faint',
            )}
          >
            <Sigma className="size-3.5" />
          </button>
        )}
        {trailing}
      </div>
    </div>
  );
}
