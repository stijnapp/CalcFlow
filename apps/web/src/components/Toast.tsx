import { useStore } from '@/state/store';

/** Brief, non-blocking, and always says what happened. */
export function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute bottom-7 left-1/2 z-40 -translate-x-1/2 animate-rise rounded-full border border-strong bg-overlay px-5 py-2.5 text-sm shadow-[0_12px_30px_-8px_#000]"
    >
      {toast}
    </div>
  );
}
