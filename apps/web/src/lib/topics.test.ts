import { describe, expect, it } from 'vitest';
import { resetTopics, topicState, tuning, withTopic } from './topics';

const none = { topicsOff: [], topicsAlways: [] };

describe('topic settings', () => {
  it('moves a topic between the three states without leaving it in two', () => {
    const off = withTopic(none, 'a', 'off');
    expect(topicState(off, 'a')).toBe('off');
    const always = withTopic(off, 'a', 'always');
    expect(always).toEqual({ topicsOff: [], topicsAlways: ['a'] });
    expect(withTopic(always, 'a', 'on')).toEqual(none);
  });

  it('counts only the topics in front of him', () => {
    const settings = { topicsOff: ['a', 'x'], topicsAlways: ['b', 'y'] };
    expect(tuning(settings, ['a', 'b', 'c'])).toEqual({ off: 1, always: 1 });
  });

  it('resets those topics and leaves the other chapters alone', () => {
    const settings = { topicsOff: ['a', 'x'], topicsAlways: ['b', 'y'] };
    expect(resetTopics(settings, ['a', 'b', 'c'])).toEqual({ topicsOff: ['x'], topicsAlways: ['y'] });
  });
});
