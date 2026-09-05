import type { Confidence } from '@calcflow/shared';
import { cx } from '@/lib/cx';

const OPTIONS: Array<{ id: Confidence; label: string }> = [
  { id: 'sure', label: 'Sure' },
  { id: 'think', label: 'Think so' },
  { id: 'guess', label: 'Guessed' },
];

interface Props {
  value: Confidence | null;
  onChange(value: Confidence): void;
  compact?: boolean;
}

/**
 * Captured at submit, before the result is shown — that ordering is the whole
 * reason the confidence × correctness grid means anything.
 */
export function ConfidenceRow({ value, onChange, compact }: Props) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={cx(
            'grid flex-1 place-items-center rounded-xl border font-medium transition-colors',
            compact ? 'h-10 text-[13px]' : 'h-[46px] text-sm',
            value === o.id
              ? 'border-accent bg-accent/15 text-accent'
              : 'border-border bg-raised text-ink2 hover:border-rail',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
