import { useState } from 'react';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { DEFAULT_KEYS } from '@calcflow/shared';
import { Eyebrow } from '@/components/Eyebrow';
import { Tex } from '@/components/Tex';
import { cx } from '@/lib/cx';
import { keyPool, resolveKeys, type LatexKey } from '@/lib/latexKeys';
import { useStore } from '@/state/store';
import { ChosenKeys, HOP, KEY_SPRING } from './ChosenKeys';

/**
 * The notation row, edited in place: what is on it, in order, and what is left
 * to add. A key leaves each list towards the one it is joining, so the movement
 * says where it went. Everything a single tap, because this is a list they will
 * fiddle with.
 */
export function KeyEditor() {
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
   * on the floor: a mis-tap costs nothing, and editing a key they already made
   * is delete-then-add without having to retype what it was.
   */
  function forget(id: string) {
    const gone = custom.find((c) => c.id === id);
    patchSettings({
      customKeys: custom.filter((c) => c.id !== id),
      keys: keys.filter((k) => k !== id),
    });
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
        <RestKeys
          rest={rest}
          isCustom={(id) => customIds.has(id)}
          onAdd={(id) => patchSettings({ keys: [...keys, id] })}
          onForget={forget}
        />
        <div className="h-px bg-line" />
        <CustomKeyForm
          face={face}
          insert={insert}
          setFace={setFace}
          setInsert={setInsert}
          onAdd={addCustom}
        />
      </div>
    </section>
  );
}

/** What is left to add, their own keys with a way to delete them. */
function RestKeys({
  rest,
  isCustom,
  onAdd,
  onForget,
}: {
  rest: LatexKey[];
  isCustom(id: string): boolean;
  onAdd(id: string): void;
  onForget(id: string): void;
}) {
  return (
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
              onClick={() => onAdd(key.id)}
              aria-label={`Add ${key.name}`}
              className="flex h-full items-center gap-2 px-3 text-[15px] hover:text-ink"
            >
              <Tex copy={false}>{key.tex}</Tex>
              <Plus className="size-3 text-faint" />
            </button>
            {isCustom(key.id) && (
              <button
                onClick={() => onForget(key.id)}
                aria-label={`Delete the key for ${key.insert}`}
                className="grid h-full w-8 place-items-center border-l border-border hover:text-wrong-ink"
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      {rest.length === 0 && (
        <span className="py-2 text-[13px] text-faint">Every key is on the row.</span>
      )}
    </div>
  );
}

/** Their own keys: what the button shows, and what it types. */
function CustomKeyForm({
  face,
  insert,
  setFace,
  setInsert,
  onAdd,
}: {
  face: string;
  insert: string;
  setFace(next: string): void;
  setInsert(next: string): void;
  onAdd(): void;
}) {
  const ready = Boolean(face.trim() && insert.trim());
  return (
    <>
      <div className="flex items-end gap-2">
        <KeyInput
          label="Key face"
          value={face}
          onChange={setFace}
          onEnter={onAdd}
          placeholder="\vec{a}"
        />
        <KeyInput
          label="Types"
          value={insert}
          onChange={setInsert}
          onEnter={onAdd}
          placeholder="\vec{}"
        />
        <button
          onClick={onAdd}
          disabled={!ready}
          className={cx(
            'grid h-10 w-10 shrink-0 place-items-center rounded-sm border transition-colors',
            ready
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
    </>
  );
}

function KeyInput({
  label,
  value,
  onChange,
  onEnter,
  placeholder,
}: {
  label: string;
  value: string;
  onChange(next: string): void;
  onEnter(): void;
  placeholder: string;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="text-[12px] text-faint">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnter()}
        placeholder={placeholder}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className="h-10 min-w-0 rounded-sm border border-border bg-well px-2.5 font-mono text-xs text-ink2 outline-none placeholder:text-ghost focus:border-accent"
      />
    </label>
  );
}
