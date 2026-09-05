import { useRef, type PointerEvent } from 'react';
import { motion } from 'motion/react';
import { cx } from '@/lib/cx';

export const PEN_MIN = 1.2;
export const PEN_MAX = 12;

interface Props {
  width: number;
  onChange(next: number): void;
  className?: string;
}

/**
 * The width picker, borrowed wholesale from a notes app: a stroke drawn at the
 * chosen width sits above the slider, so the choice is made by looking at the
 * line rather than at a number.
 */
export function PenWidth({ width, onChange, className }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const ratio = (width - PEN_MIN) / (PEN_MAX - PEN_MIN);

  function moveTo(clientX: number) {
    const rect = trackRef.current!.getBoundingClientRect();
    const r = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onChange(Math.round((PEN_MIN + r * (PEN_MAX - PEN_MIN)) * 10) / 10);
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    moveTo(e.clientX);
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -6 }}
      transition={{ type: 'spring', stiffness: 560, damping: 38 }}
      onPointerDown={(e) => e.stopPropagation()}
      className={cx(
        'z-30 flex w-[210px] flex-col gap-3 rounded-lg border border-strong bg-overlay p-3.5 shadow-[0_24px_50px_-18px_#000]',
        className,
      )}
    >
      <div className="grid h-11 place-items-center rounded-md border border-edge bg-canvas px-3">
        <svg viewBox="0 0 160 28" className="h-7 w-full" aria-hidden>
          {/* A curve, not a bar: thickness reads differently once it turns. */}
          <path
            d="M6 21 C 40 3, 60 25, 88 14 S 134 6, 154 10"
            fill="none"
            stroke="#efe7db"
            strokeWidth={width}
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Pen width"
        aria-valuemin={PEN_MIN}
        aria-valuemax={PEN_MAX}
        aria-valuenow={width}
        onPointerDown={onDown}
        onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') onChange(Math.max(PEN_MIN, Math.round((width - 0.4) * 10) / 10));
          if (e.key === 'ArrowRight') onChange(Math.min(PEN_MAX, Math.round((width + 0.4) * 10) / 10));
        }}
        className="no-touch relative mx-[9px] h-6 cursor-pointer"
      >
        <div className="absolute inset-x-0 top-[10px] h-1 rounded-full bg-border" />
        <div
          className="absolute left-0 top-[10px] h-1 rounded-full bg-accent"
          style={{ width: `${ratio * 100}%` }}
        />
        <div
          className="absolute top-[3px] -ml-[9px] size-[18px] rounded-full bg-accent shadow-[0_2px_8px_rgba(0,0,0,0.55)]"
          style={{ left: `${ratio * 100}%` }}
        />
      </div>
    </motion.div>
  );
}
