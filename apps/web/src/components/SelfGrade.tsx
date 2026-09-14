import type { SelfGrade } from '@calcflow/shared';
import { cx } from '@/lib/cx';
import { Eyebrow } from './Eyebrow';

const OPTIONS: Array<{ id: SelfGrade; label: string }> = [
  { id: 'got', label: 'Got it' },
  { id: 'close', label: 'Close' },
  { id: 'missed', label: 'Missed' },
];

/** What each mark means for the numbers, said out loud rather than implied. */
const CONSEQUENCE: Record<SelfGrade, string> = {
  got: 'Logged as correct.',
  close: 'Logged as a near miss — shape right, one detail off. Counts toward fluency, not toward misconceptions.',
  missed: 'Logged as wrong, the same as a wrong typed answer.',
};

interface Props {
  value: SelfGrade | null;
  onChange(value: SelfGrade): void;
  /** Chapter 12 draws arrows rather than curves, and the wording follows. */
  noun?: string;
  compact?: boolean;
}

/**
 * The half of a graph question nothing can grade. Three buckets rather than
 * two, because "shape right, asymptote in the wrong place" is neither a pass
 * nor a misconception — and putting it in either would make chapter 5's numbers
 * mean something different from every other chapter's.
 */
export function SelfGradeRow({ value, onChange, noun = 'sketch', compact }: Props) {
  return (
    <div className="flex flex-col gap-2.5">
      <Eyebrow className={compact ? 'text-[10px]' : undefined}>
        {`AND THE ${noun.toUpperCase()} ITSELF?`}
      </Eyebrow>
      {!value && (
        <p className="text-[13px] leading-relaxed text-faint text-pretty">
          Only you can see whether it is right. Compare on the canvas, then say.
        </p>
      )}
      <div className="flex gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            disabled={value !== null}
            aria-pressed={value === o.id}
            className={cx(
              'grid flex-1 place-items-center rounded-xl border font-medium transition-colors',
              compact ? 'h-10 text-[13px]' : 'h-[46px] text-sm',
              value === o.id
                ? 'border-accent bg-accent/15 text-accent'
                : value
                  ? 'border-border bg-raised text-faint'
                  : 'border-border bg-raised text-ink2 hover:border-rail',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      {value && (
        <p className="text-[13px] leading-relaxed text-ink2 text-pretty">{CONSEQUENCE[value]}</p>
      )}
    </div>
  );
}
