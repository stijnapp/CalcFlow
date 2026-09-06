import { useMemo } from 'react';
import katex from 'katex';
import { copyText } from '@/lib/copyText';
import { cx } from '@/lib/cx';
import { useLongPress } from '@/lib/useLongPress';
import { useStore } from '@/state/store';

interface TexProps {
  children: string;
  display?: boolean;
  className?: string;
  /**
   * Off for maths that is the face of a button — a notation key, a key being
   * edited in settings. Those are things to press, not things to read off.
   */
  copy?: boolean;
}

/**
 * KaTeX's Computer Modern is left alone on purpose — the serif/sans contrast
 * does real work separating "the problem" from "the app".
 *
 * Holding a finger on rendered maths copies the LaTeX behind it. Every display
 * in the app is one of these, so a prompt he wants to tweak in the answer field
 * or paste somewhere is a hold away rather than something to retype by eye.
 */
export function Tex({ children, display = false, className, copy = true }: TexProps) {
  const showToast = useStore((s) => s.showToast);
  const html = useMemo(() => {
    try {
      return katex.renderToString(children, { throwOnError: false, displayMode: display });
    } catch {
      return children;
    }
  }, [children, display]);

  const hold = useLongPress(() => {
    void copyText(children).then((ok) => {
      showToast(ok ? 'Copied the LaTeX' : 'Could not reach the clipboard');
    });
  });

  return (
    <span
      {...(copy ? hold : null)}
      className={cx(
        'inline-block max-w-full',
        // Without this a hold starts Android's own text selection instead, and
        // KaTeX's markup selects into nonsense anyway.
        copy && 'select-none [-webkit-touch-callout:none]',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
