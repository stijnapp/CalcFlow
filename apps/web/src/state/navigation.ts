export type Screen = 'home' | 'practice' | 'summary' | 'stats' | 'settings' | 'rules' | 'saved';

export const SCREEN_PATH: Record<Screen, string> = {
  home: '/',
  practice: '/practice',
  summary: '/summary',
  stats: '/stats',
  settings: '/settings',
  rules: '/rules',
  saved: '/saved',
};

type Navigate = (to: string, opts?: { replace?: boolean }) => void;

/**
 * The router owns the URL; the store only asks for a move. Bound once by the
 * shell so `go('stats')` and the device back button end up in the same history.
 */
let navigateFn: Navigate | null = null;

export function bindNavigate(fn: Navigate | null): void {
  navigateFn = fn;
}

export function navigate(to: string, opts?: { replace?: boolean }): void {
  navigateFn?.(to, opts);
}
