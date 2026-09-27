import { useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cx } from '@/lib/cx';
import { useKeyBar } from '@/lib/keyBar';
import { resolveKeys } from '@/lib/latexKeys';
import { useKeyboardInset } from '@/lib/useKeyboardInset';
import { useLayout } from '@/lib/useLayout';
import { useStore } from '@/state/store';
import { NotationRow } from './NotationRow';

const SPRING = { type: 'spring' as const, stiffness: 520, damping: 42 };

/**
 * The notation keys, floating on top of the on-screen
 * keyboard while a LaTeX field has the caret. Nothing on it takes focus — a
 * press that moved the caret out of the field would close the keyboard it is
 * sitting on — so every press lands in the field he was already typing in.
 */
export function KeyBar() {
  const target = useKeyBar((s) => s.target);
  const on = useStore((s) => s.settings.keyBar);
  const ids = useStore((s) => s.settings.keys);
  const custom = useStore((s) => s.settings.customKeys);
  const keyboard = useKeyboardInset();
  const ref = useRef<HTMLDivElement>(null);
  const shown = on && target !== null;
  const layout = useLayout();

  /*
   * On the phone the bar is the width of the screen, like the keyboard it sits
   * on. On the tablet that would run it across the canvas and over the bottom
   * of the tool rail, so it lines up under the field instead — the answer
   * column, or the line being placed on the canvas.
   */
  const [measured, setMeasured] = useState<{ left: number; width: number; of: typeof target } | null>(null);
  useLayoutEffect(() => {
    const el = target?.anchor();
    if (layout !== 'tablet' || !el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setMeasured({ left: r.left, width: r.width, of: target });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [target, layout]);
  // A measurement of another field, or from before the layout changed, is not this one's.
  const span = layout === 'tablet' && measured?.of === target ? measured : null;

  // Published so the answer sheet can stand on the bar rather than under it.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!shown || !el) return;
    const ro = new ResizeObserver(() => useKeyBar.setState({ height: el.offsetHeight }));
    ro.observe(el);
    return () => {
      ro.disconnect();
      useKeyBar.setState({ height: 0 });
    };
  }, [shown]);

  // Read at the press, not captured at render: the bar outlives its field by
  // the length of its own exit.
  const into = () => useKeyBar.getState().target;

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          ref={ref}
          key="key-bar"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={SPRING}
          style={span ? { bottom: keyboard + 12, left: span.left, width: span.width } : { bottom: keyboard }}
          onPointerDown={(e) => e.preventDefault()}
          className={cx(
            'fixed z-[60] flex items-stretch gap-1.5 bg-card px-2 py-1.5 shadow-[0_-12px_30px_-16px_color-mix(in_srgb,var(--color-shadow)_70%,transparent)]',
            span ? 'rounded-lg border border-border' : 'inset-x-0 border-t border-border',
          )}
        >
          <NotationRow keys={resolveKeys(ids, custom)} compact onInsert={(key) => into()?.insert(key)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
