import type { PointerEvent as ReactPointerEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { LatexField } from '@/components/LatexField';
import { Tex } from '@/components/Tex';
import { cx } from '@/lib/cx';
import type { TexBlock } from '../strokes';
import type { CanvasInsets, CanvasTool } from './scene';
import type { Selection } from './useLasso';

const SPRING = { type: 'spring' as const, stiffness: 480, damping: 36 };

type DivPointer = ReactPointerEvent<HTMLDivElement>;

/** A delete button inside something draggable must not start the drag. */
function stop(e: ReactPointerEvent) {
  e.stopPropagation();
}

/** Where they are on the infinite surface. */
export function ScrollThumb({ insets, top, height }: {
  insets: CanvasInsets;
  top: number;
  height: number;
}) {
  return (
    <div
      className="pointer-events-none absolute right-2 w-1 rounded-full bg-line"
      style={{ top: insets.top + 16, bottom: insets.bottom + 16 }}
    >
      <div
        className="absolute left-0 w-1 rounded-full bg-rail"
        style={{ top: `${top}%`, height: `${height}%` }}
      />
    </div>
  );
}

export function SelectionBox({ selection, panY, onDrag, onDelete }: {
  selection: Selection | null;
  panY: number;
  onDrag(e: DivPointer): void;
  onDelete(): void;
}) {
  if (!selection) return null;
  const { box } = selection;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      onPointerDown={onDrag}
      className="absolute cursor-grab touch-none rounded-[10px] border border-dashed border-accent bg-accent/[0.06] active:cursor-grabbing"
      style={{ left: box.x, top: box.y - panY, width: box.w, height: box.h }}
    >
      <button
        onPointerDown={stop}
        onClick={onDelete}
        aria-label="Delete the selection"
        className="absolute -right-3.5 -top-3.5 grid size-8 place-items-center rounded-full border border-strong bg-overlay text-muted shadow-[0_8px_20px_-6px_#000] hover:text-wrong-ink"
      >
        <Trash2 className="size-4" />
      </button>
    </motion.div>
  );
}

export function TexBlockList({ blocks, activeId, panY, movable, onPick, onDelete }: {
  blocks: TexBlock[];
  activeId: number | null;
  panY: number;
  /** Only the type tool picks blocks up; under any other they are ink. */
  movable: boolean;
  onPick(block: TexBlock, e: DivPointer): void;
  onDelete(): void;
}) {
  return (
    <AnimatePresence>
      {blocks.map((b) => {
        const on = b.id === activeId;
        return (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={SPRING}
            onPointerDown={(e) => onPick(b, e)}
            className={cx(
              'absolute flex touch-none items-center gap-2 rounded-[10px] border px-3.5 py-2 text-[22px] backdrop-blur-sm',
              movable ? 'cursor-grab' : 'pointer-events-none',
              on
                ? 'border-accent bg-card/95 shadow-[0_0_0_4px_rgba(245,165,36,0.1)]'
                : 'border-border bg-card/90',
            )}
            style={{ left: b.x, top: b.y - panY }}
          >
            {/* The block is dragged by holding it, so a hold cannot also copy. */}
            {b.latex.trim() ? <Tex copy={false}>{b.latex}</Tex> : <span className="text-faint">…</span>}
            {on && (
              <button
                onPointerDown={stop}
                onClick={onDelete}
                aria-label="Delete this block"
                className="ml-1 grid size-6 shrink-0 place-items-center rounded-md bg-raised text-muted hover:text-wrong-ink"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}

/**
 * The field for the block being written. Sliding up from the edge says where
 * the bar came from and where it goes; appearing fully formed under their hand
 * did not.
 */
export function TexBar({ open, bottom, frosted, active, onChange, onSubmit, onTyping, onDelete }: {
  open: boolean;
  bottom: number;
  frosted: boolean;
  active: TexBlock | null;
  onChange(latex: string): void;
  onSubmit(): void;
  onTyping(typing: boolean): void;
  onDelete(): void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="tex-bar"
          initial={{ y: 'calc(100% + 12px)' }}
          animate={{ y: 0 }}
          exit={{ y: 'calc(100% + 12px)' }}
          transition={SPRING}
          style={{ bottom }}
          className="absolute inset-x-3 rounded-lg shadow-[0_18px_44px_-16px_#000]"
        >
          <LatexField
            frosted={frosted}
            value={active?.latex ?? ''}
            onChange={onChange}
            onSubmit={onSubmit}
            onFocus={() => onTyping(true)}
            onBlur={() => onTyping(false)}
            placeholder="\frac{d}{dx}\ln(x)"
            ariaLabel="The line you are placing on the canvas"
            compact
            trailing={
              active && (
                <button
                  onClick={onDelete}
                  aria-label="Delete this block"
                  className="grid size-7 shrink-0 place-items-center rounded-[9px] border border-strong bg-raised text-muted hover:text-wrong-ink"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )
            }
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function GestureHint({ tool, penOnly, bottom }: {
  tool: CanvasTool;
  penOnly: boolean;
  bottom: number;
}) {
  if (tool === 'type') return null;
  const hint =
    tool === 'lasso'
      ? 'LOOP ROUND SOME WORKING · THEN DRAG THE BOX'
      : penOnly
        ? 'PEN DRAWS · FINGER PANS · 2-FINGER TAP UNDOES'
        : 'FINGER DRAWS · 2 FINGERS PAN · 2-FINGER TAP UNDOES';
  return (
    <div
      className="pointer-events-none absolute left-4 font-mono text-[11px] tracking-[0.08em] text-ghost"
      style={{ bottom }}
    >
      {hint}
    </div>
  );
}
