import { cx } from '@/lib/cx';

/**
 * The small mono label above a block. The mono/caps pairing is what separates
 * app chrome from KaTeX's serif maths, so it earns its keep here.
 */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('font-mono text-[11px] tracking-[0.14em] text-faint', className)}>{children}</div>
  );
}
