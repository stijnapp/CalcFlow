import { ArrowRight, BarChart3, BookOpen, Flame, Settings as SettingsIcon } from 'lucide-react';
import { CHAPTERS, type SessionMode } from '@calcflow/shared';
import { candidates } from '@calcflow/generators';
import { Eyebrow } from '@/components/Eyebrow';
import { Slider } from '@/components/Slider';
import { Tex } from '@/components/Tex';
import { Toggle } from '@/components/Toggle';
import { cx } from '@/lib/cx';
import { useStore } from '@/state/store';

const MODES: Array<{ id: SessionMode; label: string; meta(n: number): string }> = [
  { id: 'set10', label: 'Set of 10', meta: () => '~12 min' },
  { id: 'endless', label: 'Endless', meta: () => 'no end' },
  { id: 'weak', label: 'Weak spots', meta: (n) => `${n} flagged` },
  { id: 'speed', label: 'Build speed', meta: (n) => `${n} slow topics` },
];

export function Home({ compact }: { compact?: boolean }) {
  const settings = useStore((s) => s.settings);
  const stats = useStore((s) => s.stats);
  const store = useStore();

  const pool = candidates({
    chapters: settings.chapters,
    steps: settings.steps,
    difficulty: settings.difficulty,
  });
  const sample = pool[0];
  const flagged = stats.byChapter.filter((c) => c.attempts >= 3 && c.mastery < 70).length;
  const slow = stats.byChapter.filter((c) => c.attempts >= 3 && c.speed === 'slow').length;

  return (
    <div className={cx('flex h-full flex-col gap-6', compact ? 'scroll-y px-5 py-4' : 'px-11 pb-10 pt-6')}>
      <div className="flex flex-wrap items-end gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className={cx('font-semibold tracking-[-0.02em]', compact ? 'text-2xl' : 'text-[32px]')}>
            Ready to practice
          </h1>
          <p className="text-[15px] text-muted">
            Nine chapters live. Every problem is generated on-device.
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          {stats.streak > 0 && (
            <span className="flex items-center gap-2.5 rounded-full border border-border bg-card px-4 py-2">
              <Flame className="size-[15px] text-accent" />
              <span className="text-sm text-ink2">{stats.streak}-day streak</span>
            </span>
          )}
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
          <button
            onClick={() => store.go('settings')}
            aria-label="Settings"
            className="grid size-10 place-items-center rounded-md border border-border bg-card text-muted hover:text-ink"
          >
            <SettingsIcon className="size-[17px]" />
          </button>
        </div>
      </div>

      <section className="flex flex-col gap-3.5">
        <div className="flex items-center gap-3">
          <Eyebrow className="text-xs">CHAPTERS</Eyebrow>
          <div className="h-px flex-1 bg-line" />
          <span className="text-[13px] text-muted">{settings.chapters.length} selected</span>
        </div>

        <div className={cx('grid gap-3', compact ? 'grid-cols-2' : 'grid-cols-5')}>
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
              <button
                key={ch.n}
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
              </button>
            );
          })}
        </div>
      </section>

      <div className={cx('flex gap-4.5', compact ? 'flex-col' : 'items-stretch')}>
        <div className="flex flex-1 flex-col gap-6 rounded-2xl border border-border bg-card px-[26px] py-6">
          <Slider
            label="Steps"
            hint="how many operations are chained"
            value={settings.steps}
            onChange={(steps) => store.patchSettings({ steps })}
          />
          <Slider
            label="Difficulty"
            hint="how ugly the numbers get"
            value={settings.difficulty}
            onChange={(difficulty) => store.patchSettings({ difficulty })}
          />
          <div className="mt-auto flex flex-wrap items-center gap-3.5 rounded-md border border-edge bg-page px-4 py-3.5">
            <Eyebrow className="text-xs">SAMPLE</Eyebrow>
            {sample ? (
              <span className="text-xl">
                <Tex>{sampleTex(sample.id)}</Tex>
              </span>
            ) : (
              <span className="text-[13px] text-near-ink">No topic covers this cell yet</span>
            )}
            <span className="ml-auto text-[13px] text-muted">
              {pool.length} {pool.length === 1 ? 'topic covers' : 'topics cover'} this cell
            </span>
          </div>
        </div>

        <div className={cx('flex flex-col gap-4.5', compact ? '' : 'w-[380px] shrink-0')}>
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-5 py-4.5">
            <Eyebrow className="text-xs">MODE</Eyebrow>
            <div className="flex flex-col gap-2">
              {MODES.map((mode) => {
                const active = settings.mode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => store.patchSettings({ mode: mode.id })}
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
                    <span className="text-sm font-medium">{mode.label}</span>
                    <span className="ml-auto text-xs text-faint">
                      {mode.meta(mode.id === 'weak' ? flagged : slow)}
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

          <button
            onClick={() => store.startSession(settings.mode)}
            className="mt-auto flex h-[68px] items-center justify-center gap-3 rounded-xl bg-accent text-[19px] font-semibold text-on-accent transition-colors hover:bg-accent-hi"
          >
            Start {MODES.find((m) => m.id === settings.mode)!.label.toLowerCase()}
            <ArrowRight className="size-[18px]" />
          </button>
        </div>
      </div>
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
