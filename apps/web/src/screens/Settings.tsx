import { useState } from 'react';
import { ArrowLeft, Database, Download, RefreshCw, Trash2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { CHAPTERS, SET_LENGTHS, type CanvasSurface, type Theme } from '@calcflow/shared';
import { GENERATORS } from '@calcflow/generators';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Toggle } from '@/components/Toggle';
import { cx } from '@/lib/cx';
import { detectDeviceName } from '@/lib/deviceName';
import { isInstalled, promptInstall, useCanInstall } from '@/lib/install';
import { clockTime } from '@/lib/format';
import { APP_VERSION } from '@/lib/version';
import { useStore } from '@/state/store';
import { Choice, Group, Row, Stepper, TextField } from './settings/controls';
import { KeyEditor } from './settings/KeyEditor';

const SURFACES = [
  ['ruled', 'ruled'],
  ['dots', 'dots'],
  ['blank', 'blank'],
] as const satisfies readonly (readonly [CanvasSurface, string])[];
const THEMES = [
  ['light', 'light'],
  ['dark', 'dark'],
  ['system', 'device'],
] as const satisfies readonly (readonly [Theme, string])[];

export function Settings() {
  const go = useStore((s) => s.go);
  const [clearAsk, setClearAsk] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto flex w-full max-w-[620px] shrink-0 items-center gap-4 px-5 pb-2 pt-4">
        <button
          onClick={() => go('home')}
          aria-label="Back"
          className="grid size-9 place-items-center rounded-md border border-border bg-card text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Settings</h1>
      </div>

      {/* The scroll surface is the whole page, so a thumb anywhere on a tablet
          moves the list; the reading column is centred inside it. */}
      <div className="scroll-y min-h-0 flex-1">
        <div className="mx-auto flex min-h-full w-full max-w-[620px] flex-col gap-5 px-5 pb-16 pt-2">
          <InstallRow />
          <PracticeGroup />
          <AppearanceGroup />
          <KeyEditor />
          <SyncGroup />
          <LocalDataGroup onClear={() => setClearAsk(true)} />
          <SyncFooter />
        </div>
      </div>

      <AnimatePresence>
        {clearAsk && <ClearDialog onClose={() => setClearAsk(false)} />}
      </AnimatePresence>
    </div>
  );
}

/**
 * Only ever on screen in a browser tab that could become an app, and gone the
 * moment it is one. Chrome will not offer this over plain http, so on the LAN
 * during development there is nothing to show and nothing to explain.
 */
function InstallRow() {
  const canInstall = useCanInstall();
  const showToast = useStore((s) => s.showToast);
  if (!canInstall || isInstalled()) return null;

  return (
    <button
      onClick={() => {
        void promptInstall().then((accepted) => {
          if (!accepted) showToast('Not installed — the button stays here');
        });
      }}
      className="flex items-center gap-3.5 rounded-lg border border-accent bg-accent/10 px-4 py-3.5 text-left"
    >
      <Download className="size-[18px] shrink-0 text-accent" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm text-ink">Install CalcFlow</span>
        <span className="text-xs text-faint">adds it to your home screen; keeps working offline</span>
      </span>
    </button>
  );
}

function PracticeGroup() {
  const setLength = useStore((s) => s.settings.setLength);
  const penOnly = useStore((s) => s.settings.penOnly);
  const adaptive = useStore((s) => s.settings.adaptive);
  const patchSettings = useStore((s) => s.patchSettings);
  return (
    <Group title="PRACTICE">
      {/* Ten in one sitting is a long sitting. The stops are a stepper rather
          than a field: this is a number they nudge, not one they type. */}
      <Row label="Questions per set" sub="how long a finite set runs">
        <Stepper
          value={setLength}
          stops={SET_LENGTHS}
          onChange={(next) => patchSettings({ setLength: next })}
        />
      </Row>
      <Row label="Pen-only mode" sub="finger pans instead of drawing">
        <Toggle
          checked={penOnly}
          onChange={(next) => patchSettings({ penOnly: next })}
          label="Pen-only mode"
        />
      </Row>
      <Row label="Adaptive difficulty" sub="follows how the session is going">
        <Toggle
          checked={adaptive}
          onChange={(next) => patchSettings({ adaptive: next })}
          label="Adaptive difficulty"
        />
      </Row>
    </Group>
  );
}

function AppearanceGroup() {
  const theme = useStore((s) => s.settings.theme);
  const reducedMotion = useStore((s) => s.settings.reducedMotion);
  const canvasSurface = useStore((s) => s.settings.canvasSurface);
  const patchSettings = useStore((s) => s.patchSettings);
  return (
    <Group title="APPEARANCE">
      <Row label="Theme" sub="or follow the device">
        <Choice value={theme} options={THEMES} onChange={(next) => patchSettings({ theme: next })} />
      </Row>
      <Row label="Reduced motion" sub="on top of the system setting">
        <Toggle
          checked={reducedMotion}
          onChange={(next) => patchSettings({ reducedMotion: next })}
          label="Reduced motion"
        />
      </Row>
      <Row label="Canvas surface">
        <Choice
          value={canvasSurface}
          options={SURFACES}
          onChange={(next) => patchSettings({ canvasSurface: next })}
        />
      </Row>
    </Group>
  );
}

function SyncGroup() {
  const deviceName = useStore((s) => s.settings.deviceName);
  const backendUrl = useStore((s) => s.settings.backendUrl);
  const token = useStore((s) => s.settings.token);
  const lastSyncedAt = useStore((s) => s.settings.lastSyncedAt);
  const syncError = useStore((s) => s.syncError);
  const patchSettings = useStore((s) => s.patchSettings);
  return (
    <Group title="SYNC">
      {/* Stamped on every answer, so the synced log can say which device each
          one came from. The placeholder is not a suggestion — it is what
          leaving this blank will actually stamp. */}
      <Row label="Device name" sub="which device an answer came from">
        <TextField
          value={deviceName}
          onChange={(next) => patchSettings({ deviceName: next })}
          placeholder={detectDeviceName()}
        />
      </Row>
      <Row label="Backend" sub="blank = wherever this app is served from">
        <TextField
          value={backendUrl}
          onChange={(next) => patchSettings({ backendUrl: next })}
          placeholder="calcflow.ts.net"
        />
      </Row>
      <Row label="Token">
        <TextField
          value={token}
          onChange={(next) => patchSettings({ token: next })}
          placeholder="••••••••"
          password
        />
      </Row>
      <Row label="Last synced">
        <span className="font-mono text-xs text-muted">
          {lastSyncedAt ? clockTime(lastSyncedAt) : 'never'}
        </span>
      </Row>
      {/* Only when there is something wrong to say. A sync that works is
          already reported by the line above it. */}
      {syncError && (
        <p className="border-t border-raised px-4 py-3 text-xs text-wrong-ink">{syncError}</p>
      )}
    </Group>
  );
}

function LocalDataGroup({ onClear }: { onClear(): void }) {
  const queued = useStore((s) => s.queued);
  const loadSample = useStore((s) => s.loadSample);
  const waiting = `${queued} unsynced ${queued === 1 ? 'attempt' : 'attempts'}`;

  return (
    <Group title="LOCAL DATA">
      {/* A button that replaces their real history with four hundred made-up
          attempts has no business in the installed app. It is here to judge
          the stats screen against, which is a dev-server job. */}
      {import.meta.env.DEV && (
        <Row label="Sample data" sub="a fake 400-attempt history for judging the stats screen">
          <button
            onClick={() => void loadSample()}
            className="flex items-center gap-2 rounded-sm border border-strong bg-raised px-3 py-1.5 text-[13px] hover:border-accent"
          >
            <Database className="size-3.5 text-accent" />
            Load
          </button>
        </Row>
      )}
      <Row
        label="Clear local changes"
        sub={queued === 0 ? 'nothing waiting to be sent' : `${waiting}; synced history stays`}
      >
        <button
          onClick={onClear}
          className="flex items-center gap-2 rounded-sm border border-strong bg-raised px-3 py-1.5 text-[13px] text-wrong-ink hover:border-wrong"
        >
          <Trash2 className="size-3.5" />
          Clear
        </button>
      </Row>
    </Group>
  );
}

function ClearDialog({ onClose }: { onClose(): void }) {
  const clearUnsynced = useStore((s) => s.clearUnsynced);
  return (
    <ConfirmDialog
      title="Clear local changes?"
      body="Deletes every attempt on this device that the backend has not accepted yet. Anything already synced is untouched, and nothing on the server changes."
      confirmLabel="Clear"
      confirmWord="clear"
      danger
      onConfirm={() => {
        onClose();
        void clearUnsynced();
      }}
      onCancel={onClose}
    />
  );
}

function SyncFooter() {
  const queued = useStore((s) => s.queued);
  const syncing = useStore((s) => s.syncing);
  const syncNow = useStore((s) => s.syncNow);
  return (
    <div className="mt-auto flex flex-col gap-2.5 pt-2">
      <button
        onClick={syncNow}
        disabled={syncing}
        className="flex h-[50px] items-center justify-center gap-2.5 rounded-md border border-strong bg-overlay text-[15px] disabled:text-muted"
      >
        <RefreshCw className={cx('size-4 text-correct', syncing && 'animate-spin')} />
        {syncing ? 'Syncing…' : `Sync now — ${queued} queued`}
      </button>
      {/* The one place the version is read off a screen, so it is the one
          place it must not be a number somebody remembered to change. */}
      <p className="text-center font-mono text-[11px] text-ghost">
        CALCFLOW {APP_VERSION} · {GENERATORS.length} GENERATORS · {CHAPTERS.length} CHAPTERS
      </p>
    </div>
  );
}
