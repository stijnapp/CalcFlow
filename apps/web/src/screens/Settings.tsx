import { useState } from 'react';
import { ArrowLeft, Database, Download, Minus, Plus, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { CHAPTERS, DEFAULT_KEYS, type CanvasSurface } from '@calcflow/shared';
import { GENERATORS } from '@calcflow/generators';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Eyebrow } from '@/components/Eyebrow';
import { Tex } from '@/components/Tex';
import { Toggle } from '@/components/Toggle';
import { cx } from '@/lib/cx';
import { detectDeviceName } from '@/lib/deviceName';
import { isInstalled, promptInstall, useCanInstall } from '@/lib/install';
import { clockTime } from '@/lib/format';
import { keyPool, resolveKeys } from '@/lib/latexKeys';
import { useStore } from '@/state/store';

const SURFACES: CanvasSurface[] = ['ruled', 'dots', 'blank'];

export function Settings() {
  const settings = useStore((s) => s.settings);
  const queued = useStore((s) => s.queued);
  const syncing = useStore((s) => s.syncing);
  const syncError = useStore((s) => s.syncError);
  const store = useStore();
  const [clearAsk, setClearAsk] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto flex w-full max-w-[620px] shrink-0 items-center gap-4 px-5 pb-2 pt-4">
        <button
          onClick={() => store.go('home')}
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

          <Group title="PRACTICE">
            <Row label="Pen-only mode" sub="finger pans instead of drawing">
              <Toggle
                checked={settings.penOnly}
                onChange={(penOnly) => store.patchSettings({ penOnly })}
                label="Pen-only mode"
              />
            </Row>
            <Row label="Adaptive difficulty" sub="follows how the session is going">
              <Toggle
                checked={settings.adaptive}
                onChange={(adaptive) => store.patchSettings({ adaptive })}
                label="Adaptive difficulty"
              />
            </Row>
          </Group>

          <Group title="APPEARANCE">
            <Row label="Reduced motion" sub="on top of the system setting">
              <Toggle
                checked={settings.reducedMotion}
                onChange={(reducedMotion) => store.patchSettings({ reducedMotion })}
                label="Reduced motion"
              />
            </Row>
            <Row label="Canvas surface">
              <div className="flex gap-1.5">
                {SURFACES.map((s) => (
                  <button
                    key={s}
                    onClick={() => store.patchSettings({ canvasSurface: s })}
                    className={cx(
                      'rounded-sm border px-2.5 py-1 font-mono text-[11px] uppercase',
                      settings.canvasSurface === s
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-border bg-raised text-muted',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Row>
          </Group>

          <KeyEditor />

          <Group title="SYNC">
            {/* The placeholder is not a suggestion — it is what leaving this
                blank will actually stamp on every attempt. */}
            <Row label="Device name" sub="blank = what this browser calls itself">
              <TextField
                value={settings.deviceName}
                onChange={(deviceName) => store.patchSettings({ deviceName })}
                placeholder={detectDeviceName()}
              />
            </Row>
            <Row label="Backend" sub="blank = wherever this app is served from">
              <TextField
                value={settings.backendUrl}
                onChange={(backendUrl) => store.patchSettings({ backendUrl })}
                placeholder="calcflow.ts.net"
              />
            </Row>
            <Row label="Token">
              <TextField
                value={settings.token}
                onChange={(token) => store.patchSettings({ token })}
                placeholder="••••••••"
                password
              />
            </Row>
            <Row label="Last synced">
              <span className="font-mono text-xs text-muted">
                {settings.lastSyncedAt ? clockTime(settings.lastSyncedAt) : 'never'}
              </span>
            </Row>
            {/* Only when there is something wrong to say. A sync that works is
                already reported by the line above it. */}
            {syncError && (
              <p className="border-t border-raised px-4 py-3 text-xs text-wrong-ink">{syncError}</p>
            )}
          </Group>

          <Group title="LOCAL DATA">
            <Row label="Sample data" sub="a fake 400-attempt history for judging the stats screen">
              <button
                onClick={() => void store.loadSample()}
                className="flex items-center gap-2 rounded-sm border border-strong bg-raised px-3 py-1.5 text-[13px] hover:border-accent"
              >
                <Database className="size-3.5 text-accent" />
                Load
              </button>
            </Row>
            <Row
              label="Clear local changes"
              sub={
                queued === 0
                  ? 'nothing waiting to be sent'
                  : `${queued} unsynced ${queued === 1 ? 'attempt' : 'attempts'}; synced history stays`
              }
            >
              <button
                onClick={() => setClearAsk(true)}
                className="flex items-center gap-2 rounded-sm border border-strong bg-raised px-3 py-1.5 text-[13px] text-wrong-ink hover:border-wrong"
              >
                <Trash2 className="size-3.5" />
                Clear
              </button>
            </Row>
          </Group>

          <div className="mt-auto flex flex-col gap-2.5 pt-2">
            <button
              onClick={store.syncNow}
              disabled={syncing}
              className="flex h-[50px] items-center justify-center gap-2.5 rounded-md border border-strong bg-overlay text-[15px] disabled:text-muted"
            >
              <RefreshCw className={cx('size-4 text-correct', syncing && 'animate-spin')} />
              {syncing ? 'Syncing…' : `Sync now — ${queued} queued`}
            </button>
            <p className="text-center font-mono text-[11px] text-ghost">
              CALCFLOW 0.1.9 · {GENERATORS.length} GENERATORS · {CHAPTERS.length} CHAPTERS
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {clearAsk && (
          <ConfirmDialog
            title="Clear local changes?"
            body="Deletes every attempt on this device that the backend has not accepted yet. Anything already synced is untouched, and nothing on the server changes."
            confirmLabel="Clear"
            confirmWord="clear"
            danger
            onConfirm={() => {
              setClearAsk(false);
              void store.clearUnsynced();
            }}
            onCancel={() => setClearAsk(false)}
          />
        )}
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

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <Eyebrow>{title}</Eyebrow>
      <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">{children}</div>
    </section>
  );
}

function Row({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-raised px-4 py-3.5 first:border-t-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm text-ink">{label}</span>
        {sub && <span className="truncate text-xs text-faint">{sub}</span>}
      </div>
      <div className="ml-auto shrink-0">{children}</div>
    </div>
  );
}

function TextField({
  value,
  onChange,
  placeholder,
  password,
}: {
  value: string;
  onChange(next: string): void;
  placeholder: string;
  password?: boolean;
}) {
  return (
    <input
      value={value}
      type={password ? 'password' : 'text'}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={password ? 'new-password' : 'off'}
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      data-lpignore="true"
      data-1p-ignore=""
      className="w-[160px] rounded-sm border border-border bg-well px-2.5 py-1.5 text-right font-mono text-xs text-ink2 outline-none placeholder:text-ghost focus:border-accent"
    />
  );
}

const KEY_SPRING = { type: 'spring' as const, stiffness: 520, damping: 34 };
/** Short on purpose: a key crosses the divider, it does not fly across the page. */
const HOP = 14;

/**
 * The notation row, edited in place: what is on it, in order, and what is left
 * to add. A key leaves each list towards the one it is joining, so the movement
 * says where it went. Everything a single tap, because this is a list he will
 * fiddle with.
 */
function KeyEditor() {
  const keys = useStore((s) => s.settings.keys);
  const custom = useStore((s) => s.settings.customKeys);
  const patchSettings = useStore((s) => s.patchSettings);
  const showToast = useStore((s) => s.showToast);
  const [face, setFace] = useState('');
  const [insert, setInsert] = useState('');

  const chosen = resolveKeys(keys, custom);
  const rest = keyPool(custom).filter((k) => !keys.includes(k.id));
  const customIds = new Set(custom.map((c) => c.id));

  function addCustom() {
    const tex = face.trim();
    const body = insert.trim();
    if (!tex || !body) return;
    const id = `own-${Date.now().toString(36)}`;
    patchSettings({ customKeys: [...custom, { id, tex, insert: body }], keys: [...keys, id] });
    setFace('');
    setInsert('');
  }

  /**
   * Deleting a key hands it back to the two boxes below rather than dropping it
   * on the floor: a mis-tap costs nothing, and editing a key he already made is
   * delete-then-add without having to retype what it was.
   */
  function forget(id: string) {
    const gone = custom.find((c) => c.id === id);
    patchSettings({ customKeys: custom.filter((c) => c.id !== id), keys: keys.filter((k) => k !== id) });
    if (!gone) return;
    setFace(gone.tex);
    setInsert(gone.insert);
    showToast('Key moved back to the boxes below');
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Eyebrow>NOTATION ROW</Eyebrow>
        <div className="h-px flex-1 bg-line" />
        <button
          onClick={() => patchSettings({ keys: [...DEFAULT_KEYS] })}
          className="flex items-center gap-1.5 text-[12px] text-muted hover:text-ink"
        >
          <RotateCcw className="size-3" />
          Reset
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3.5">
        <div className="relative flex flex-wrap gap-1.5">
          <AnimatePresence initial={false} mode="popLayout">
            {chosen.map((key) => (
              <motion.button
                key={key.id}
                /* Position only, so the keys still on the row slide to their new
                   places instead of jumping there. Animating the box as well
                   would stretch the maths inside it while it travelled. */
                layout="position"
                initial={{ opacity: 0, scale: 0.85, y: HOP }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: HOP }}
                transition={KEY_SPRING}
                onClick={() => patchSettings({ keys: keys.filter((id) => id !== key.id) })}
                aria-label={`Remove ${key.name}`}
                className="flex h-10 items-center gap-2 rounded-[10px] border border-accent bg-accent/10 px-3 text-[15px] text-ink"
              >
                <Tex copy={false}>{key.tex}</Tex>
                <Minus className="size-3 text-accent" />
              </motion.button>
            ))}
          </AnimatePresence>
          {chosen.length === 0 && (
            <span className="py-2 text-[13px] text-faint">Nothing on the row yet.</span>
          )}
        </div>

        <div className="h-px bg-line" />

        <div className="relative flex flex-wrap gap-1.5">
          <AnimatePresence initial={false} mode="popLayout">
            {rest.map((key) => (
              <motion.div
                key={key.id}
                layout="position"
                initial={{ opacity: 0, scale: 0.85, y: -HOP }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: -HOP }}
                transition={KEY_SPRING}
                className="flex h-10 items-center overflow-hidden rounded-[10px] border border-border bg-raised text-muted"
              >
                <button
                  onClick={() => patchSettings({ keys: [...keys, key.id] })}
                  aria-label={`Add ${key.name}`}
                  className="flex h-full items-center gap-2 px-3 text-[15px] hover:text-ink"
                >
                  <Tex copy={false}>{key.tex}</Tex>
                  <Plus className="size-3 text-faint" />
                </button>
                {customIds.has(key.id) && (
                  <button
                    onClick={() => forget(key.id)}
                    aria-label={`Delete the key for ${key.insert}`}
                    className="grid h-full w-8 place-items-center border-l border-border hover:text-wrong-ink"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {rest.length === 0 && <span className="py-2 text-[13px] text-faint">Every key is on the row.</span>}
        </div>

        <div className="h-px bg-line" />

        {/* His own keys: what the button shows, and what it types. */}
        <div className="flex items-end gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[12px] text-faint">Key face</span>
            <input
              value={face}
              onChange={(e) => setFace(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustom()}
              placeholder="\vec{a}"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="h-10 min-w-0 rounded-sm border border-border bg-well px-2.5 font-mono text-xs text-ink2 outline-none placeholder:text-ghost focus:border-accent"
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[12px] text-faint">Types</span>
            <input
              value={insert}
              onChange={(e) => setInsert(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustom()}
              placeholder="\vec{}"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="h-10 min-w-0 rounded-sm border border-border bg-well px-2.5 font-mono text-xs text-ink2 outline-none placeholder:text-ghost focus:border-accent"
            />
          </label>
          <button
            onClick={addCustom}
            disabled={!face.trim() || !insert.trim()}
            className={cx(
              'grid h-10 w-10 shrink-0 place-items-center rounded-sm border transition-colors',
              face.trim() && insert.trim()
                ? 'border-accent bg-accent/15 text-accent'
                : 'cursor-not-allowed border-border bg-raised text-ghost',
            )}
            aria-label="Add this key"
          >
            <Plus className="size-4" />
          </button>
        </div>
        {face.trim() && (
          <div className="flex items-center gap-2.5 text-[13px] text-faint">
            Preview
            <span className="rounded-sm border border-border bg-raised px-2.5 py-1 text-[15px] text-ink">
              <Tex>{face}</Tex>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
