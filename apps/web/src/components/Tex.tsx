import { useMemo } from 'react';
import katex from 'katex';
import { cx } from '@/lib/cx';

interface TexProps {
  children: string;
  display?: boolean;
  className?: string;
}

/**
 * KaTeX's Computer Modern is left alone on purpose — the serif/sans contrast
 * does real work separating "the problem" from "the app".
 */
export function Tex({ children, display = false, className }: TexProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(children, { throwOnError: false, displayMode: display });
    } catch {
      return children;
    }
  }, [children, display]);

  return (
    <span className={cx('inline-block max-w-full', className)} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
