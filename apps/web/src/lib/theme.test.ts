import { describe, expect, it } from 'vitest';
import { palette } from '@/canvas/palette';
import { shadeOf, shadowColour } from './theme';

describe('shadeOf', () => {
  it('follows the device only when the choice is "device"', () => {
    expect(shadeOf('system', true)).toBe('light');
    expect(shadeOf('system', false)).toBe('dark');
  });

  it('keeps a chosen theme whatever the device does', () => {
    expect(shadeOf('dark', true)).toBe('dark');
    expect(shadeOf('light', false)).toBe('light');
  });
});

describe('shadowColour', () => {
  it('is black in the dark and a faint warm brown on paper', () => {
    expect(shadowColour('dark', 0.6)).toBe('rgba(0,0,0,0.6)');
    expect(shadowColour('light', 0)).toBe('rgba(58,42,26,0)');
  });
});

describe('palette', () => {
  it('paints dark where there is no page to read the theme from', () => {
    expect(palette().paper).toBe('#171512');
  });
});
