import { useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { RULES } from '@calcflow/generators';
import { chapterTitle } from '@calcflow/shared';
import { Tex } from '@/components/Tex';
import { cx } from '@/lib/cx';
import { useStore } from '@/state/store';

/** The book's boxed rules, searchable and grouped by chapter. */
export function Rules({ compact }: { compact?: boolean }) {
  const go = useStore((s) => s.go);
  const [query, setQuery] = useState('');
  const [chapter, setChapter] = useState<number | null>(null);

  const chapters = useMemo(() => [...new Set(RULES.map((r) => r.chapter))].sort((a, b) => a - b), []);

  const shown = RULES.filter((r) => {
    if (chapter !== null && r.chapter !== chapter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.note.toLowerCase().includes(q);
  });

  return (
    <div className="flex h-full flex-col">
      <div className={cx('flex shrink-0 flex-col gap-4 border-b border-line', compact ? 'px-5 py-4' : 'px-10 py-5')}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => go('home')}
            aria-label="Back"
            className="grid size-10 place-items-center rounded-md border border-border bg-card text-muted hover:text-ink"
          >
            <ArrowLeft className="size-[17px]" />
          </button>
          <h1 className={cx('font-semibold tracking-[-0.02em]', compact ? 'text-[21px]' : 'text-[28px]')}>
            Rules worth knowing by heart
          </h1>
        </div>

        <div className={cx('flex gap-2', compact ? 'flex-col items-stretch' : 'flex-wrap items-center')}>
          <label className="flex min-w-[220px] flex-1 items-center gap-2.5 rounded-md border border-border bg-well px-3.5 py-2.5 focus-within:border-accent">
            <Search className="size-4 shrink-0 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the rules"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ghost"
            />
          </label>
          {/* On the phone the chips are one lane he swipes, not four rows of chrome. */}
          <div className={cx('flex gap-1.5', compact ? 'scroll-x -mx-5 px-5 pb-0.5' : 'flex-wrap')}>
            <Chip active={chapter === null} onClick={() => setChapter(null)}>
              All
            </Chip>
            {chapters.map((n) => (
              <Chip key={n} active={chapter === n} onClick={() => setChapter(n)}>
                Ch {n}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className={cx('scroll-y flex-1', compact ? 'px-5 pb-16 pt-4' : 'px-10 pb-16 pt-6')}>
        {shown.length === 0 ? (
          <p className="pt-10 text-center text-sm text-muted">
            No rule matches “{query}”. Try the chapter chips instead.
          </p>
        ) : (
          <div className={cx('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-2 xl:grid-cols-3')}>
            {shown.map((rule) => (
              <article
                key={rule.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-baseline gap-2.5">
                  <span className="font-mono text-[11px] tracking-[0.12em] text-accent">
                    CH {rule.chapter}
                  </span>
                  <h2 className="text-base font-medium">{rule.name}</h2>
                </div>
                <div className="grid place-items-center scroll-x rounded-md border border-edge bg-page px-4 py-5 text-xl">
                  <Tex>{rule.tex}</Tex>
                </div>
                <p className="text-[13px] leading-relaxed text-muted text-pretty">{rule.note}</p>
                <span className="mt-auto text-xs text-ghost">{chapterTitle(rule.chapter)}</span>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick(): void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px]',
        active ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-card text-muted',
      )}
    >
      {children}
    </button>
  );
}
