import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';

/**
 * The name of a control, shown when the pen hovers over it. Holding an S-Pen a
 * few millimetres off the glass puts a cursor on screen and fires the same
 * hover events a mouse does, which is a whole channel the app was not using:
 * he can read what a key does without pressing it and finding out.
 *
 * A portal, because the notation row and the tool rail both live inside
 * scrollers, and a label positioned inside one is clipped by it. Touch is left
 * out on purpose — a finger tap would flash a label nobody asked for on its way
 * to pressing the thing.
 */
export function HoverLabel({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);

  return (
    <span
      className={className}
      onPointerEnter={(e) => {
        if (e.pointerType === 'touch') return;
        const box = e.currentTarget.getBoundingClientRect();
        setAt({ x: box.left + box.width / 2, y: box.top });
      }}
      onPointerLeave={() => setAt(null)}
      onPointerDown={() => setAt(null)}
    >
      {children}
      {createPortal(
        <AnimatePresence>
          {at && (
            <motion.span
              role="tooltip"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12 }}
              style={{
                left: Math.round(at.x),
                top: Math.round(at.y - 8),
                // Clamped by the translate rather than by measuring: the label
                // is small and never near enough to an edge for it to matter.
                transform: 'translate(-50%, -100%)',
              }}
              className="pointer-events-none fixed z-50 max-w-[60vw] whitespace-nowrap rounded-md border border-strong bg-overlay px-2 py-1 text-[12px] text-ink shadow-[0_8px_20px_-6px_#000]"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </span>
  );
}
