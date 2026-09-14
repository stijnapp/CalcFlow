import { Eraser, Hand, Lasso, MoveUpRight, PenTool, Redo2, Trash2, Type, Undo2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cx } from '@/lib/cx';
import type { CanvasTool } from '@/canvas/ScribbleCanvas';
import { HoverLabel } from './HoverLabel';
import { PenWidth } from './PenWidth';

interface Props {
  tool: CanvasTool;
  onTool(tool: CanvasTool): void;
  penWidth: number;
  onPenWidth(next: number): void;
  penMenu: boolean;
  onClosePenMenu(): void;
  penOnly: boolean;
  onPenOnly(next: boolean): void;
  onUndo(): void;
  onRedo(): void;
  onClear(): void;
  /** Chapter 12 only: the arrow tool, which has nothing to do on a plain page. */
  arrows?: boolean;
}

/**
 * The S-Pen button is not readable from a web page on either target device, so
 * the eraser is a rail toggle with a persistent active state — the primary way
 * to erase, not a fallback. One pen, whose width lives behind a second tap.
 */
export function ToolRail({
  tool,
  onTool,
  penWidth,
  onPenWidth,
  penMenu,
  onClosePenMenu,
  penOnly,
  onPenOnly,
  onUndo,
  onRedo,
  onClear,
  arrows,
}: Props) {
  return (
    <div className="relative flex w-[62px] shrink-0 flex-col items-center gap-2 border-r border-edge bg-card py-4">
      <RailButton label="Pen" active={tool === 'pen'} onClick={() => onTool('pen')}>
        <PenTool className="size-[17px]" />
      </RailButton>
      <RailButton label="Eraser" active={tool === 'eraser'} onClick={() => onTool('eraser')}>
        <Eraser className="size-[17px]" />
      </RailButton>
      <RailButton label="Type LaTeX" active={tool === 'type'} onClick={() => onTool('type')}>
        <Type className="size-[17px]" />
      </RailButton>
      <RailButton label="Select and move" active={tool === 'lasso'} onClick={() => onTool('lasso')}>
        <Lasso className="size-[17px]" />
      </RailButton>
      {arrows && (
        <RailButton
          label="Draw a vector · hold before moving to leave the lattice"
          active={tool === 'arrow'}
          onClick={() => onTool('arrow')}
        >
          <MoveUpRight className="size-[17px]" />
        </RailButton>
      )}

      <div className="my-1 h-px w-7 bg-border" />

      <RailButton label="Undo" onClick={onUndo}>
        <Undo2 className="size-[17px]" />
      </RailButton>
      <RailButton label="Redo" onClick={onRedo}>
        <Redo2 className="size-[17px]" />
      </RailButton>
      <RailButton label="Clear the canvas" onClick={onClear}>
        <Trash2 className="size-[17px]" />
      </RailButton>

      <div className="mt-auto">
        <RailButton label="Pen-only mode" active={penOnly} tint onClick={() => onPenOnly(!penOnly)}>
          <Hand className="size-4" />
        </RailButton>
      </div>

      {penMenu && tool === 'pen' && (
        <button
          aria-label="Close the width picker"
          onClick={onClosePenMenu}
          className="fixed inset-0 z-20 cursor-default"
        />
      )}
      <AnimatePresence>
        {penMenu && tool === 'pen' && (
          <PenWidth
            key="pen-width"
            width={penWidth}
            onChange={onPenWidth}
            className="absolute left-[70px] top-3"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface RailButtonProps {
  label: string;
  active?: boolean;
  /** A tinted active state, for a mode rather than a tool. */
  tint?: boolean;
  onClick(): void;
  children: React.ReactNode;
}

/*
 * The name comes up on hover rather than in a `title`: Chrome on Android never
 * shows those, and hovering the pen over the rail is exactly when he wants to
 * know which of six similar glyphs he is about to press. It sits beside the
 * button rather than above it — above is where the previous tool is.
 */
function RailButton({ label, active, tint, onClick, children }: RailButtonProps) {
  return (
    <HoverLabel label={label} side="right">
      <motion.button
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 700, damping: 30 }}
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={cx(
          'grid size-[42px] place-items-center rounded-[11px] border transition-colors',
          active
            ? tint
              ? 'border-accent bg-accent/15 text-accent'
              : 'border-accent bg-accent text-on-accent'
            : 'border-border bg-raised text-muted hover:text-ink',
        )}
      >
        {children}
      </motion.button>
    </HoverLabel>
  );
}
