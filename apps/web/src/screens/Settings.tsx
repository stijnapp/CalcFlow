import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import type { CanvasSurface } from '@calcflow/shared';
import { GENERATORS } from '@calcflow/generators';
import { Eyebrow } from '@/components/Eyebrow';
import { Toggle } from '@/components/Toggle';
import { cx } from '@/lib/cx';
import { clockTime } from '@/lib/format';
import { queuedCount } from '@/state/db';
import { useStore } from '@/state/store';

const SURFACES: CanvasSurface[] = ['ruled', 'dots', 'blank'];

export function Settings() {
  const settings = useStore((s) => s.settings);
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
      <div className="scroll-y mx-auto flex w-full max-w-[620px] flex-1 flex-col gap-5 px-5 pb-6 pt-2">
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
