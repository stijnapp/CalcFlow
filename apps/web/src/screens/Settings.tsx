import { useEffect, useState } from 'react';
import { ArrowLeft, Database, Minus, Plus, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { DEFAULT_KEYS, type CanvasSurface } from '@calcflow/shared';
import { GENERATORS } from '@calcflow/generators';
import { Eyebrow } from '@/components/Eyebrow';
import { Tex } from '@/components/Tex';
import { Toggle } from '@/components/Toggle';
import { cx } from '@/lib/cx';
import { clockTime } from '@/lib/format';
import { LATEX_KEYS, latexKey } from '@/lib/latexKeys';
import { queuedCount } from '@/state/db';
import { useStore } from '@/state/store';

const SURFACES: CanvasSurface[] = ['ruled', 'dots', 'blank'];

export function Settings() {
  const settings = useStore((s) => s.settings);
  const attempts = useStore((s) => s.attempts.length);
  const store = useStore();
  const [queued, setQueued] = useState(0);

  useEffect(() => {
    void queuedCount().then(setQueued);
  }, []);

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

      {/* A settings list is a reading column, not a 1440px-wide table. */}
      <div className="scroll-y mx-auto flex w-full max-w-[620px] flex-1 flex-col gap-5 px-5 pb-16 pt-2">
        <Group title="PRACTICE">
          <Row label="Pen-only mode" sub="finger pans instead of drawing">
            <Toggle
              checked={settings.penOnly}
              onChange={(penOnly) => store.patchSettings({ penOnly })}
              label="Pen-only mode"
            />
          </Row>
          <Row label="Word problems" sub="parameterised templates">
            <Toggle
              checked={settings.wordProblems}
              onChange={(wordProblems) => store.patchSettings({ wordProblems })}
              label="Word problems"
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
          <Row label="Device name">
            <TextField
              value={settings.deviceName}
              onChange={(deviceName) => store.patchSettings({ deviceName })}
              placeholder="tab-s11"
            />
          </Row>
          <Row label="Backend" sub="reachable over Tailscale">
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
        </Group>

        <Group title="HISTORY">
          <Row label="Sample data" sub="a fake 400-attempt history for judging the stats screen">
            <button
              onClick={() => void store.loadSample()}
              className="flex items-center gap-2 rounded-sm border border-strong bg-raised px-3 py-1.5 text-[13px] hover:border-accent"
            >
              <Database className="size-3.5 text-accent" />
              Load
            </button>
          </Row>
          <Row label="Clear history" sub={`${attempts} attempts on this device`}>
            <button
              onClick={() => void store.clearAttempts()}
              className="flex items-center gap-2 rounded-sm border border-strong bg-raised px-3 py-1.5 text-[13px] text-wrong-ink hover:border-wrong"
            >
              <Trash2 className="size-3.5" />
              Clear
            </button>
          </Row>
        </Group>

        <div className="mt-auto flex flex-col gap-2.5 pt-2">
          <button
            onClick={() =>
              store.showToast(
                settings.backendUrl ? 'Sync lands with the backend' : 'Set a backend URL first',
              )
            }
            className="flex h-[50px] items-center justify-center gap-2.5 rounded-md border border-strong bg-overlay text-[15px]"
          >
            <RefreshCw className="size-4 text-correct" />
            Sync now — {queued} queued
          </button>
          <p className="text-center font-mono text-[11px] text-ghost">
            CALCFLOW 0.1.0 · {GENERATORS.length} GENERATORS · 9 CHAPTERS
          </p>
        </div>
      </div>
    </div>
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
      className="w-[160px] rounded-sm border border-border bg-well px-2.5 py-1.5 text-right font-mono text-xs text-ink2 outline-none placeholder:text-ghost focus:border-accent"
    />
  );
}

/**
 * The notation row, edited in place: what is on it, in order, and what is left
 * to add. Everything a single tap, because this is a list he will fiddle with.
 */
function KeyEditor() {
  const keys = useStore((s) => s.settings.keys);
  const patchSettings = useStore((s) => s.patchSettings);
  const chosen = keys.map(latexKey).filter((k) => k !== undefined);
  const rest = LATEX_KEYS.filter((k) => !keys.includes(k.id));

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
        <div className="flex flex-wrap gap-1.5">
          <AnimatePresence initial={false} mode="popLayout">
            {chosen.map((key) => (
              <motion.button
                key={key.id}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                onClick={() => patchSettings({ keys: keys.filter((id) => id !== key.id) })}
                aria-label={`Remove ${key.name}`}
                className="flex h-10 items-center gap-2 rounded-[10px] border border-accent bg-accent/10 px-3 text-[15px] text-ink"
              >
                <Tex>{key.tex}</Tex>
                <Minus className="size-3 text-accent" />
              </motion.button>
            ))}
          </AnimatePresence>
          {chosen.length === 0 && (
            <span className="py-2 text-[13px] text-faint">Nothing on the row yet.</span>
          )}
        </div>

        <div className="h-px bg-line" />

        <div className="flex flex-wrap gap-1.5">
          <AnimatePresence initial={false} mode="popLayout">
            {rest.map((key) => (
              <motion.button
                key={key.id}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                onClick={() => patchSettings({ keys: [...keys, key.id] })}
                aria-label={`Add ${key.name}`}
                className="flex h-10 items-center gap-2 rounded-[10px] border border-border bg-raised px-3 text-[15px] text-muted hover:border-accent hover:text-ink"
              >
                <Tex>{key.tex}</Tex>
                <Plus className="size-3 text-faint" />
              </motion.button>
            ))}
          </AnimatePresence>
          {rest.length === 0 && (
            <span className="py-2 text-[13px] text-faint">Every key is on the row.</span>
          )}
        </div>
      </div>
    </section>
  );
}
