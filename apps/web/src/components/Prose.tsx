import { Fragment } from 'react';
import { Tex } from './Tex';

/**
 * A line of writing with maths in it. The maths is fenced in `$…$` and set by
 * KaTeX like every other expression in the app; everything outside the fences
 * is text. Written out as characters — `b²−4ac`, `t³` — the same symbols come
 * out in the interface font, at the wrong size, on a different baseline, and
 * anything that will not fit in a single unicode character (a fraction, a root,
 * a subscripted log) cannot be written that way at all.
 */
export function Prose({ children, className }: { children: string; className?: string }) {
  return (
    <p className={className}>
      {parts(children).map((part, i) =>
        i % 2 === 1 ? (
          <Tex key={i} copy={false}>
            {part}
          </Tex>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </p>
  );
}

/** Text, maths, text, maths — odd indices are what was between the fences. */
function parts(source: string): string[] {
  return source.split('$');
}

/** The same line with the fences taken out, for searching and for aria labels. */
export function plainProse(source: string): string {
  return source.split('$').join('');
}
