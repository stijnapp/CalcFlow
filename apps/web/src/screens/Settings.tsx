import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Database, Download, Minus, Plus, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { CHAPTERS, DEFAULT_KEYS, SET_LENGTHS, type CanvasSurface } from '@calcflow/shared';
import { GENERATORS } from '@calcflow/generators';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Eyebrow } from '@/components/Eyebrow';
import { Tex } from '@/components/Tex';
import { Toggle } from '@/components/Toggle';
import { cx } from '@/lib/cx';
import { detectDeviceName } from '@/lib/deviceName';
import { isInstalled, promptInstall, useCanInstall } from '@/lib/install';
import { clockTime } from '@/lib/format';
import { keyPool, resolveKeys, type LatexKey } from '@/lib/latexKeys';
import { APP_VERSION } from '@/lib/version';
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
            {/* Ten in one sitting is a long sitting. The stops are a stepper
                rather than a field: this is a number he nudges, not one he
                types. */}
            <Row label="Questions per set" sub="how long a finite set runs">
              <Stepper
                value={settings.setLength}
                stops={SET_LENGTHS}
                onChange={(setLength) => store.patchSettings({ setLength })}
              />
            </Row>
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
            {/* A button that replaces his real history with four hundred made-up
                attempts has no business in the installed app. It is here to
                judge the stats screen against, which is a dev-server job. */}
            {import.meta.env.DEV && (
              <Row label="Sample data" sub="a fake 400-attempt history for judging the stats screen">
                <button
                  onClick={() => void store.loadSample()}
                  className="flex items-center gap-2 rounded-sm border border-strong bg-raised px-3 py-1.5 text-[13px] hover:border-accent"
                >
                  <Database className="size-3.5 text-accent" />
                  Load
                </button>
              </Row>
            )}
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
            {/* The one place the version is read off a screen, so it is the one
                place it must not be a number somebody remembered to change. */}
            <p className="text-center font-mono text-[11px] text-ghost">
              CALCFLOW {APP_VERSION} · {GENERATORS.length} GENERATORS · {CHAPTERS.length} CHAPTERS
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

/**
 * A number with named stops. Between them, not through them: the point of the
 * setting is "shorter than ten" or "longer than ten", and the exact figure in
 * between is not a thing worth a keyboard.
 */
function Stepper({
  value,
  stops,
  onChange,
}: {
  value: number;
  stops: readonly number[];
  onChange(next: number): void;
}) {
  const at = Math.max(
    0,
    stops.findIndex((n) => n >= value),
  );
  const step = (by: -1 | 1) => onChange(stops[Math.min(stops.length - 1, Math.max(0, at + by))]!);

  return (
    <div className="flex items-center gap-1.5">
      <StepButton label="Fewer questions" disabled={at === 0} onClick={() => step(-1)}>
        <Minus className="size-3.5" />
      </StepButton>
      <span className="w-8 text-center font-mono text-sm text-ink">{stops[at]}</span>
      <StepButton
        label="More questions"
        disabled={at === stops.length - 1}
        onClick={() => step(1)}
      >
        <Plus className="size-3.5" />
      </StepButton>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick(): void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cx(
        'grid size-8 place-items-center rounded-sm border border-border bg-raised',
        disabled ? 'text-ghost' : 'text-ink2 hover:border-accent hover:text-ink',
      )}
    >
      {children}
    </button>
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
        <ChosenKeys
          chosen={chosen}
          onRemove={(id) => patchSettings({ keys: keys.filter((k) => k !== id) })}
          onReorder={(order) => patchSettings({ keys: order })}
        />

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

/** Held this long, a key comes off the row and follows his finger. */
const HOLD_MS = 400;
/** Travel before that which means he meant to scroll the page. */
const SLOP = 10;

interface Held {
  id: string;
  from: number;
  /** Where each key sat when he picked one up, so the slots stop moving. */
  boxes: Array<{ x: number; y: number }>;
  timer: ReturnType<typeof setTimeout> | undefined;
  pointerId: number;
  startX: number;
  startY: number;
}

/**
 * The keys on the row, in his order. A tap takes one off; a hold lifts it out,
 * and it follows his finger while the others slide around the gap it will drop
 * into. This is the only place the order can be changed — the live row above
 * the answer field is for pressing, and a gesture there fought its scrolling.
 *
 * The slots are a wrapping grid rather than a line, so the key nearest the
 * finger is the nearest in both directions; comparing x alone put a key at the
 * end of one line into the start of the next.
 */
function ChosenKeys({
  chosen,
  onRemove,
  onReorder,
}: {
  chosen: LatexKey[];
  onRemove(id: string): void;
  onReorder(order: string[]): void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const held = useRef<Held | null>(null);
  /** Set once the hold fires, and read by the click that follows the release. */
  const dragged = useRef(false);
  const [drag, setDrag] = useState<{ id: string; from: number; to: number; x: number; y: number } | null>(
    null,
  );

  // The page scrolls under the finger otherwise, and a key that is being
  // carried across the screen is not a page he is reading.
  useEffect(() => {
    if (!drag) return;
    const block = (e: TouchEvent) => e.preventDefault();
    window.addEventListener('touchmove', block, { passive: false });
    return () => window.removeEventListener('touchmove', block);
  }, [drag]);

  useEffect(() => () => clearTimeout(held.current?.timer), []);

  const order = drag ? move(chosen, drag.from, drag.to) : chosen;
  const lifted = drag ? chosen[drag.from] : undefined;

  function release() {
    clearTimeout(held.current?.timer);
    held.current = null;
  }

  function down(e: React.PointerEvent<HTMLButtonElement>, id: string, from: number) {
    if (e.button !== undefined && e.button !== 0) return;
    if (chosen.length < 2) return;
    const target = e.currentTarget;
    const startX = e.clientX;
    const startY = e.clientY;
    const timer = setTimeout(() => {
      const grip = held.current;
      if (!grip) return;
      grip.boxes = [...(boxRef.current?.children ?? [])].map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      dragged.current = true;
      navigator.vibrate?.(12);
      try {
        target.setPointerCapture(grip.pointerId);
      } catch {
        // The finger is already gone; the release below tidies up either way.
      }
      setDrag({ id, from, to: from, x: startX, y: startY });
    }, HOLD_MS);
    held.current = { id, from, boxes: [], timer, pointerId: e.pointerId, startX, startY };
  }

  function moveTo(e: React.PointerEvent<HTMLButtonElement>) {
    const grip = held.current;
    if (!grip) return;
    if (!drag) {
      // Still deciding: travel this early is the page being scrolled.
      if (Math.abs(e.clientX - grip.startX) + Math.abs(e.clientY - grip.startY) > SLOP) release();
      return;
    }
    let to = grip.from;
    let best = Infinity;
    grip.boxes.forEach((box, i) => {
      const d = (box.x - e.clientX) ** 2 + (box.y - e.clientY) ** 2;
      if (d < best) {
        best = d;
        to = i;
      }
    });
    setDrag({ id: grip.id, from: grip.from, to, x: e.clientX, y: e.clientY });
  }

  /** The key lands where the ghost is — on a release, and on a cancel too. */
  function up() {
    const grip = held.current;
    release();
    if (!drag || !grip) return;
    setDrag(null);
    if (drag.to !== drag.from) onReorder(move(chosen, drag.from, drag.to).map((k) => k.id));
  }

  return (
    <>
      <div ref={boxRef} className="relative flex flex-wrap gap-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {order.map((key) => {
            const ghost = key.id === drag?.id;
            return (
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
                onPointerDown={(e) => down(e, key.id, chosen.findIndex((k) => k.id === key.id))}
                onPointerMove={moveTo}
                onPointerUp={up}
                onPointerCancel={up}
                onContextMenu={(e) => e.preventDefault()}
                onClick={() => {
                  // The release after a drag is not a press; it is a landing.
                  if (dragged.current) {
                    dragged.current = false;
                    return;
                  }
                  onRemove(key.id);
                }}
                aria-label={`Remove ${key.name}`}
                className={cx(
                  'flex h-10 touch-pan-y items-center gap-2 rounded-[10px] border px-3 text-[15px]',
                  ghost
                    ? 'border-dashed border-accent bg-accent/5 text-ghost'
                    : 'border-accent bg-accent/10 text-ink',
                )}
              >
                <Tex copy={false}>{key.tex}</Tex>
                <Minus className="size-3 text-accent" />
              </motion.button>
            );
          })}
        </AnimatePresence>
        {chosen.length === 0 && (
          <span className="py-2 text-[13px] text-faint">Nothing on the row yet.</span>
        )}
      </div>

      {chosen.length > 1 && (
        <span className="text-[12px] text-faint">Tap to remove · hold to drag into a new order</span>
      )}

      {/* The key he is holding, free of the row and of everything it sits in. */}
      {drag &&
        lifted &&
        createPortal(
          <div
            aria-hidden
            style={{ left: drag.x, top: drag.y }}
            className="pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-1/2"
          >
            <span className="flex h-10 scale-110 items-center gap-2 rounded-[10px] border border-accent bg-overlay px-3 text-[15px] text-ink shadow-[0_14px_30px_-8px_#000]">
              <Tex copy={false}>{lifted.tex}</Tex>
            </span>
          </div>,
          document.body,
        )}
    </>
  );
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || from === to) return list;
  const out = [...list];
  const [item] = out.splice(from, 1);
  if (item === undefined) return list;
  out.splice(to, 0, item);
  return out;
}
