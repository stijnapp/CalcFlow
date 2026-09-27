import type { ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Eyebrow } from '@/components/Eyebrow';
import { cx } from '@/lib/cx';

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <Eyebrow>{title}</Eyebrow>
      <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">{children}</div>
    </section>
  );
}

export function Row({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-raised px-4 py-3.5 first:border-t-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm text-ink">{label}</span>
        {sub && <span className="truncate text-xs text-faint">{sub}</span>}
      </div>
      <div className="ml-auto shrink-0">{children}</div>
    </div>
  );
}

/**
 * A number with named stops. Between them, not through them: the point of the
 * setting is "shorter than ten" or "longer than ten", and the exact figure in
 * between is not a thing worth a keyboard.
 */
export function Stepper({
  value,
  stops,
  onChange,
}: {
  value: number;
  stops: readonly number[];
  onChange(next: number): void;
}) {
  const at = Math.max(
    0,
    stops.findIndex((n) => n >= value),
  );
  const step = (by: -1 | 1) => onChange(stops[Math.min(stops.length - 1, Math.max(0, at + by))]!);

  return (
    <div className="flex items-center gap-1.5">
      <StepButton label="Fewer questions" disabled={at === 0} onClick={() => step(-1)}>
        <Minus className="size-3.5" />
      </StepButton>
      <span className="w-8 text-center font-mono text-sm text-ink">{stops[at]}</span>
      <StepButton
        label="More questions"
        disabled={at === stops.length - 1}
        onClick={() => step(1)}
      >
        <Plus className="size-3.5" />
      </StepButton>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick(): void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cx(
        'grid size-8 place-items-center rounded-sm border border-border bg-raised',
        disabled ? 'text-ghost' : 'text-ink2 hover:border-accent hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  password,
}: {
  value: string;
  onChange(next: string): void;
  placeholder: string;
  password?: boolean;
}) {
  return (
    <input
      value={value}
      type={password ? 'password' : 'text'}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={password ? 'new-password' : 'off'}
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      data-lpignore="true"
      data-1p-ignore=""
      className="w-[160px] rounded-sm border border-border bg-well px-2.5 py-1.5 text-right font-mono text-xs text-ink2 outline-none placeholder:text-ghost focus:border-accent"
    />
  );
}
