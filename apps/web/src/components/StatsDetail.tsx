import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cx } from '@/lib/cx';
import { duration } from '@/lib/format';
import type { Stats } from '@/state/stats';
import { Eyebrow } from './Eyebrow';
import { HoverLabel } from './HoverLabel';

/**
 * Everything the stats screen knows that is not one of the three things it
 * leads with. It is one fold rather than a second screen, and every section
 * inside it stays shut until it has enough attempts behind it to say something
 * that is not noise — so the usual state of this panel is short, and an empty
 * one is a correct answer rather than a bug.
 */
export function StatsDetail({ stats, compact }: { stats: Stats; compact?: boolean }) {
  const [open, setOpen] = useState(false);

  const sections = [
    calibration(stats),
    errorMix(stats),
    shakyRules(stats),
    retention(stats),
    hints(stats),
    tiers(stats),
    trends(stats),
    freshness(stats),
  ].filter((s): s is Section => s !== null);

  if (sections.length === 0) return null;

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-left text-[13px] text-ink2 hover:border-accent"
      >
        <span>{open ? 'Hide the detail' : 'Look closer'}</span>
        <span className="font-mono text-[11px] text-faint">{sections.length}</span>
        <ChevronDown className={cx('ml-auto size-4 text-muted transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 34 }}
            className="overflow-hidden"
          >
            <div className={cx('flex flex-col gap-5 pt-4', compact ? '' : 'gap-6')}>
              {sections.map((section) => (
                <div key={section.title} className="flex flex-col gap-2.5">
                  <Eyebrow className={compact ? 'text-[10px]' : undefined}>{section.title}</Eyebrow>
                  <p className="text-[12px] leading-relaxed text-faint text-pretty">{section.blurb}</p>
                  {section.body}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Section {
  title: string;
  blurb: string;
  body: React.ReactNode;
}

/** One labelled bar. Everything in here is a share of something, so they all look alike. */
function Meter({
  label,
  value,
  trailing,
  tone = 'plain',
  hint,
}: {
  label: string;
  /** 0–100. */
  value: number;
  trailing: string;
  tone?: 'plain' | 'good' | 'near' | 'bad';
  hint?: string;
}) {
  const fill =
    tone === 'good' ? 'bg-correct' : tone === 'bad' ? 'bg-wrong' : tone === 'near' ? 'bg-near' : 'bg-rail';
  const row = (
    <div className="grid grid-cols-[minmax(0,1fr)_72px_46px] items-center gap-x-3">
      <span className="truncate text-[13px] text-ink2">{label}</span>
      <span className="flex h-1.5 overflow-hidden rounded-full bg-line">
        <span className={cx('block h-1.5 rounded-full', fill)} style={{ width: `${value}%` }} />
      </span>
      <span className="text-right font-mono text-[11px] text-muted">{trailing}</span>
    </div>
  );
  return hint ? <HoverLabel label={hint}>{row}</HoverLabel> : row;
}

function band(rate: number): 'good' | 'near' | 'bad' {
  return rate >= 70 ? 'good' : rate >= 40 ? 'near' : 'bad';
}

function calibration(stats: Stats): Section | null {
  const rows = stats.calibration.filter((c) => c.n >= 5);
  if (rows.length < 2) return null;
  return {
    title: 'WHAT YOUR CONFIDENCE IS WORTH',
    blurb: 'How often each answer to "how sure are you?" turned out to be right.',
    body: (
      <div className="flex flex-col gap-2">
        {rows.map((c) => (
          <Meter
            key={c.confidence}
            label={c.label}
            value={c.rate}
            trailing={`${c.rate}%`}
            tone={band(c.rate)}
            hint={`${c.right} of ${c.n} right`}
          />
        ))}
      </div>
    ),
  };
}

function errorMix(stats: Stats): Section | null {
  if (stats.errorMix.length === 0) return null;
  const formOnly = stats.errorMix.filter((e) => e.nearMiss).reduce((sum, e) => sum + e.share, 0);
  return {
    title: 'WHERE THE WRONG ANSWERS GO',
    blurb: `${formOnly}% of them were the right maths in the wrong form — worth separating from the ones you actually got wrong.`,
    body: (
      <div className="flex flex-col gap-2">
        {stats.errorMix.map((e) => (
          <Meter
            key={e.errorClass}
            label={e.label}
            value={e.share}
            trailing={`${e.share}%`}
            tone={e.nearMiss ? 'near' : 'bad'}
            hint={`${e.n} of your recent wrong answers`}
          />
        ))}
      </div>
    ),
  };
}

function shakyRules(stats: Stats): Section | null {
  if (stats.shakyRules.length === 0) return null;
  return {
    title: 'SURE, AND WRONG — BY RULE',
    blurb: 'Rolled up by the rule the problem turned on rather than by chapter, because a rule is a thing you can go and reread.',
    body: (
      <div className="flex flex-col gap-1.5">
        {stats.shakyRules.map((r) => (
          <div key={r.ruleId} className="flex items-baseline gap-3">
            <span className="truncate text-[13px] text-ink2">{r.title}</span>
            <span className="ml-auto font-mono text-[11px] text-wrong">×{r.n}</span>
          </div>
        ))}
      </div>
    ),
  };
}

function retention(stats: Stats): Section | null {
  const rows = stats.retention.filter((r) => r.n >= 5);
  if (rows.length < 2) return null;
  return {
    title: 'COMING BACK TO A TOPIC',
    blurb: 'Accuracy against how long it had been since that exact topic last came up.',
    body: (
      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <Meter
            key={r.label}
            label={r.label}
            value={r.rate}
            trailing={`${r.rate}%`}
            tone={band(r.rate)}
            hint={`${r.n} attempts`}
          />
        ))}
      </div>
    ),
  };
}

function hints(stats: Stats): Section | null {
  if (stats.hintFreeOf < 10) return null;
  const chapters = stats.byChapter.filter((c) => c.recent >= 5).sort((a, b) => a.hintFree - b.hintFree);
  return {
    title: 'STANDING ON YOUR OWN',
    blurb: `${stats.hintFree}% of your last ${stats.hintFreeOf} went in without the hint panel being opened. Hint use falling is progress the accuracy number hides.`,
    body: (
      <div className="flex flex-col gap-2">
        {chapters.slice(0, 4).map((c) => (
          <Meter
            key={c.chapter}
            label={`${c.chapter} · ${c.title}`}
            value={c.hintFree}
            trailing={`${c.hintFree}%`}
            tone={band(c.hintFree)}
            hint={`unaided in ${c.hintFree}% of the last ${c.recent}`}
          />
        ))}
      </div>
    ),
  };
}

function tiers(stats: Stats): Section | null {
  const rows = stats.tiers.filter((t) => t.n >= 5);
  if (rows.length < 2) return null;
  return {
    title: 'BY DIFFICULTY',
    blurb: '90% at easy and 40% at hard is a different problem from 65% flat, and wants different practice.',
    body: (
      <div className="flex flex-col gap-2">
        {rows.map((t) => (
          <Meter
            key={t.tier}
            label={t.label}
            value={t.rate}
            trailing={`${t.rate}%`}
            tone={band(t.rate)}
            hint={`${t.n} attempts`}
          />
        ))}
      </div>
    ),
  };
}

function trends(stats: Stats): Section | null {
  const rows = stats.byChapter.filter((c) => c.trend !== null).sort((a, b) => a.trend! - b.trend!);
  if (rows.length === 0) return null;
  return {
    title: 'GETTING FASTER, GETTING SLOWER',
    blurb: 'Your last ten in a chapter against the twenty before them. A single median cannot show a direction.',
    body: (
      <div className="flex flex-col gap-1.5">
        {rows.map((c) => (
          <div key={c.chapter} className="flex items-baseline gap-3">
            <span className="font-mono text-[11px] text-faint">{c.chapter}</span>
            <span className="truncate text-[13px] text-ink2">{c.title}</span>
            <span className="ml-auto font-mono text-[11px] text-faint">{duration(c.medianMs)}</span>
            <span
              className={cx(
                'w-[48px] text-right font-mono text-[11px]',
                c.trend! <= -10 ? 'text-correct' : c.trend! >= 10 ? 'text-near' : 'text-muted',
              )}
            >
              {c.trend! > 0 ? '+' : ''}
              {c.trend}%
            </span>
          </div>
        ))}
      </div>
    ),
  };
}

/** Days since a topic last came up, as one square each. */
const FRESH = [
  { upTo: 7, className: 'bg-correct', label: 'this week' },
  { upTo: 21, className: 'bg-near', label: 'this month' },
  { upTo: Infinity, className: 'bg-wrong', label: 'over three weeks' },
] as const;

function freshness(stats: Stats): Section | null {
  const seen = stats.topics.filter((t) => t.attempts > 0);
  if (seen.length < 4) return null;
  const cold = seen.filter((t) => (t.days ?? 0) >= 21).length;
  return {
    title: 'TOPIC FRESHNESS',
    blurb: `One square per topic, shaded by how long since it came up. ${cold === 0 ? 'Nothing has gone cold.' : `${cold} have gone cold.`} A chapter average can look healthy while one of its topics has not been seen in a month.`,
    body: (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1">
          {stats.topics.map((t) => {
            const tone = t.days === null ? null : FRESH.find((f) => t.days! < f.upTo)!;
            return (
              <HoverLabel
                key={t.generatorId}
                label={
                  t.days === null
                    ? `${t.title} — never seen`
                    : `${t.title} — ${t.days === 0 ? 'today' : `${t.days} d ago`}, ${t.rate}% right`
                }
              >
                <span
                  className={cx(
                    'size-3 rounded-[3px]',
                    tone ? tone.className : 'border border-dashed border-rail',
                  )}
                />
              </HoverLabel>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-faint">
          {FRESH.map((f) => (
            <span key={f.label} className="flex items-center gap-1.5">
              <span className={cx('size-2 rounded-[2px]', f.className)} />
              {f.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] border border-dashed border-rail" />
            never
          </span>
        </div>
      </div>
    ),
  };
}
