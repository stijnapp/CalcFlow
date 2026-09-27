export interface Trend {
  /** Percent change in median time — negative is faster. */
  time: number;
  /** 0–100 right, before and now. Faster only counts while these hold. */
  rightBefore: number;
  rightNow: number;
}

/**
 * What a change of pace amounts to once the answers are next to it. Faster and
 * still right is fluency; faster and falling off is rushing, and a chapter
 * clicked through on guesses is only faster.
 */
export type Pace = 'fluent' | 'faster' | 'rushing' | 'steady' | 'slower';

export function paceOf(t: Trend): Pace {
  if (t.time > -10) return t.time >= 10 ? 'slower' : 'steady';
  if (t.rightNow <= t.rightBefore - 20) return 'rushing';
  return t.rightNow >= 70 && t.rightNow >= t.rightBefore - 10 ? 'fluent' : 'faster';
}
