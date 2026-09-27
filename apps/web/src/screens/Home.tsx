import { ArrowRight, BarChart3, BookOpen, Bookmark, RefreshCw, Settings as SettingsIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { CHAPTERS, type SessionMode } from '@calcflow/shared';
import { Eyebrow } from '@/components/Eyebrow';
import { HoverLabel } from '@/components/HoverLabel';
import { Toggle } from '@/components/Toggle';
import { cx } from '@/lib/cx';
import { clockTime } from '@/lib/format';
import { NOTHING_TO_ASK } from '@/state/slices/practice';
import { slowChapters, weakChapters, type ChapterStat } from '@/state/stats';
import { useStore } from '@/state/store';
import { useSessionChapters } from '@/state/useSessionChapters';
import { DifficultyCard } from './home/DifficultyCard';

/** `n` is the set length for the sized modes, and the flagged count for the rest. */
const MODES: Array<{ id: SessionMode; label(n: number): string; meta(n: number): string }> = [
  { id: 'set10', label: (n) => `Set of ${n}`, meta: (n) => `~${Math.round(n * 1.2)} min` },
  { id: 'endless', label: () => 'Endless', meta: () => 'no end' },
  { id: 'weak', label: () => 'Weak spots', meta: (n) => `${n} flagged` },
  { id: 'speed', label: () => 'Build speed', meta: (n) => `${n} slow` },
];

/** The modes that choose their own chapters, and what they choose them by. */
const CHOSEN_BY: Partial<Record<SessionMode, string>> = {
  weak: 'Weak spots picks these: under 70% mastery',
  speed: 'Build speed picks these: right, but slow',
};

export function Home({ compact }: { compact?: boolean }) {
  const difficulty = <DifficultyCard compact={compact} />;
  const chapters = <ChapterGrid compact={compact} />;

  return (
    <div
      className={cx(
        'flex h-full flex-col gap-6',
        compact ? 'scroll-y px-5 pb-16 pt-4' : 'px-11 pt-6',
      )}
    >
      <TopBar compact={compact} />
      {compact ? (
        <>
          {difficulty}
          {chapters}
          <div className="flex flex-col gap-4.5">
            <ModePanel />
          </div>
        </>
      ) : (
        /* The mode column runs the full height, so the tier picker and the
           chapters share the space to its left rather than stacking above it. */
        <div className="flex min-h-0 flex-1 gap-4.5">
          <div className="flex min-w-0 flex-1 flex-col gap-4.5">
            {difficulty}
            {chapters}
          </div>
          <div className="flex w-[380px] shrink-0 flex-col gap-4.5 pb-10">
            <ModePanel />
          </div>
        </div>
      )}
    </div>
  );
}

function TopBar({ compact }: { compact?: boolean }) {
  const go = useStore((s) => s.go);
  return (
    <div className="flex shrink-0 flex-wrap items-end gap-5">
      <h1 className={cx('font-semibold tracking-[-0.02em]', compact ? 'text-2xl' : 'text-[32px]')}>
        Practice
      </h1>

      <div className="ml-auto flex items-center gap-2.5">
        <button
          onClick={() => go('stats')}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-ink2 hover:border-accent"
        >
          <BarChart3 className="size-4 text-accent" />
          <span className="text-sm">Stats</span>
        </button>
        <SavedButton />
        <button
          onClick={() => go('rules')}
          aria-label="Rule reference"
          className="grid size-10 place-items-center rounded-md border border-border bg-card text-muted hover:text-ink"
        >
          <BookOpen className="size-[17px]" />
        </button>
        <SyncButton />
        <button
          onClick={() => go('settings')}
          aria-label="Settings"
          className="grid size-10 place-items-center rounded-md border border-border bg-card text-muted hover:text-ink"
        >
          <SettingsIcon className="size-[17px]" />
        </button>
      </div>
    </div>
  );
}

/** The saved list, with how many are waiting on it. */
function SavedButton() {
  const go = useStore((s) => s.go);
  const count = useStore((s) => s.settings.saved.length);
  return (
    <button
      onClick={() => go('saved')}
      aria-label={count ? `${count} saved for later` : 'Saved for later'}
      className="relative grid size-10 place-items-center rounded-md border border-border bg-card text-muted hover:text-ink"
    >
      <Bookmark className="size-[17px]" />
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 font-mono text-[10px] font-semibold text-on-accent">
          {count}
        </span>
      )}
    </button>
  );
}

/** Only ever there when there is something to send. */
function SyncButton() {
  const queued = useStore((s) => s.queued);
  const syncing = useStore((s) => s.syncing);
  const syncNow = useStore((s) => s.syncNow);
  const lastSyncedAt = useStore((s) => s.settings.lastSyncedAt);
  const attempts = queued === 1 ? 'attempt' : 'attempts';
  // The button only says "there is something to send"; hovering it says how
  // much, and whether the last attempt to send anything got through.
  const label = `${queued} ${attempts} waiting · ${
    lastSyncedAt ? `last synced ${clockTime(lastSyncedAt)}` : 'never synced'
  }`;

  return (
    <AnimatePresence>
      {queued > 0 && (
        <HoverLabel key="sync" label={label}>
          <motion.button
            initial={{ opacity: 0, scale: 0.8, width: 0 }}
            animate={{ opacity: 1, scale: 1, width: 40 }}
            exit={{ opacity: 0, scale: 0.8, width: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
            onClick={syncNow}
            aria-label={`Sync ${queued} unsent ${attempts}`}
            className="grid h-10 shrink-0 place-items-center rounded-md border border-correct/40 bg-correct/10 text-correct"
          >
            <RefreshCw className={cx('size-[17px]', syncing && 'animate-spin')} />
          </motion.button>
        </HoverLabel>
      )}
    </AnimatePresence>
  );
}

function ChapterGrid({ compact }: { compact?: boolean }) {
  const byChapter = useStore((s) => s.stats.byChapter);
  const mode = useStore((s) => s.settings.mode);
  const toggleChapter = useStore((s) => s.toggleChapter);
  const picked = useSessionChapters();
  // Weak spots and build speed choose for themselves; the grid shows their
  // choice rather than offering one that would be ignored.
  const chosenBy = CHOSEN_BY[mode];

  return (
    <section className={cx('flex min-w-0 flex-col gap-3.5', compact ? '' : 'min-h-0 flex-1')}>
      <div className="flex shrink-0 flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <Eyebrow className="text-xs">CHAPTERS</Eyebrow>
          <div className="h-px flex-1 bg-line" />
        </div>
        {chosenBy && (
          <p className="text-[13px] text-faint">
            {picked.length > 0 ? chosenBy : NOTHING_TO_ASK[mode]}
          </p>
        )}
      </div>

      {/* On the tablet the list runs to the bottom edge of the screen, and its
          own padding is what lets the last row scroll up clear of it. */}
      <div
        className={cx(
          'grid gap-3',
          compact ? 'grid-cols-2 pb-4' : 'scroll-y grid-cols-3 content-start pb-10',
        )}
      >
        {CHAPTERS.map((ch) => (
          <ChapterButton
            key={ch.n}
            n={ch.n}
            title={ch.title}
            stat={byChapter.find((c) => c.chapter === ch.n)!}
            on={picked.includes(ch.n)}
            locked={chosenBy !== undefined}
            onToggle={() => toggleChapter(ch.n)}
          />
        ))}
      </div>
    </section>
  );
}

/** An untouched chapter is not a failing one — it gets no arc at all. */
function ringColour(stat: ChapterStat): string {
  if (stat.attempts === 0) return 'transparent';
  if (stat.mastery >= 65) return 'var(--color-correct)';
  return stat.mastery >= 35 ? 'var(--color-accent)' : 'var(--color-wrong)';
}

function ChapterButton({
  n,
  title,
  stat,
  on,
  locked,
  onToggle,
}: {
  n: number;
  title: string;
  stat: ChapterStat;
  on: boolean;
  /** The mode chose; the button shows its choice and cannot change it. */
  locked: boolean;
  onToggle(): void;
}) {
  return (
    <motion.button
      whileTap={locked ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      onClick={onToggle}
      disabled={locked}
      aria-pressed={on}
      className={cx(
        'flex items-center gap-3 rounded-lg border px-4 py-3.5 text-left transition-[border-color,background-color,opacity] disabled:cursor-default',
        on ? 'border-accent bg-accent/10' : 'border-border bg-card',
        !on && (locked ? 'opacity-45' : 'hover:border-rail'),
      )}
    >
      <span className="relative size-[34px] shrink-0">
        <svg viewBox="0 0 34 34" className="block -rotate-90">
          <circle cx="17" cy="17" r="14" fill="none" className="stroke-border" strokeWidth="3" />
          <circle
            cx="17"
            cy="17"
            r="14"
            fill="none"
            style={{ stroke: ringColour(stat) }}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${((stat.mastery / 100) * 87.96).toFixed(1)} 87.96`}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-mono text-[11px] text-ink2">
          {n}
        </span>
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{title}</span>
        <span className="text-xs text-faint">
          {stat.attempts === 0 ? 'not started' : `${stat.mastery}% mastery`}
        </span>
      </span>
    </motion.button>
  );
}

function ModePanel() {
  const mode = useStore((s) => s.settings.mode);
  const setLength = useStore((s) => s.settings.setLength);
  const adaptive = useStore((s) => s.settings.adaptive);
  const stats = useStore((s) => s.stats);
  const patchSettings = useStore((s) => s.patchSettings);
  // The same lists the sessions draw from, so "2 flagged" is two chapters.
  const counts: Record<SessionMode, number> = {
    set10: setLength,
    endless: setLength,
    weak: weakChapters(stats).length,
    speed: slowChapters(stats).length,
  };

  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-5 py-4.5">
        <Eyebrow className="text-xs">MODE</Eyebrow>
        <div className="flex flex-col gap-2">
          {MODES.map((m) => (
            <ModeButton
              key={m.id}
              label={m.label(setLength)}
              meta={m.meta(counts[m.id])}
              active={mode === m.id}
              onPick={() => patchSettings({ mode: m.id })}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <div className="text-sm font-medium">Adaptive difficulty</div>
          <div className="text-xs text-faint">mixes in the next tier as you get them right</div>
        </div>
        <div className="ml-auto">
          <Toggle
            checked={adaptive}
            onChange={(next) => patchSettings({ adaptive: next })}
            label="Adaptive difficulty"
          />
        </div>
      </div>

      <StartButton />
    </>
  );
}

function ModeButton({
  label,
  meta,
  active,
  onPick,
}: {
  label: string;
  meta: string;
  active: boolean;
  onPick(): void;
}) {
  return (
    <button
      onClick={onPick}
      aria-pressed={active}
      className={cx(
        'flex items-center gap-3 rounded-md border px-3.5 py-3 text-left transition-colors',
        active ? 'border-accent bg-accent/10' : 'border-edge bg-page hover:border-rail',
      )}
    >
      <span
        className={cx(
          'grid size-4 place-items-center rounded-full border-2',
          active ? 'border-accent' : 'border-rail',
        )}
      >
        <span className={cx('size-[7px] rounded-full', active && 'bg-accent')} />
      </span>
      <span className="text-sm font-medium">{label}</span>
      <span className="ml-auto text-xs text-faint">{meta}</span>
    </button>
  );
}

function StartButton() {
  const mode = useStore((s) => s.settings.mode);
  const setLength = useStore((s) => s.settings.setLength);
  const none = useSessionChapters().length === 0;
  const startSession = useStore((s) => s.startSession);
  const label = MODES.find((m) => m.id === mode)!.label(setLength).toLowerCase();

  return (
    <motion.button
      whileTap={none ? undefined : { scale: 0.98 }}
      onClick={() => startSession(mode)}
      disabled={none}
      className={cx(
        'mt-auto flex h-[68px] shrink-0 items-center justify-center gap-3 rounded-xl text-[19px] font-semibold transition-colors',
        none ? 'cursor-not-allowed bg-raised text-faint' : 'bg-accent text-on-accent hover:bg-accent-hi',
      )}
    >
      {none ? (
        NOTHING_TO_ASK[mode]
      ) : (
        <>
          Start {label}
          <ArrowRight className="size-[18px]" />
        </>
      )}
    </motion.button>
  );
}
