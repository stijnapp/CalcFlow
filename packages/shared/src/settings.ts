import type { Tier } from './tiers.js';

export type SessionMode = 'set10' | 'endless' | 'weak' | 'speed';
export type CanvasSurface = 'ruled' | 'dots' | 'blank';

/** A notation key he wrote himself: what it shows, and what it types. */
export interface CustomKey {
  id: string;
  /** Rendered on the key face. */
  tex: string;
  /** Inserted verbatim at the caret. */
  insert: string;
}

export interface Settings {
  /** Chapter numbers currently selected on the home screen. May be empty. */
  chapters: number[];
  /** How hard the problems come out. See `Tier`. */
  tier: Tier;
  mode: SessionMode;
  /** How many problems a finite set holds. Endless ignores it. */
  setLength: number;
  adaptive: boolean;
  /** Pen draws, finger pans. On by default on tablet. */
  penOnly: boolean;
  reducedMotion: boolean;
  canvasSurface: CanvasSurface;
  /** Ids of the LaTeX insert buttons shown above the answer field, in order. */
  keys: string[];
  /** His own additions to that pool, referenced from `keys` by id. */
  customKeys: CustomKey[];
  /** Stroke width for the one pen, in CSS pixels at full pressure. */
  penWidth: number;
  /** Blank means "whatever this browser calls itself" — see `detectDeviceName`. */
  deviceName: string;
  backendUrl: string;
  token: string;
  lastSyncedAt: number | null;
  updatedAt: number;
}

/** The lengths the stepper walks between, so a tap is never a typo. */
export const SET_LENGTHS = [3, 5, 10, 15, 20, 30, 50] as const;

export const DEFAULT_KEYS = [
  'frac',
  'sqrt',
  'power',
  'nthroot',
  'ddx',
  'integral',
  'ln',
  'pi',
  'plusc',
];

export const DEFAULT_SETTINGS: Settings = {
  chapters: [],
  tier: 'medium',
  mode: 'set10',
  setLength: 10,
  adaptive: false,
  penOnly: true,
  reducedMotion: false,
  canvasSurface: 'ruled',
  keys: DEFAULT_KEYS,
  customKeys: [],
  penWidth: 3.6,
  deviceName: '',
  backendUrl: '',
  token: '',
  lastSyncedAt: null,
  updatedAt: 0,
};
