import { useEffect } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Notices } from '@/components/Notices';
import { RuleCardModal } from '@/components/RuleCardModal';
import { Toast } from '@/components/Toast';
import { useLayout } from '@/lib/useLayout';
import { bindNavigate, useStore } from '@/state/store';
import { Home } from '@/screens/Home';
import { PracticePhone } from '@/screens/PracticePhone';
import { PracticeTablet } from '@/screens/PracticeTablet';
import { Rules } from '@/screens/Rules';
import { Settings } from '@/screens/Settings';
import { Stats } from '@/screens/Stats';
import { Summary } from '@/screens/Summary';

export function App() {
  const ready = useStore((s) => s.ready);
  const session = useStore((s) => s.session);
  const reducedMotion = useStore((s) => s.settings.reducedMotion);
  const init = useStore((s) => s.init);
  const navigate = useNavigate();
  const location = useLocation();
  const layout = useLayout();

  // The store asks for moves; the router makes them, so the device back button
  // walks the same history the app built.
  bindNavigate(navigate);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reducedMotion);
  }, [reducedMotion]);

  if (!ready) {
    return (
      <div className="grid h-full place-items-center bg-page">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="font-mono text-xs tracking-[0.14em] text-faint"
        >
          CALCFLOW
        </motion.span>
      </div>
    );
  }

  const compact = layout === 'phone';

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>
      {/* `clip` and not `hidden`: a hidden box is still a scroll container, and
          focusing the answer had the browser reveal it by scrolling this one —
          the header went off the top of the phone and stayed there for the rest
          of the session. A clipped box cannot be scrolled at all, so the
          keyboard moves the visual viewport instead, which comes back by
          itself. */}
      <main className="relative h-full overflow-clip bg-page">
        <AnimatePresence initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Page><Home compact={compact} /></Page>} />
            <Route
              path="/practice"
              element={
                session ? (
                  <Page fade>{layout === 'tablet' ? <PracticeTablet /> : <PracticePhone />}</Page>
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route path="/summary" element={<Page><Summary compact={compact} /></Page>} />
            <Route path="/stats" element={<Page><Stats compact={compact} /></Page>} />
            <Route path="/settings" element={<Page><Settings /></Page>} />
            <Route path="/rules" element={<Page><Rules compact={compact} /></Page>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>

        <RuleCardModal />
        <Notices />
        <Toast />
      </main>
    </MotionConfig>
  );
}

/**
 * Screens cross-fade and slide a few pixels along the direction of travel. The
 * canvas gets the plain fade: sliding a drawing surface reads as a smear.
 */
function Page({ children, fade }: { children: React.ReactNode; fade?: boolean }) {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0, y: fade ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: fade ? 0 : -10 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
