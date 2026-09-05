import { cx } from '@/lib/cx';
import type { Session } from '@/state/store';

/** Ten dots for a set of ten: how it went, at a glance, without a number. */
export function ProgressDots({ session }: { session: Session }) {
  const total = Math.min(session.target ?? Math.max(10, session.done.length + 1), 10);
  return (
    <div className="flex shrink-0 gap-1" aria-hidden>
      {Array.from({ length: total }, (_, i) => {
        const item = session.done[i];
        return (
          <span
            key={i}
            className={cx(
              'size-[7px] rounded-full',
              item === undefined ? 'bg-border' : item.correct ? 'bg-correct' : 'bg-wrong',
            )}
          />
        );
      })}
    </div>
  );
}
