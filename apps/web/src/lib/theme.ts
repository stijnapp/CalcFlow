import { useSyncExternalStore } from 'react';
import type { Theme } from '@calcflow/shared';

/** What is actually on screen: a theme of "device" comes out as one of these. */
export type Shade = 'light' | 'dark';

/**
 * The last choice, kept outside the database too. The settings only arrive once
 * the app has loaded, and the page is painted before that; `index.html` reads
 * this to paint it in the right colours from the first frame.
 */
const CACHE_KEY = 'calcflow.theme';
const LIGHT_QUERY = '(prefers-color-scheme: light)';
/** The status bar is painted in the page colour, so it reads as part of the app. */
const BAR: Record<Shade, string> = { dark: '#141210', light: '#f3efe9' };

let chosen: Theme = cachedTheme();
const listeners = new Set<() => void>();

function cachedTheme(): Theme {
  try {
    const theme = localStorage.getItem(CACHE_KEY);
    if (theme === 'light' || theme === 'dark') return theme;
  } catch {
    // No storage: the device decides, as it does for someone new.
  }
  return 'system';
}

export function shadeOf(theme: Theme, deviceIsLight: boolean): Shade {
  if (theme === 'system') return deviceIsLight ? 'light' : 'dark';
  return theme;
}

function deviceIsLight(): boolean {
  return window.matchMedia?.(LIGHT_QUERY).matches ?? false;
}

export function currentShade(): Shade {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function apply(): void {
  const shade = shadeOf(chosen, deviceIsLight());
  const root = document.documentElement;
  if (root.dataset.theme === shade) return;
  root.dataset.theme = shade;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR[shade]);
  for (const fn of listeners) fn();
}

/** Follow the device from now on, for as long as the choice is "device". */
export function watchTheme(): void {
  window.matchMedia?.(LIGHT_QUERY).addEventListener('change', apply);
}

export function setTheme(theme: Theme): void {
  chosen = theme;
  try {
    localStorage.setItem(CACHE_KEY, theme);
  } catch {
    // Private mode: only the first frame after a reload is in the wrong colours.
  }
  apply();
}

/**
 * `--color-shadow` at a strength, for what `motion` animates: it cannot tween a
 * CSS variable, only a colour it can read the channels of.
 */
export function shadowColour(shade: Shade, alpha: number): string {
  return shade === 'light' ? `rgba(58,42,26,${alpha * 0.28})` : `rgba(0,0,0,${alpha})`;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The shade on screen, for what cannot follow a CSS variable — the canvas. */
export function useShade(): Shade {
  return useSyncExternalStore(subscribe, currentShade, () => 'dark');
}
