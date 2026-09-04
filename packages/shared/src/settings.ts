export type SessionMode = 'set10' | 'endless' | 'weak' | 'speed';
export type CanvasSurface = 'ruled' | 'dots' | 'blank';

export interface Settings {
  /** Chapter numbers currently selected on the home screen. */
  chapters: number[];
  steps: number;
  difficulty: number;
  mode: SessionMode;
  adaptive: boolean;
  /** Pen draws, finger pans. On by default on tablet. */
  penOnly: boolean;
  wordProblems: boolean;
  reducedMotion: boolean;
  canvasSurface: CanvasSurface;
  deviceName: string;
  backendUrl: string;
  token: string;
  lastSyncedAt: number | null;
  updatedAt: number;
}

export const DEFAULT_SETTINGS: Settings = {
  chapters: [2, 3, 4, 6, 8, 9, 10, 11],
  steps: 3,
  difficulty: 3,
  mode: 'set10',
  adaptive: false,
  penOnly: true,
  wordProblems: true,
  reducedMotion: false,
  canvasSurface: 'ruled',
  deviceName: 'this device',
  backendUrl: '',
  token: '',
  lastSyncedAt: null,
  updatedAt: 0,
};
