import { ArrowLeft, Timer, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { Eyebrow } from '@/components/Eyebrow';
import { HoverLabel } from '@/components/HoverLabel';
import { StatsDetail } from '@/components/StatsDetail';
import { cx } from '@/lib/cx';
import { clockTime, duration } from '@/lib/format';
import { useStore } from '@/state/store';
import type { ChapterStat } from '@/state/stats';

export function Stats({ compact }: { compact?: boolean }) {
  const stats = useStore((s) => s.stats);
  const settings = useStore((s) => s.settings);
  const store = useStore();

  const header = (
    <div className="flex shrink-0 items-center gap-4">
      <button
        onClick={() => store.go('home')}
        aria-label="Back"
        className="grid size-10 place-items-center rounded-md border border-border bg-card text-muted hover:text-ink"
      >
        <ArrowLeft className="size-[17px]" />
      </button>
      <h1 className={cx('font-semibold tracking-[-0.02em]', compact ? 'text-[21px]' : 'text-[28px]')}>
        Where you stand
      </h1>
      <span className="font-mono text-xs text-faint">
        {stats.total} ATTEMPTS
        {stats.streak > 1 ? ` · ${stats.streak} DAY STREAK` : ''}
        {settings.lastSyncedAt ? ` · SYNCED ${clockTime(settings.lastSyncedAt)}` : ' · NOT SYNCED'}
      </span>
    </div>
  );

  if (stats.total === 0) {
    return (
      <div className="flex h-full flex-col gap-5 px-10 py-6">
        {header}
        <div className="grid flex-1 place-items-center">
          <div className="flex max-w-[420px] flex-col items-center gap-3 text-center">
            <p className="text-lg font-medium">Nothing tracked yet</p>
            <p className="text-sm leading-relaxed text-muted text-pretty">
              Finish a set and this fills in: mastery per chapter, how long each takes you, and which
              topics you get wrong while feeling sure.
            </p>
            <button
              onClick={() => store.startSession(settings.mode)}
              className="mt-2 rounded-md bg-accent px-6 py-3 font-semibold text-on-accent"
            >
              Start a set
            </button>
          </div>
        </div>
      </div>
    );
  }

  const matrix = stats.matrix;

  /*
   * One sentence, and never two. Eight readouts feed it and they compete rather
   * than stack: the strongest thing the log currently says gets the line, the
   * rest stay folded into "look closer". That is the whole answer to how the
   * screen gains eight metrics without becoming a wall of them.
   */
  const read = stats.read && (
    <p
      className={cx(
        'shrink-0 rounded-lg border border-border bg-card px-5 text-pretty leading-relaxed text-ink2',
        compact ? 'py-3.5 text-[13px]' : 'py-4 text-sm',
      )}
    >
      <span className="mr-2 font-mono text-[11px] tracking-[0.12em] text-accent">THE READ</span>
      {stats.read.text}
    </p>
  );

  const quadrants = (
    <div className="grid grid-cols-2 gap-3">
      <Quadrant label="Sure · right" value={matrix.sureRight} caption="Solid" tone="correct" />
      <Quadrant
        label="Sure · wrong"
        value={matrix.sureWrong}
        caption="Misconceptions — a rule remembered wrong"
        tone="wrong"
      />
      <Quadrant
        label="Unsure · right"
        value={matrix.unsureRight}
        caption="Fragile — right, but not yet trusted"
        tone="plain"
      />
      <Quadrant label="Unsure · wrong" value={matrix.unsureWrong} caption="Gaps" tone="near" />
    </div>
  );

  const mastery = (
    <div
      className={cx(
        'flex flex-col gap-3.5',
        compact ? '' : 'min-w-0 flex-1 rounded-2xl border border-border bg-card px-6 py-5.5',
      )}
    >
      <div className="flex items-center gap-3">
        <Eyebrow className={compact ? 'text-[10px]' : 'text-xs'}>MASTERY BY CHAPTER</Eyebrow>
        <div className="ml-auto flex items-center gap-3 text-xs text-faint">
          <span className="flex items-center gap-1">
            <Zap className="size-3 text-correct" />
            faster
          </span>
          <span className="flex items-center gap-1">
            <Timer className="size-3 text-near" />
            slower
          </span>
        </div>
      </div>

      {/* One row per chapter, and every row the same five columns, so the
          numbers can be read down as well as across. The counts behind the bar
          are a hover away rather than a third line under it. */}
      <div className={cx('flex flex-col', compact ? 'gap-3' : 'flex-1 justify-between')}>
        {stats.byChapter.map((ch) => (
          <HoverLabel key={ch.chapter} label={tally(ch)}>
            {compact ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[11px] text-faint">{ch.chapter}</span>
                  <span className="truncate text-[13px] text-ink2">{ch.title}</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    <SpeedMark stat={ch} />
                    <span className="w-[34px] text-right font-mono text-[11px] text-muted">
                      {ch.recent === 0 ? '—' : `${ch.rightRate}%`}
                    </span>
                  </span>
                </div>
                <Bar stat={ch} />
              </div>
            ) : (
              <div className="grid grid-cols-[16px_minmax(0,1fr)_170px_40px_84px] items-center gap-x-4 py-1">
                <span className="font-mono text-xs text-faint">{ch.chapter}</span>
                <span className="truncate text-sm text-ink2">{ch.title}</span>
                <Bar stat={ch} />
                <span className="text-right font-mono text-xs text-muted">
                  {ch.recent === 0 ? '—' : `${ch.rightRate}%`}
                </span>
                <span className="flex items-center justify-end gap-1.5">
                  <SpeedMark stat={ch} />
                </span>
              </div>
            )}
          </HoverLabel>
        ))}
      </div>
    </div>
  );

  const cards = (
    <div className="flex flex-col gap-3.5">
      {stats.studyNext && (
        <RecommendationCard
          eyebrow="STUDY NEXT"
          tone="accent"
          title={`Ch ${stats.studyNext.chapter} · ${stats.studyNext.title}`}
          body={
            stats.studyNext.confidentWrong > 0
              ? `${stats.studyNext.confidentWrong} of your last ${Math.min(30, stats.studyNext.attempts)} attempts here were confident and wrong — the pattern says a rule is misremembered, not missing.`
              : `Mastery is sitting at ${stats.studyNext.mastery}%. This is the chapter with the most ground to make up.`
          }
          action={`Drill ${settings.setLength} from this topic`}
          onAction={() => store.startSession('set10', { chapters: [stats.studyNext!.chapter] })}
        />
      )}
      {stats.buildSpeed && (
        <RecommendationCard
          eyebrow="THEN BUILD SPEED"
          tone="correct"
          title={`Ch ${stats.buildSpeed.chapter} · ${stats.buildSpeed.title}`}
          body={`You get ${stats.buildSpeed.mastery}% of these right but take ${(stats.buildSpeed.medianMs / (stats.overallMedianMs || 1)).toFixed(1)}× your median time. Accuracy is there; fluency isn't.`}
          action={`Timed set of ${settings.setLength}`}
          onAction={() => store.startSession('speed', { chapters: [stats.buildSpeed!.chapter] })}
        />
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-line px-5 py-3.5">{header}</div>
        <div className="scroll-y flex flex-1 flex-col gap-5 px-5 pb-16 pt-4">
          {read}
          <div className="flex flex-col gap-2.5">
            <Eyebrow className="text-[10px]">CONFIDENCE × CORRECTNESS</Eyebrow>
            {quadrants}
          </div>
          {mastery}
          {cards}
          <StatsDetail stats={stats} compact />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 px-10 pb-8 pt-5">
      {header}
      {read}
      {/* Two columns, not three: mastery reads across, and the grid together
          with the two recommendations it produces belong on the right. */}
      <div className="flex min-h-0 flex-1 gap-5">
        {mastery}
        <div className="scroll-y flex w-[390px] shrink-0 flex-col gap-3.5 pb-10">
          <Eyebrow className="text-xs">CONFIDENCE × CORRECTNESS</Eyebrow>
          {quadrants}
          {cards}
          <StatsDetail stats={stats} />
        </div>
      </div>
    </div>
  );
}

/**
 * How much of the recent window he got right, and nothing else. A stacked bar
 * gave equal weight to the wrong half, which reads as an accusation on the very
 * chapters that most need going back to; one bar that fills as he improves is
 * the same information pointed the right way round.
 */
const BAND = { good: 'bg-correct', fair: 'bg-near', poor: 'bg-wrong' } as const;

function Bar({ stat }: { stat: ChapterStat }) {
  const band = stat.rightRate >= 70 ? 'good' : stat.rightRate >= 40 ? 'fair' : 'poor';
  return (
    <span className="flex h-2 overflow-hidden rounded-full bg-line">
      <motion.span
        className={cx('block h-2 rounded-full', BAND[band])}
        initial={{ width: 0 }}
        animate={{ width: stat.recent === 0 ? 0 : `${stat.rightRate}%` }}
        transition={{ type: 'spring', stiffness: 220, damping: 30 }}
      />
    </span>
  );
}

/** The counts in words, for the label that comes up over a chapter. */
function tally(stat: ChapterStat): string {
  if (stat.recent === 0) return `${stat.title} — not started`;
  const parts = [`${stat.correct} right`, `${stat.wrong} wrong`];
  if (stat.confidentWrong > 0) parts.push(`${stat.confidentWrong} sure but wrong`);
  return `Last ${stat.recent}: ${parts.join(' · ')}`;
}

/**
 * Speed is the second signal after correctness: right-but-slow is a fluency
 * problem, and worth a different kind of practice than right-but-wrong.
 */
function SpeedMark({ stat }: { stat: ChapterStat }) {
  if (stat.attempts === 0) return <span className="font-mono text-[11px] text-ghost">—</span>;
  return (
    <>
      {stat.speed === 'fast' && <Zap className="size-3 text-correct" />}
      {stat.speed === 'slow' && <Timer className="size-3 text-near" />}
      {stat.speed === 'par' && <span className="h-px w-3 bg-rail" />}
      <span
        className={cx(
          'font-mono text-[11px]',
          stat.speed === 'fast' ? 'text-correct' : stat.speed === 'slow' ? 'text-near' : 'text-faint',
        )}
      >
        {duration(stat.medianMs)}
      </span>
    </>
  );
}

const QUADRANT_TONE = {
  correct: 'border-border bg-card text-correct',
  wrong: 'border-wrong bg-wrong/10 text-wrong',
  near: 'border-near bg-near/10 text-near-ink',
  plain: 'border-border bg-card text-ink2',
} as const;

function Quadrant({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: number;
  caption: string;
  tone: keyof typeof QUADRANT_TONE;
}) {
  const muted = tone === 'wrong' ? 'text-wrong-ink' : tone === 'near' ? 'text-near-ink' : 'text-faint';
  return (
    /* The count is the thing being read; what to call that count is the caption
       under it, and what it means for him is a hover away. */
    <HoverLabel label={caption} side="top">
      <div
        className={cx(
          'flex flex-col justify-center gap-1.5 rounded-lg border p-5',
          QUADRANT_TONE[tone],
        )}
      >
        <span className="text-[38px] font-semibold leading-none">{value}</span>
        <span className={cx('text-[13px]', muted)}>{label}</span>
      </div>
    </HoverLabel>
  );
}

function RecommendationCard({
  eyebrow,
  tone,
  title,
  body,
  action,
  onAction,
}: {
  eyebrow: string;
  tone: 'accent' | 'correct';
  title: string;
  body: string;
  action: string;
  onAction(): void;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        {tone === 'correct' && <Timer className="size-3.5 text-correct" />}
        <span
          className={cx(
            'font-mono text-[11px] tracking-[0.12em]',
            tone === 'accent' ? 'text-accent' : 'text-correct',
          )}
        >
          {eyebrow}
        </span>
      </div>
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="text-[13px] leading-relaxed text-muted text-pretty">{body}</p>
      <button
        onClick={onAction}
        className="mt-1.5 grid h-[46px] place-items-center rounded-sm border border-strong bg-overlay text-sm hover:border-accent"
      >
        {action}
      </button>
    </div>
  );
}
