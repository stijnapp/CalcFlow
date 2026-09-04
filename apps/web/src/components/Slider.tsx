import { useRef, useState, type PointerEvent } from 'react';

interface Props {
  label: string;
  hint: string;
  value: number;
  onChange(value: number): void;
  min?: number;
  max?: number;
}

/** A five-stop slider. The handle grows on grab; the readout crossfades. */
export function Slider({ label, hint, value, onChange, min = 1, max = 5 }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [grabbed, setGrabbed] = useState(false);
  const span = max - min;
  const pct = ((value - min) / span) * 100;

  function valueAt(clientX: number): number {
    const rect = trackRef.current!.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return min + Math.round(ratio * span);
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setGrabbed(true);
    onChange(valueAt(e.clientX));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2.5">
        <div className="text-[15px] font-medium">{label}</div>
        <div className="text-[13px] text-faint">{hint}</div>
        <div key={value} className="ml-auto animate-rise font-mono text-xl text-accent">
          {value}
        </div>
      </div>
      <div className="px-[11px]">
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          onPointerDown={onDown}
          onPointerMove={(e) => grabbed && onChange(valueAt(e.clientX))}
          onPointerUp={() => setGrabbed(false)}
          onPointerCancel={() => setGrabbed(false)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') onChange(Math.max(min, value - 1));
            if (e.key === 'ArrowRight') onChange(Math.min(max, value + 1));
          }}
          className="no-touch relative h-[34px] cursor-pointer"
        >
          <div className="absolute inset-x-0 top-[15px] h-1 rounded-full bg-border" />
          <div className="absolute left-0 top-[15px] h-1 rounded-full bg-accent" style={{ width: `${pct}%` }} />
          {Array.from({ length: span + 1 }, (_, i) => min + i).map((tick) => (
            <div
              key={tick}
              className="absolute top-[13px] -ml-1 size-2 rounded-full"
              style={{
                left: `${((tick - min) / span) * 100}%`,
                background: tick === value ? 'transparent' : tick < value ? '#8a5f18' : '#443c36',
              }}
            />
          ))}
          <div
            className="absolute top-[6px] -ml-[11px] size-[22px] rounded-full bg-accent shadow-[0_3px_10px_rgba(0,0,0,0.55)] transition-[left,transform] duration-100"
            style={{ left: `${pct}%`, transform: `scale(${grabbed ? 1.15 : 1})` }}
          />
        </div>
      </div>
    </div>
  );
}
