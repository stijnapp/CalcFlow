import { Navigate } from 'react-router-dom';
import { generatorById } from '@calcflow/generators';
import { chapterTitle } from '@calcflow/shared';
import { Eyebrow } from '@/components/Eyebrow';
import { cx } from '@/lib/cx';
import { duration, median } from '@/lib/format';
import { useStore, type Session } from '@/state/store';

const CONFIDENCE_ROWS = [
  { id: 'sure', label: 'Sure' },
  { id: 'think', label: 'Think so' },
  { id: 'guess', label: 'Guessed' },
] as const;

type Done = Session['done'];

interface TopicRow {
  name: string;
  right: number;
  total: number;
}

/**
 * Which topics came up, and how they did on each. Keyed by generator, and
 * named by the generator's own title — two topics in one chapter would
 * otherwise collapse into the same row.
 */
function topicsOf(items: Done): Map<string, TopicRow> {
  const topics = new Map<string, TopicRow>();
  for (const item of items) {
    const key = item.problem.generatorId;
    const entry = topics.get(key) ?? {
      name: generatorById(key)?.title ?? chapterTitle(item.problem.chapter),
      right: 0,
      total: 0,
    };
    entry.total += 1;
    if (item.correct) entry.right += 1;
    topics.set(key, entry);
  }
  return topics;
}

export function Summary({ compact }: { compact?: boolean }) {
  const session = useStore((s) => s.summary);
  if (!session) return <Navigate to="/" replace />;
  const items = session.done;

  return (
    <div className={cx('scroll-y h-full', compact ? 'px-5 pb-16 pt-5' : 'grid place-items-center p-10')}>
      <div
        className={cx(
          'flex w-full flex-col gap-8 rounded-4xl border border-border bg-card',
          compact ? 'gap-6 px-5 py-6' : 'max-w-[900px] px-11 py-10',
        )}
      >
        <Headline target={session.target} items={items} compact={compact} />
        <div className={cx('flex gap-6', compact && 'flex-col')}>
          <ConfidenceBars items={items} />
          {!compact && <div className="w-px bg-line" />}
          <TopicList topics={topicsOf(items)} />
        </div>
        <Actions misses={items.filter((i) => !i.correct)} compact={compact} />
      </div>
    </div>
  );
}

function Headline({ target, items, compact }: {
  target: number | null;
  items: Done;
  compact?: boolean;
}) {
  const correct = items.filter((i) => i.correct).length;
  const totalMs = items.reduce((sum, i) => sum + i.durationMs, 0);
  const hints = items.filter((i) => i.hintMaxRung > 0).length;
  return (
    <div className="flex flex-wrap items-end gap-7">
      <div className="flex flex-col gap-1">
        <Eyebrow className="text-xs">
          {target === null ? 'ENDLESS' : `SET OF ${target}`} · COMPLETE
        </Eyebrow>
        <div className="flex items-baseline gap-2">
          <span className="text-[68px] font-semibold leading-none tracking-[-0.03em]">{correct}</span>
          <span className="text-[28px] text-faint">/ {items.length}</span>
        </div>
      </div>
      <div className={cx('flex gap-8', compact ? 'w-full justify-between' : 'ml-auto')}>
        <Stat label="TIME" value={duration(totalMs)} />
        <Stat label="HINTS" value={String(hints)} />
        <Stat label="MEDIAN" value={duration(median(items.map((i) => i.durationMs)))} />
      </div>
    </div>
  );
}

function ConfidenceBars({ items }: { items: Done }) {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <Eyebrow className="text-xs">CONFIDENCE</Eyebrow>
      {CONFIDENCE_ROWS.map((row) => {
        const of = items.filter((i) => i.confidence === row.id);
        const right = of.filter((i) => i.correct).length;
        return (
          <div key={row.id} className="flex items-center gap-3.5">
            <span className="w-[78px] text-sm text-ink2">{row.label}</span>
            <span className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-line">
              <span
                className="h-2.5 bg-correct transition-[width] duration-500"
                style={{ width: `${(right / items.length) * 100}%` }}
              />
              <span
                className="h-2.5 bg-wrong transition-[width] duration-500"
                style={{ width: `${((of.length - right) / items.length) * 100}%` }}
              />
            </span>
            <span className="w-[46px] text-right font-mono text-[13px] text-muted">{of.length}</span>
          </div>
        );
      })}
    </div>
  );
}

function TopicList({ topics }: { topics: Map<string, TopicRow> }) {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <Eyebrow className="text-xs">TOPICS THIS SET</Eyebrow>
      {[...topics.entries()].map(([id, t]) => (
        <div key={id} className="flex items-center gap-3">
          <span
            className={cx(
              'size-2 shrink-0 rounded-full',
              t.right === t.total ? 'bg-correct' : t.right === 0 ? 'bg-wrong' : 'bg-accent',
            )}
          />
          <span className="truncate text-sm text-ink2">{t.name}</span>
          <span className="ml-auto shrink-0 font-mono text-[13px] text-faint">
            {t.right} / {t.total}
          </span>
        </div>
      ))}
    </div>
  );
}

function Actions({ misses, compact }: { misses: Done; compact?: boolean }) {
  const startSession = useStore((s) => s.startSession);
  const go = useStore((s) => s.go);
  const none = misses.length === 0;
  const practiseMisses = () =>
    startSession('set10', {
      only: [...new Set(misses.map((m) => m.problem.generatorId))],
      chapters: [...new Set(misses.map((m) => m.problem.chapter))],
    });
  return (
    <div className={cx('flex gap-3', compact && 'flex-col')}>
      <button
        disabled={none}
        onClick={practiseMisses}
        className={cx(
          // Not `flex-1` in the phone's column: a zero basis there is what
          // squeezed this to the height of its own label.
          'grid h-[60px] place-items-center rounded-lg text-[17px] font-semibold',
          compact ? 'shrink-0' : 'flex-1',
          none
            ? 'cursor-not-allowed bg-raised text-faint'
            : 'bg-accent text-on-accent hover:bg-accent-hi',
        )}
      >
        {none
          ? 'Nothing missed'
          : `Practice the ${misses.length} ${misses.length === 1 ? 'miss' : 'misses'}`}
      </button>
      <button
        onClick={() => go('home')}
        className={cx(
          'grid h-[60px] place-items-center rounded-lg border border-border bg-card text-base text-ink2',
          compact ? 'shrink-0' : 'w-[200px]',
        )}
      >
        Done for now
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-faint">{label}</span>
      <span className="font-mono text-2xl">{value}</span>
    </div>
  );
}
