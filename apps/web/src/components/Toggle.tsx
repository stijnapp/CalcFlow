import { cx } from '@/lib/cx';

interface Props {
  checked: boolean;
  onChange(next: boolean): void;
  label: string;
}

export function Toggle({ checked, onChange, label }: Props) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative h-[27px] w-[46px] shrink-0 rounded-full border transition-colors',
        checked ? 'border-accent bg-accent' : 'border-strong bg-overlay',
      )}
    >
      <span
        className={cx(
          'absolute top-[2px] size-[21px] rounded-full transition-[left] duration-150',
          checked ? 'left-[21px] bg-on-accent' : 'left-[2px] bg-knob',
        )}
      />
    </button>
  );
}
