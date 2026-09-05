import { useRef, useState, type PointerEvent } from 'react';
import { motion } from 'motion/react';

interface Props {
  label: string;
  hint?: string;
  /** 1-based index into `stops`. */
  value: number;
  stops: readonly number[];
  onChange(value: number): void;
}

/**
 * The handle tracks the finger and only settles onto a stop once he lets go.
 * The readout always names the stop it would settle on, so the number on the
 * right is a promise about where the handle is going, not a lagging report.
 */
export function Slider({ label, hint, value, stops, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const last = stops.length - 1;
  const dragging = ratio !== null;
  const pct = (dragging ? ratio : (value - 1) / last) * 100;

  function moveTo(clientX: number) {
    const rect = trackRef.current!.getBoundingClientRect();
    const r = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setRatio(r);
    onChange(Math.round(r * last) + 1);
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    moveTo(e.clientX);
  }

  const glide = dragging ? { duration: 0 } : { type: 'spring' as const, stiffness: 460, damping: 34 };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2.5">
        <div className="text-[15px] font-medium">{label}</div>
        {hint && <div className="text-[13px] text-faint">{hint}</div>}
        <motion.div
          key={value}
          initial={{ opacity: 0, y: -7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="ml-auto font-mono text-xl text-accent"
        >
          {stops[value - 1]}
        </motion.div>
      </div>
      <div className="px-[11px]">
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={stops[0]}
          aria-valuemax={stops[last]}
          aria-valuenow={stops[value - 1]}
          onPointerDown={onDown}
          onPointerMove={(e) => dragging && moveTo(e.clientX)}
          onPointerUp={() => setRatio(null)}
          onPointerCancel={() => setRatio(null)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') onChange(Math.max(1, value - 1));
            if (e.key === 'ArrowRight') onChange(Math.min(stops.length, value + 1));
          }}
          className="no-touch relative h-[34px] cursor-pointer"
        >
          <div className="absolute inset-x-0 top-[15px] h-1 rounded-full bg-border" />
          <motion.div
            className="absolute left-0 top-[15px] h-1 rounded-full bg-accent"
            animate={{ width: `${pct}%` }}
            transition={glide}
          />
          {stops.map((stop, i) => (
            <div
              key={stop}
              className="absolute top-[13px] -ml-1 size-2 rounded-full"
              style={{
                left: `${(i / last) * 100}%`,
                // Hidden under the resting handle, but shown again the moment the
                // handle leaves it: that dot is where letting go would land.
                background:
                  !dragging && i === value - 1
                    ? 'transparent'
                    : i < value - 1
                      ? '#8a5f18'
                      : '#443c36',
              }}
            />
          ))}
          <motion.div
            className="absolute top-[6px] -ml-[11px] size-[22px] rounded-full bg-accent shadow-[0_3px_10px_rgba(0,0,0,0.55)]"
            animate={{ left: `${pct}%`, scale: dragging ? 1.16 : 1 }}
            transition={glide}
          />
        </div>
      </div>
    </div>
  );
}
