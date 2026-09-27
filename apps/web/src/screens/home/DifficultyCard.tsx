import { useMemo, useState } from 'react';
import { Dices, SlidersHorizontal, X } from 'lucide-react';
import { motion } from 'motion/react';
import { TIERS, TIER_BLURB, TIER_LABEL, chapterTitle, type Tier } from '@calcflow/shared';
import { candidates, draw, makeRng, newSeed, type Generator } from '@calcflow/generators';
import { Eyebrow } from '@/components/Eyebrow';
import { Fit } from '@/components/Fit';
import { Prose } from '@/components/Prose';
import { Tex } from '@/components/Tex';
import { TopicsDialog } from '@/components/TopicsDialog';
import { cx } from '@/lib/cx';
import { resetTopics, tuning, withTopic } from '@/lib/topics';
import { useStore } from '@/state/store';
import { useSessionChapters } from '@/state/useSessionChapters';

const list = (joined: string): string[] => (joined === '' ? [] : joined.split(','));

/**
 * Not an illustration of the kind of thing they might get — one of the actual
 * things they will get, built by the same `draw` the session uses, so changing
 * a chapter or a tier answers "what does that do to the questions?" on the
 * spot. A hand-written table used to stand here; it covered a fifth of the
 * generators and answered `x` for the rest, and it could not have shown the
 * tiers apart at all, because a table has one entry per topic and the whole
 * point of a tier is that the same topic asks differently.
 *
 * The dice are seeded, so the same selection shows the same question until
 * they reroll, and a tier switch shows the same topic asked the other way.
 */
function useSample(chapters: readonly number[], tier: Tier, off: string[], always: string[]) {
  const [seed, setSeed] = useState(() => newSeed());
  // Keyed on what the lists hold rather than on the arrays holding them: a
  // fresh array with the same chapters in it is the same selection, and
  // redrawing on it would swap the question out on every unrelated render.
  const picked = chapters.join(',');
  const offKey = off.join(',');
  const alwaysKey = always.join(',');
  const sample = useMemo(
    () =>
      draw({
        chapters: list(picked).map(Number),
        tier,
        topics: { off: list(offKey), always: list(alwaysKey) },
        random: makeRng(seed).next,
      }),
    [picked, offKey, alwaysKey, tier, seed],
  );
  return { sample, reroll: () => setSeed(newSeed()) };
}

/**
 * Three named tiers rather than a nine-stop dial. The dial implied a precision
 * the generators never had — every one of them turned its number straight back
 * into two or three branches — and a number gave them nothing to expect, where
 * "hard" says what is coming.
 */
export function DifficultyCard({ compact }: { compact?: boolean }) {
  const settings = useStore((s) => s.settings);
  const patchSettings = useStore((s) => s.patchSettings);
  const chapters = useSessionChapters();
  const every = candidates({ chapters, tier: settings.tier });
  const [picking, setPicking] = useState(false);

  return (
    <section className="flex shrink-0 flex-col gap-4 rounded-2xl border border-border bg-card px-5 py-4.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Eyebrow className="text-xs">DIFFICULTY</Eyebrow>
        <span className="text-[13px] text-faint">{TIER_BLURB[settings.tier]}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TIERS.map((t) => (
          <TierButton
            key={t}
            tier={t}
            active={settings.tier === t}
            onPick={() => patchSettings({ tier: t })}
          />
        ))}
      </div>
      <SampleCard every={every} onPickTopics={() => setPicking(true)} />

      <TopicsDialog
        open={picking}
        onClose={() => setPicking(false)}
        topics={every}
        onSet={(id, state) => patchSettings(withTopic(settings, id, state))}
        onReset={() => patchSettings(resetTopics(settings, every.map((g) => g.id)))}
        compact={compact}
      />
    </section>
  );
}

function TierButton({ tier, active, onPick }: { tier: Tier; active: boolean; onPick(): void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      onClick={onPick}
      aria-pressed={active}
      className={cx(
        'rounded-md border py-2.5 text-sm font-medium transition-colors',
        active
          ? 'border-accent bg-accent/10 text-ink'
          : 'border-edge bg-page text-muted hover:border-rail',
      )}
    >
      {TIER_LABEL[tier]}
    </motion.button>
  );
}

function SampleCard({ every, onPickTopics }: { every: Generator[]; onPickTopics(): void }) {
  const chapters = useSessionChapters();
  const tier = useStore((s) => s.settings.tier);
  const off = useStore((s) => s.settings.topicsOff);
  const always = useStore((s) => s.settings.topicsAlways);
  const { sample, reroll } = useSample(chapters, tier, off, always);
  const pool = candidates({ chapters, tier, topics: { off, always } });

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-md border border-edge bg-page px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <Eyebrow className="text-xs">SAMPLE</Eyebrow>
        {sample && (
          <span className="min-w-0 truncate text-[13px] text-near-ink">{sample.instruction}</span>
        )}
        {sample && (
          <button
            onClick={reroll}
            aria-label="Draw another sample"
            className="-my-1 ml-auto grid size-7 shrink-0 place-items-center rounded-md text-faint hover:bg-raised hover:text-ink"
          >
            <Dices className="size-4" />
          </button>
        )}
      </div>

      {sample ? (
        <motion.div key={sample.seed} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
          {sample.promptText && (
            <Prose className="mb-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink2">
              {sample.promptText}
            </Prose>
          )}
          <Fit className="text-xl">
            <Tex>{sample.prompt}</Tex>
          </Fit>
        </motion.div>
      ) : (
        <span className="text-[13px] text-near-ink">
          {chapters.length === 0 ? 'Pick a chapter to see one' : 'No topic asks this tier yet'}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted">
        {sample && <span className="text-faint">{chapterTitle(sample.chapter)}</span>}
        <div className="ml-auto flex items-center gap-2">
          <TunedChip every={every} />
          <button
            onClick={onPickTopics}
            disabled={every.length === 0}
            aria-haspopup="dialog"
            className="-my-1 flex items-center gap-1.5 rounded-md py-1 hover:text-ink disabled:pointer-events-none"
          >
            {pool.length} {pool.length === 1 ? 'topic asks' : 'topics ask'} this
            {every.length > 0 && <SlidersHorizontal className="size-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Says a choice from last time is still in force, and undoes it. */
function TunedChip({ every }: { every: Generator[] }) {
  const settings = useStore((s) => s.settings);
  const patchSettings = useStore((s) => s.patchSettings);
  const ids = every.map((g) => g.id);
  const tuned = tuning(settings, ids);
  const label = [tuned.off > 0 && `${tuned.off} off`, tuned.always > 0 && `${tuned.always} always`]
    .filter(Boolean)
    .join(' · ');
  if (!label) return null;

  return (
    <span className="flex items-center rounded-full bg-accent/12 pl-2.5 text-xs text-accent">
      {label}
      <button
        onClick={() => patchSettings(resetTopics(settings, ids))}
        aria-label="Back to all topics"
        className="grid size-6 place-items-center rounded-full hover:text-ink"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
