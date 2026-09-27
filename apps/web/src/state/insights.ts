import { paceOf } from './pace';
import type { Insight, Stats } from './stats';

type Read = (s: Stats) => Insight | null;

function shakyRule(s: Stats): Insight | null {
  const shaky = s.shakyRules[0];
  if (!shaky || shaky.n < 3) return null;
  return {
    id: 'rule',
    text: `${shaky.n} of your confident wrong answers were ${shaky.title.toLowerCase()} problems. That is one rule remembered wrong, not a chapter to redo.`,
  };
}

function calibration(s: Stats): Insight | null {
  const sure = s.calibration.find((c) => c.confidence === 'sure');
  if (!sure || sure.n < 15 || sure.rate >= 85) return null;
  return {
    id: 'calibration',
    text: `When you say you are sure you are right ${sure.rate}% of the time. Treat "sure" as a claim worth checking before you submit.`,
  };
}

function nearMisses(s: Stats): Insight | null {
  const near = s.errorMix.find((e) => e.nearMiss);
  if (!near || near.n < 4 || near.share < 30) return null;
  return {
    id: 'errors',
    text: `${near.share}% of your recent wrong answers were "${near.label.toLowerCase()}" — the maths was there. Slow down on the last line, not on the working.`,
  };
}

function retention(s: Stats): Insight | null {
  const fresh = s.retention[0];
  const stale = s.retention[3];
  if (!fresh || !stale || fresh.n < 8 || stale.n < 8) return null;
  if (fresh.rate - stale.rate < 15) return null;
  return {
    id: 'retention',
    text: `Topics you have not seen for over a week come back at ${stale.rate}% against ${fresh.rate}% the same day. Revisiting beats pushing on.`,
  };
}

function forgottenTopics(s: Stats): Insight | null {
  const forgotten = s.topics.filter((t) => t.attempts >= 3 && (t.days ?? 0) >= 21);
  if (forgotten.length < 3) return null;
  return {
    id: 'stale',
    text: `${forgotten.length} topics you had started have not come up in three weeks, including ${forgotten[0]!.title.toLowerCase()}.`,
  };
}

function tierGap(s: Stats): Insight | null {
  const hard = s.tiers.find((t) => t.tier === 'hard');
  const medium = s.tiers.find((t) => t.tier === 'medium');
  if (!hard || !medium || hard.n < 12 || medium.n < 12) return null;
  if (medium.rate - hard.rate < 25) return null;
  return {
    id: 'tier',
    text: `Medium sits at ${medium.rate}% and hard at ${hard.rate}%. The gap is the exam, so it is worth spending sets there even while it stings.`,
  };
}

/**
 * Only a real speed-up is worth the sentence, and what it means depends on
 * whether the answers kept up with it.
 */
function pace(s: Stats): Insight | null {
  const quicker = s.byChapter
    .flatMap((c) => (c.trend && c.trend.time <= -20 ? [{ chapter: c.chapter, ...c.trend }] : []))
    .sort((a, b) => a.time - b.time);
  const rushed = quicker.find((t) => paceOf(t) === 'rushing');
  if (rushed) {
    return {
      id: 'rushing',
      text: `Chapter ${rushed.chapter} is ${-rushed.time}% quicker than it was, but ${rushed.rightNow}% right against ${rushed.rightBefore}% before. That is rushing, not fluency.`,
    };
  }
  const fluent = quicker.find((t) => paceOf(t) === 'fluent');
  if (!fluent) return null;
  return {
    id: 'trend',
    text: `Chapter ${fluent.chapter} is ${-fluent.time}% faster than it was and still ${fluent.rightNow}% right. That one is turning into fluency.`,
  };
}

function hintFree(s: Stats): Insight | null {
  if (s.hintFreeOf < 20) return null;
  return {
    id: 'hints',
    text: `You solved ${s.hintFree}% of your last ${s.hintFreeOf} without opening a hint.`,
  };
}

function streak(s: Stats): Insight | null {
  return s.streak >= 3 ? { id: 'streak', text: `${s.streak} days in a row.` } : null;
}

/**
 * The whole reason the extra readouts do not turn into a wall of numbers: they
 * all compete for one sentence, in a fixed order of how much it would change
 * what they practise next, and each one stays silent until it has enough
 * attempts behind it and something other than "about normal" to say.
 */
const READS: readonly Read[] = [
  shakyRule,
  calibration,
  nearMisses,
  retention,
  forgottenTopics,
  tierGap,
  pace,
  hintFree,
  streak,
];

export function readOf(s: Stats): Insight | null {
  for (const read of READS) {
    const insight = read(s);
    if (insight) return insight;
  }
  return null;
}
