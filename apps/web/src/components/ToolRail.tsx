import { Eraser, Hand, PenTool, Pencil, Redo2, Trash2, Type, Undo2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cx } from '@/lib/cx';
import type { CanvasTool } from '@/canvas/ScribbleCanvas';

interface Props {
  tool: CanvasTool;
  onTool(tool: CanvasTool): void;
  penOnly: boolean;
  onPenOnly(next: boolean): void;
  onUndo(): void;
  onRedo(): void;
  onClear(): void;
}

const TOOLS: Array<{ id: CanvasTool; icon: typeof Pencil; label: string }> = [
  { id: 'pen1', icon: Pencil, label: 'Thin pen' },
  { id: 'pen2', icon: PenTool, label: 'Thick pen' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
  { id: 'type', icon: Type, label: 'Type LaTeX' },
];

/**
 * The S-Pen button is not readable from a web page on either target device, so
 * the eraser is a rail toggle with a persistent active state — the primary way
 * to erase, not a fallback.
 */
export function ToolRail({ tool, onTool, penOnly, onPenOnly, onUndo, onRedo, onClear }: Props) {
  return (
    <div className="flex w-[62px] shrink-0 flex-col items-center gap-2 border-r border-edge bg-card py-4">
      {TOOLS.map(({ id, icon: Icon, label }) => (
        <RailButton key={id} label={label} active={tool === id} onClick={() => onTool(id)}>
          <Icon className="size-[17px]" />
        </RailButton>
      ))}

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

function RailButton({ label, active, tint, onClick, children }: RailButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 700, damping: 30 }}
      title={label}
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
  );
}
