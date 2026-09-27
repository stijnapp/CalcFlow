import { DEFAULT_SETTINGS, type Attempt, type Settings } from '@calcflow/shared';
import type { StateCreator } from 'zustand';
import {
  clearStoredSession,
  deleteAttempts,
  loadAttempts,
  loadSettings,
  loadStoredSession,
  putAttempts,
  queuedIds,
  saveSettings,
} from '../db';
import { SCREEN_PATH, navigate } from '../navigation';
import { reviveSession } from '../persist';
import { sampleAttempts } from '../sample';
import { isComplete, type Session } from '../session';
import { computeStats, type Stats } from '../stats';
import type { Store } from '../store';
import { DEVICE_LOCAL } from '../sync';
import { startAutoSync } from './sync';

export interface AppSlice {
  ready: boolean;
  settings: Settings;
  attempts: Attempt[];
  stats: Stats;

  init(): Promise<void>;
  patchSettings(patch: Partial<Settings>): void;
  toggleChapter(n: number): void;
  replaceAttempts(attempts: Attempt[]): Promise<void>;
  /** Fills the stats screen with a believable history, for judging the design. */
  loadSample(): Promise<void>;
  /** Throws away everything the server has not seen yet, and only that. */
  clearUnsynced(): Promise<void>;
}

interface Local {
  settings: Settings;
  attempts: Attempt[];
  session: Session | null;
}

async function loadLocal(): Promise<Local> {
  try {
    const [settings, attempts, stored] = await Promise.all([
      loadSettings(),
      loadAttempts(),
      loadStoredSession(),
    ]);
    const session = stored ? reviveSession(stored) : null;
    // A set with every answer in has nothing left to come back to: it was
    // finished, and reopening the app on its last verdict read as a question
    // still waiting for them.
    if (session && isComplete(session)) {
      void clearStoredSession();
      return { settings, attempts, session: null };
    }
    return { settings, attempts, session };
  } catch (err) {
    // A store that will not open — private mode, a corrupted database — must
    // still leave a usable app rather than a splash screen that never ends.
    console.error('CalcFlow: starting with an empty local store', err);
    return { settings: DEFAULT_SETTINGS, attempts: [], session: null };
  }
}

const LOCAL_FIELD = new Set<string>(DEVICE_LOCAL);

export const createAppSlice: StateCreator<Store, [], [], AppSlice> = (set, get) => ({
  ready: false,
  settings: DEFAULT_SETTINGS,
  attempts: [],
  stats: computeStats([]),

  async init() {
    const { settings, attempts, session } = await loadLocal();
    set({ settings, attempts, stats: computeStats(attempts), session, ready: true });
    void get().refreshQueued();

    // Coming back after Android reclaimed the tab should land where they left
    // off, mid-problem, rather than on the home screen with the working lost.
    if (session && window.location.pathname === SCREEN_PATH.home) {
      navigate(SCREEN_PATH.practice, { replace: true });
    }

    // Only now: a sync that started before the local log was read would merge
    // into an empty store and then be overwritten by it.
    startAutoSync(get);
  },

  patchSettings(patch) {
    // A device's own name, address and key are not part of the document that
    // travels, so editing one must not make this device win the next race for
    // everything else in it.
    const shared = Object.keys(patch).some((key) => !LOCAL_FIELD.has(key));
    const settings = { ...get().settings, ...patch, ...(shared ? { updatedAt: Date.now() } : {}) };
    set({ settings });
    void saveSettings(settings);
    if ('backendUrl' in patch || 'token' in patch) get().undismissSyncError();
  },

  toggleChapter(n) {
    const { chapters } = get().settings;
    const next = chapters.includes(n)
      ? chapters.filter((c) => c !== n)
      : [...chapters, n].sort((a, b) => a - b);
    get().patchSettings({ chapters: next });
  },

  async replaceAttempts(attempts) {
    set({ attempts, stats: computeStats(attempts) });
    await putAttempts(attempts, true);
    await get().refreshQueued();
  },

  async loadSample() {
    const attempts = sampleAttempts();
    await get().replaceAttempts(attempts);
    get().showToast(`Loaded ${attempts.length} sample attempts`);
  },

  async clearUnsynced() {
    const ids = new Set(await queuedIds());
    if (ids.size === 0) {
      get().showToast('Nothing local to clear');
      return;
    }
    await deleteAttempts([...ids]);
    const attempts = get().attempts.filter((a) => !ids.has(a.id));
    set({ attempts, stats: computeStats(attempts) });
    await get().refreshQueued();
    get().showToast(`Cleared ${ids.size} unsynced ${ids.size === 1 ? 'attempt' : 'attempts'}`);
  },
});
