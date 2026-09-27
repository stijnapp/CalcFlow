import type { ReactNode } from 'react';
import {
  Eraser,
  Hand,
  Lasso,
  MoveUpRight,
  PenTool,
  Redo2,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowSnap } from '@/components/ArrowSnap';
import { HoverLabel } from '@/components/HoverLabel';
import { PenWidth } from '@/components/PenWidth';
import { cx } from '@/lib/cx';
import { useStore } from '@/state/store';
import type { Practice } from './shared';

/**
 * Everything that draws, then everything that undoes: the row both phone
 * layouts scroll, small along the top of the canvas and full size along the
 * bottom of the fullscreen one.
 */
export function ToolButtons({
  practice,
  arrows,
  small,
}: {
  practice: Practice;
  arrows: boolean;
  small?: boolean;
}) {
  const { tool, setTool } = practice;
  const icon = small ? 'size-[15px]' : 'size-[18px]';
  return (
    <>
      <PhoneTool small={small} active={tool === 'pen'} onClick={() => setTool('pen')} label="Pen">
        <PenTool className={icon} />
      </PhoneTool>
      <PhoneTool
        small={small}
        active={tool === 'eraser'}
        onClick={() => setTool('eraser')}
        label="Eraser"
      >
        <Eraser className={icon} />
      </PhoneTool>
      <PhoneTool
        small={small}
        active={tool === 'type'}
        onClick={() => setTool('type')}
        label="Type LaTeX"
      >
        <Type className={icon} />
      </PhoneTool>
      <PhoneTool
        small={small}
        active={tool === 'lasso'}
        onClick={() => setTool('lasso')}
        label="Select and move"
      >
        <Lasso className={icon} />
      </PhoneTool>
      {arrows && (
        <PhoneTool
          small={small}
          active={tool === 'arrow'}
          onClick={() => setTool('arrow')}
          label="Draw a vector"
        >
          <MoveUpRight className={icon} />
        </PhoneTool>
      )}
      <Divider small={small} />
      <PhoneTool small={small} onClick={practice.undo} label="Undo">
        <Undo2 className={icon} />
      </PhoneTool>
      <PhoneTool small={small} onClick={practice.redo} label="Redo">
        <Redo2 className={icon} />
      </PhoneTool>
      <PhoneTool small={small} onClick={practice.askClear} label="Clear the canvas">
        <Trash2 className={icon} />
      </PhoneTool>
    </>
  );
}

/**
 * Pen-only is a mode they flip mid-thought, so it keeps a fixed place rather
 * than sliding away with the scrolling tools.
 */
export function PenOnlyButton() {
  const penOnly = useStore((s) => s.settings.penOnly);
  const patchSettings = useStore((s) => s.patchSettings);
  return (
    <PhoneTool
      small
      tint
      active={penOnly}
      onClick={() => patchSettings({ penOnly: !penOnly })}
      label="Pen-only mode"
    >
      <Hand className="size-[15px]" />
    </PhoneTool>
  );
}

/** The second tap's menu: the pen's width, or whether a vector snaps. */
export function ToolPicker({ practice, className }: { practice: Practice; className: string }) {
  const penWidth = useStore((s) => s.settings.penWidth);
  const arrowSnap = useStore((s) => s.settings.arrowSnap);
  const patchSettings = useStore((s) => s.patchSettings);
  const { toolMenu, tool } = practice;
  return (
    <AnimatePresence>
      {toolMenu && tool === 'pen' && (
        <PenWidth
          key="pen-width"
          width={penWidth}
          onChange={(next) => patchSettings({ penWidth: next })}
          className={className}
        />
      )}
      {toolMenu && tool === 'arrow' && (
        <ArrowSnap
          key="arrow-snap"
          snap={arrowSnap}
          onChange={(next) => patchSettings({ arrowSnap: next })}
          className={className}
        />
      )}
    </AnimatePresence>
  );
}

/**
 * The picker has no close button: it is put away by touching the drawing, or
 * the tool it came out of, or anywhere at all.
 */
export function MenuScrim({ practice }: { practice: Practice }) {
  if (!practice.toolMenu) return null;
  return (
    <button
      aria-label="Close the menu"
      onClick={() => practice.setToolMenu(false)}
      className="absolute inset-0 z-20 cursor-default"
    />
  );
}

/** The break between what draws and what undoes, as on the tablet rail. */
function Divider({ small }: { small?: boolean }) {
  return (
    <div
      aria-hidden
      className={cx('w-px shrink-0 self-center bg-border', small ? 'mx-1 h-[22px]' : 'mx-1.5 h-7')}
    />
  );
}

interface PhoneToolProps {
  children: ReactNode;
  label: string;
  onClick(): void;
  active?: boolean;
  small?: boolean;
  tint?: boolean;
}

/*
 * The S-Pen hovers on the phone too, so the names are here as well. The label
 * goes on whichever side has room: under the row along the top of the canvas,
 * over the row at the bottom of the screen.
 */
export function PhoneTool({ children, label, onClick, active, small, tint }: PhoneToolProps) {
  return (
    <HoverLabel label={label} side={small ? 'bottom' : 'top'}>
      <motion.button
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 700, damping: 30 }}
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className={cx(
          'grid shrink-0 place-items-center rounded-[10px] border',
          small ? 'size-[34px]' : 'size-[46px] rounded-md',
          active
            ? tint
              ? 'border-accent bg-accent/15 text-accent'
              : 'border-accent bg-accent text-on-accent'
            : 'border-border bg-raised text-muted',
        )}
      >
        {children}
      </motion.button>
    </HoverLabel>
  );
}
