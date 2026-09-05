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
  /** 1–9, an index into LEVELS. Drives both steps and difficulty. */
  level: number;
  mode: SessionMode;
  adaptive: boolean;
  /** Pen draws, finger pans. On by default on tablet. */
  penOnly: boolean;
  wordProblems: boolean;
  reducedMotion: boolean;
  canvasSurface: CanvasSurface;
  /** Ids of the LaTeX insert buttons shown above the answer field, in order. */
  keys: string[];
  /** His own additions to that pool, referenced from `keys` by id. */
  customKeys: CustomKey[];
  /** Stroke width for the one pen, in CSS pixels at full pressure. */
  penWidth: number;
  deviceName: string;
  backendUrl: string;
  token: string;
  lastSyncedAt: number | null;
  updatedAt: number;
}

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
  chapters: [2, 3, 4, 6, 8, 9, 10, 11],
  level: 3,
  mode: 'set10',
  adaptive: false,
  penOnly: true,
  wordProblems: true,
  reducedMotion: false,
  canvasSurface: 'ruled',
  keys: DEFAULT_KEYS,
  customKeys: [],
  penWidth: 3.6,
  deviceName: 'this device',
  backendUrl: '',
  token: '',
  lastSyncedAt: null,
  updatedAt: 0,
};
