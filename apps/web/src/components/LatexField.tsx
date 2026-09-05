import { useRef, type ReactNode, type RefObject } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cx } from '@/lib/cx';
import { caretOffset, resolveKeys, type LatexKey } from '@/lib/latexKeys';
import { useStore } from '@/state/store';
import { Tex } from './Tex';

export type FieldTone = 'editing' | 'correct' | 'wrong' | 'near';

interface Props {
  value: string;
  onChange(next: string): void;
  onSubmit?(): void;
  onFocus?(): void;
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

const BORDER: Record<FieldTone, string> = {
  editing: 'border-accent',
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
  const ids = useStore((s) => s.settings.keys);
  const custom = useStore((s) => s.settings.customKeys);
  const keys = resolveKeys(ids, custom);

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
        'flex min-w-0 flex-col rounded-lg border bg-well',
        active ? BORDER[tone] : 'border-border',
      )}
    >
      {!readOnly && (
        <div className={cx('flex items-stretch gap-1.5 border-b border-edge', compact ? 'p-1.5' : 'p-2')}>
          <div className="scroll-x flex min-w-0 flex-1 gap-1.5">
            {keys.map((key) => (
              <motion.button
                key={key.id}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 700, damping: 30 }}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => insert(key)}
                aria-label={key.name}
                className={cx(
                  'grid shrink-0 place-items-center rounded-[9px] border border-border bg-raised px-2.5 text-ink transition-colors hover:border-accent active:bg-overlay',
                  compact ? 'h-9 min-w-[42px] text-[14px]' : 'h-10 min-w-[46px] text-[16px]',
                )}
              >
                <Tex>{key.tex}</Tex>
              </motion.button>
            ))}
            {keys.length === 0 && (
              <div className="grid h-9 flex-1 place-items-center text-[13px] text-faint">
                Add keys in settings
              </div>
            )}
          </div>
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
        onClick={() => inputRef.current?.focus()}
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
          onFocus={onFocus}
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
