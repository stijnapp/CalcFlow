import type { Settings } from '@calcflow/shared';

/** What the home screen lets him say about one topic. */
export type TopicState = 'off' | 'on' | 'always';

type TopicSettings = Pick<Settings, 'topicsOff' | 'topicsAlways'>;

export function topicState(settings: TopicSettings, id: string): TopicState {
  if (settings.topicsOff.includes(id)) return 'off';
  if (settings.topicsAlways.includes(id)) return 'always';
  return 'on';
}

/** The settings patch that puts one topic in one state. */
export function withTopic(settings: TopicSettings, id: string, state: TopicState): TopicSettings {
  const topicsOff = settings.topicsOff.filter((t) => t !== id);
  const topicsAlways = settings.topicsAlways.filter((t) => t !== id);
  if (state === 'off') topicsOff.push(id);
  if (state === 'always') topicsAlways.push(id);
  return { topicsOff, topicsAlways };
}

/**
 * How many of these topics are off and how many always, which is what the home
 * screen shows beside the count. Only the topics in front of him: a choice made
 * for another chapter is not a special setting on this one.
 */
export function tuning(settings: TopicSettings, ids: readonly string[]): { off: number; always: number } {
  return {
    off: ids.filter((id) => settings.topicsOff.includes(id)).length,
    always: ids.filter((id) => settings.topicsAlways.includes(id)).length,
  };
}

/** Every one of these topics back to plain on; the rest are left as they were. */
export function resetTopics(settings: TopicSettings, ids: readonly string[]): TopicSettings {
  const drop = (list: string[]) => list.filter((t) => !ids.includes(t));
  return { topicsOff: drop(settings.topicsOff), topicsAlways: drop(settings.topicsAlways) };
}
