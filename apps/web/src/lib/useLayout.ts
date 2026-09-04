import { useEffect, useState } from 'react';

export type Layout = 'tablet' | 'phone';

/**
 * The Tab S11 is landscape-only and the S23 Ultra portrait-only, so one width
 * threshold separates the two layouts cleanly.
 */
export function useLayout(): Layout {
  const [layout, setLayout] = useState<Layout>(() => measure());

  useEffect(() => {
    const update = () => setLayout(measure());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return layout;
}

function measure(): Layout {
  return window.innerWidth >= 900 ? 'tablet' : 'phone';
}
