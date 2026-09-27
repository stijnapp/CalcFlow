/**
 * The colours the canvas paints with. A canvas cannot read a CSS variable, so
 * these mirror the stylesheet's tokens by hand, one set per theme: `paper` is
 * `--color-canvas` and `accent` is `--color-accent`.
 */
export interface Palette {
  paper: string;
  ink: string;
  /** The ruled lines and the dots of the two paper styles. */
  rule: string;
  dot: string;
  axis: string;
  grid: string;
  gridMajor: string;
  label: string;
  /** A graph question's own marks — there before they draw anything. */
  given: string;
  /** The answer revealed over the sketch, and the lasso. */
  accent: string;
  /** Inside the lasso while it is being drawn. */
  accentWash: string;
  /** An arrow still being dragged out, before it is let go. */
  pending: string;
}

const DARK: Palette = {
  paper: '#171512',
  ink: '#efe7db',
  rule: '#211d19',
  dot: '#2a2521',
  axis: '#6f665c',
  grid: '#241f1b',
  gridMajor: '#2f2823',
  label: '#8a8178',
  given: '#7f9f93',
  accent: '#f5a524',
  accentWash: 'rgba(245,165,36,0.08)',
  pending: '#a89e92',
};

const LIGHT: Palette = {
  paper: '#fdfbf7',
  ink: '#29221b',
  rule: '#e9e2d7',
  dot: '#d8cfc3',
  axis: '#8c8174',
  grid: '#eee8de',
  gridMajor: '#e0d7ca',
  label: '#857a6d',
  given: '#3f7a66',
  accent: '#c27803',
  accentWash: 'rgba(194,120,3,0.08)',
  pending: '#7d7266',
};

/** Whichever theme the page is showing; the dark one outside a browser. */
export function palette(): Palette {
  if (typeof document === 'undefined') return DARK;
  return document.documentElement.dataset.theme === 'light' ? LIGHT : DARK;
}
