import type { Session } from '@/state/store';
import { cx } from '@/lib/cx';

const OPTIONS: Array<{ id: Session['reveal']; label: string }> = [
  { id: 'both', label: 'Both' },
  { id: 'mine', label: 'Mine' },
  { id: 'answer', label: 'Answer' },
];

interface Props {
  value: Session['reveal'];
  onChange(value: Session['reveal']): void;
}

/**
 * Sits on the canvas once the answer is up. Both is the default because
 * comparing is the point; the other two are for when the two drawings are on
 * top of each other and he needs to see one of them on its own.
 */
export function RevealToggle({ value, onChange }: Props) {
  return (
    <div className="pointer-events-auto flex gap-0.5 rounded-full border border-strong bg-overlay p-0.5 shadow-[0_8px_20px_-6px_var(--color-shadow)]">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={cx(
            'rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors',
            value === o.id ? 'bg-accent text-on-accent' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
