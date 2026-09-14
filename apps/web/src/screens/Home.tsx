import { ArrowRight, BarChart3, BookOpen, RefreshCw, Settings as SettingsIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { CHAPTERS, TIERS, TIER_BLURB, TIER_LABEL, type SessionMode } from '@calcflow/shared';
import { candidates } from '@calcflow/generators';
import { Eyebrow } from '@/components/Eyebrow';
import { HoverLabel } from '@/components/HoverLabel';
import { Tex } from '@/components/Tex';
import { Toggle } from '@/components/Toggle';
import { cx } from '@/lib/cx';
import { clockTime } from '@/lib/format';
import { useStore } from '@/state/store';

/** `n` is the set length for the sized modes, and the flagged count for the rest. */
const MODES: Array<{ id: SessionMode; label(n: number): string; meta(n: number): string }> = [
  { id: 'set10', label: (n) => `Set of ${n}`, meta: (n) => `~${Math.round(n * 1.2)} min` },
  { id: 'endless', label: () => 'Endless', meta: () => 'no end' },
  { id: 'weak', label: () => 'Weak spots', meta: (n) => `${n} flagged` },
  { id: 'speed', label: () => 'Build speed', meta: (n) => `${n} slow topics` },
];

export function Home({ compact }: { compact?: boolean }) {
  const settings = useStore((s) => s.settings);
  const stats = useStore((s) => s.stats);
  const queued = useStore((s) => s.queued);
  const syncing = useStore((s) => s.syncing);
  const store = useStore();

  const pool = candidates({ chapters: settings.chapters, tier: settings.tier });
  const sample = pool[0];
  const none = settings.chapters.length === 0;
  const flagged = stats.byChapter.filter((c) => c.attempts >= 3 && c.mastery < 70).length;
  // The button only says "there is something to send"; hovering it says how
  // much, and whether the last attempt to send anything got through.
  const syncLabel = `${queued} ${queued === 1 ? 'attempt' : 'attempts'} waiting · ${
    settings.lastSyncedAt ? `last synced ${clockTime(settings.lastSyncedAt)}` : 'never synced'
  }`;
  const slow = stats.byChapter.filter((c) => c.attempts >= 3 && c.speed === 'slow').length;

  /* Three named tiers rather than a nine-stop dial. The dial implied a
     precision the generators never had — every one of them turned its number
     straight back into two or three branches — and a number gave him nothing
     to expect, where "hard" says what is coming. */
  const difficulty = (
    <section className="flex shrink-0 flex-col gap-4 rounded-2xl border border-border bg-card px-5 py-4.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Eyebrow className="text-xs">DIFFICULTY</Eyebrow>
        <span className="text-[13px] text-faint">{TIER_BLURB[settings.tier]}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TIERS.map((t) => {
          const active = settings.tier === t;
          return (
            <motion.button
              key={t}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 600, damping: 30 }}
              onClick={() => store.patchSettings({ tier: t })}
              aria-pressed={active}
              className={cx(
                'rounded-md border py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'border-accent bg-accent/10 text-ink'
                  : 'border-edge bg-page text-muted hover:border-rail',
              )}
            >
              {TIER_LABEL[t]}
            </motion.button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3.5 rounded-md border border-edge bg-page px-4 py-3.5">
        <Eyebrow className="text-xs">SAMPLE</Eyebrow>
        {sample ? (
          <motion.span key={sample.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xl">
            <Tex>{sampleTex(sample.id)}</Tex>
          </motion.span>
        ) : (
          <span className="text-[13px] text-near-ink">
            {none ? 'Pick a chapter to see one' : 'No topic asks this tier yet'}
          </span>
        )}
        <span className="ml-auto text-[13px] text-muted">
          {pool.length} {pool.length === 1 ? 'topic asks' : 'topics ask'} this
        </span>
      </div>
    </section>
  );

  const chapters = (
    <section className={cx('flex min-w-0 flex-col gap-3.5', compact ? '' : 'min-h-0 flex-1')}>
      <div className="flex shrink-0 items-center gap-3">
        <Eyebrow className="text-xs">CHAPTERS</Eyebrow>
        <div className="h-px flex-1 bg-line" />
      </div>

      <div className={cx('grid gap-3 pb-4', compact ? 'grid-cols-2' : 'scroll-y grid-cols-3 content-start')}>
        {CHAPTERS.map((ch) => {
          const stat = stats.byChapter.find((c) => c.chapter === ch.n)!;
          const on = settings.chapters.includes(ch.n);
          // An untouched chapter is not a failing one — it gets no arc at all.
          const ring =
            stat.attempts === 0
              ? 'transparent'
              : stat.mastery >= 65
                ? '#3fb27f'
                : stat.mastery >= 35
                  ? '#f5a524'
                  : '#e5484d';
          return (
            <motion.button
              key={ch.n}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 600, damping: 30 }}
              onClick={() => store.toggleChapter(ch.n)}
              aria-pressed={on}
              className={cx(
                'flex items-center gap-3 rounded-lg border px-4 py-3.5 text-left transition-colors',
                on ? 'border-accent bg-accent/10' : 'border-border bg-card hover:border-rail',
              )}
            >
              <span className="relative size-[34px] shrink-0">
                <svg viewBox="0 0 34 34" className="block -rotate-90">
                  <circle cx="17" cy="17" r="14" fill="none" stroke="#332e29" strokeWidth="3" />
                  <circle
                    cx="17"
                    cy="17"
                    r="14"
                    fill="none"
                    stroke={ring}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${((stat.mastery / 100) * 87.96).toFixed(1)} 87.96`}
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center font-mono text-[11px] text-ink2">
                  {ch.n}
                </span>
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{ch.title}</span>
                <span className="text-xs text-faint">
                  {stat.attempts === 0 ? 'not started' : `${stat.mastery}% mastery`}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );

  const mode = (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-5 py-4.5">
        <Eyebrow className="text-xs">MODE</Eyebrow>
        <div className="flex flex-col gap-2">
          {MODES.map((m) => {
            const active = settings.mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => store.patchSettings({ mode: m.id })}
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
                <span className="text-sm font-medium">{m.label(settings.setLength)}</span>
                <span className="ml-auto text-xs text-faint">
                  {m.meta(m.id === 'weak' ? flagged : m.id === 'speed' ? slow : settings.setLength)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <div className="text-sm font-medium">Adaptive difficulty</div>
          <div className="text-xs text-faint">nudges up after three right, down after two wrong</div>
        </div>
        <div className="ml-auto">
          <Toggle
            checked={settings.adaptive}
            onChange={(adaptive) => store.patchSettings({ adaptive })}
            label="Adaptive difficulty"
          />
        </div>
      </div>

      <motion.button
        whileTap={none ? undefined : { scale: 0.98 }}
        onClick={() => store.startSession(settings.mode)}
        disabled={none}
        className={cx(
          'mt-auto flex h-[68px] shrink-0 items-center justify-center gap-3 rounded-xl text-[19px] font-semibold transition-colors',
          none ? 'cursor-not-allowed bg-raised text-faint' : 'bg-accent text-on-accent hover:bg-accent-hi',
        )}
      >
        {none ? (
          'Pick a chapter to start'
        ) : (
          <>
            Start {MODES.find((m) => m.id === settings.mode)!.label(settings.setLength).toLowerCase()}
            <ArrowRight className="size-[18px]" />
          </>
        )}
      </motion.button>
    </>
  );

  return (
    <div
      className={cx(
        'flex h-full flex-col gap-6',
        compact ? 'scroll-y px-5 pb-16 pt-4' : 'px-11 pb-10 pt-6',
      )}
    >
      <div className="flex shrink-0 flex-wrap items-end gap-5">
        <h1 className={cx('font-semibold tracking-[-0.02em]', compact ? 'text-2xl' : 'text-[32px]')}>
          Practice
        </h1>

        <div className="ml-auto flex items-center gap-2.5">
          <button
            onClick={() => store.go('stats')}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-ink2 hover:border-accent"
          >
            <BarChart3 className="size-4 text-accent" />
            <span className="text-sm">Stats</span>
          </button>
          <button
            onClick={() => store.go('rules')}
            aria-label="Rule reference"
            className="grid size-10 place-items-center rounded-md border border-border bg-card text-muted hover:text-ink"
          >
            <BookOpen className="size-[17px]" />
          </button>
          {/* Only ever there when there is something to send. */}
          <AnimatePresence>
            {queued > 0 && (
              <HoverLabel key="sync" label={syncLabel}>
                <motion.button
                  initial={{ opacity: 0, scale: 0.8, width: 0 }}
                  animate={{ opacity: 1, scale: 1, width: 40 }}
                  exit={{ opacity: 0, scale: 0.8, width: 0 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                  onClick={store.syncNow}
                  aria-label={`Sync ${queued} unsent ${queued === 1 ? 'attempt' : 'attempts'}`}
                  className="grid h-10 shrink-0 place-items-center rounded-md border border-correct/40 bg-correct/10 text-correct"
                >
                  <RefreshCw className={cx('size-[17px]', syncing && 'animate-spin')} />
                </motion.button>
              </HoverLabel>
            )}
          </AnimatePresence>
          <button
            onClick={() => store.go('settings')}
            aria-label="Settings"
            className="grid size-10 place-items-center rounded-md border border-border bg-card text-muted hover:text-ink"
          >
            <SettingsIcon className="size-[17px]" />
          </button>
        </div>
      </div>

      {compact ? (
        <>
          {difficulty}
          {chapters}
          <div className="flex flex-col gap-4.5">{mode}</div>
        </>
      ) : (
        /* The mode column runs the full height, so the tier picker and the
           chapters share the space to its left rather than stacking above it. */
        <div className="flex min-h-0 flex-1 gap-4.5">
          <div className="flex min-w-0 flex-1 flex-col gap-4.5">
            {difficulty}
            {chapters}
          </div>
          <div className="flex w-[380px] shrink-0 flex-col gap-4.5">{mode}</div>
        </div>
      )}
    </div>
  );
}

/** A representative prompt for the topic that would come up first. */
function sampleTex(generatorId: string): string {
  const samples: Record<string, string> = {
    'powers.notable-products': '(a+3)^{2}-(a-3)^{2}',
    'powers.rules': 'x^{4}\\cdot x^{6}',
    'fractions.combine': '\\tfrac{2}{3}+\\tfrac{3}{4}',
    'fractions.rational-expressions': '\\frac{x^{2}-9}{x+3}',
    'roots.simplify-surd': '\\sqrt{72}',
    'roots.rationalise': '\\frac{1}{\\sqrt{5}+2}',
    'roots.fractional-exponents': '27^{2/3}',
    'logs.laws': 'e^{3\\ln t}',
    'logs.exponential-equation': '5^{x+1}=7^{x-1}',
    'trig.exact-values': '\\cos\\tfrac{\\pi}{6}',
    'trig.degrees-radians': '135^\\circ',
    'trig.double-angle': '2\\sin x\\cos x',
    'equations.linear': '3x-7=5x+1',
    'equations.quadratic': 'x^{2}-x-6=0',
    'diff.power-sum': '\\tfrac{d}{dx}(x^{3}+2x-7)',
    'diff.chain-rule': '\\tfrac{d}{dx}\\ln(a+\\sqrt{x})',
    'diff.product-quotient': '\\tfrac{d}{dx}\\tfrac{x+1}{2x-3}',
    'anti.power-sum': '\\int 3x^{2}-4x\\,dx',
    'anti.linear-inner': '\\int (2x+1)^{4}\\,dx',
    'integ.definite-power': '\\int_{0}^{2}x^{2}\\,dx',
    'integ.area-between': '\\int_{-1}^{2}(4-x^{2})\\,dx',
  };
  return samples[generatorId] ?? 'x';
}
