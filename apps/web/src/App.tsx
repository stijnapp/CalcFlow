import { useEffect } from 'react';
import { RuleCardModal } from '@/components/RuleCardModal';
import { Toast } from '@/components/Toast';
import { useLayout } from '@/lib/useLayout';
import { useStore } from '@/state/store';
import { Home } from '@/screens/Home';
import { PracticePhone } from '@/screens/PracticePhone';
import { PracticeTablet } from '@/screens/PracticeTablet';
import { Rules } from '@/screens/Rules';
import { Settings } from '@/screens/Settings';
import { Stats } from '@/screens/Stats';
import { Summary } from '@/screens/Summary';

export function App() {
  const ready = useStore((s) => s.ready);
  const screen = useStore((s) => s.screen);
  const session = useStore((s) => s.session);
  const reducedMotion = useStore((s) => s.settings.reducedMotion);
  const init = useStore((s) => s.init);
  const layout = useLayout();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reducedMotion);
  }, [reducedMotion]);

  if (!ready) {
    return (
      <div className="grid h-full place-items-center bg-page">
        <span className="font-mono text-xs tracking-[0.14em] text-faint">CALCFLOW</span>
      </div>
    );
  }

  const compact = layout === 'phone';

  return (
    <main className="relative h-full overflow-hidden bg-page">
      {screen === 'home' && <Home compact={compact} />}
      {screen === 'practice' &&
        session &&
        (layout === 'tablet' ? <PracticeTablet /> : <PracticePhone />)}
      {screen === 'summary' && <Summary compact={compact} />}
      {screen === 'stats' && <Stats compact={compact} />}
      {screen === 'settings' && <Settings />}
      {screen === 'rules' && <Rules compact={compact} />}

      <RuleCardModal />
      <Toast />
    </main>
  );
}
