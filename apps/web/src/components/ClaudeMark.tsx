/**
 * Claude's sunburst, drawn here because lucide has no brand icons. Ten tapered
 * rays on a 24 grid, so it sits next to a lucide glyph at the same size without
 * looking heavier or lighter than one.
 */
export function ClaudeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M13.15 12.00L12.00 2.40L10.85 12.00ZM12.93 12.68L15.88 6.66L11.07 11.32ZM12.36 13.09L20.18 9.34L11.64 10.91ZM11.64 13.09L19.04 14.29L12.36 10.91ZM11.07 12.68L17.64 19.77L12.93 11.32ZM10.85 12.00L12.00 18.60L13.15 12.00ZM11.07 11.32L6.95 18.96L12.93 12.68ZM11.64 10.91L4.96 14.29L12.36 13.09ZM12.36 10.91L2.87 9.03L11.64 13.09ZM12.93 11.32L8.12 6.66L11.07 12.68Z" />
    </svg>
  );
}
