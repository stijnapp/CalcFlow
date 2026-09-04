import { X } from 'lucide-react';
import { ruleById } from '@calcflow/generators';
import { useStore } from '@/state/store';
import { Tex } from './Tex';

export function RuleCardModal() {
  const openRule = useStore((s) => s.openRule);
  const setOpenRule = useStore((s) => s.setOpenRule);
  const rule = openRule ? ruleById(openRule) : undefined;
  if (!rule) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={rule.name}
      onClick={() => setOpenRule(null)}
      className="absolute inset-0 z-50 grid place-items-center bg-[rgba(8,7,6,0.66)] p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[560px] animate-rise flex-col gap-4 rounded-3xl border border-strong bg-overlay p-[30px] shadow-[0_40px_80px_-20px_#000]"
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] tracking-[0.12em] text-accent">
            CH {rule.chapter} · RULE CARD
          </span>
          <h2 className="text-[21px] font-semibold">{rule.name}</h2>
          <button
            onClick={() => setOpenRule(null)}
            aria-label="Close"
            className="ml-auto grid size-8 place-items-center rounded-[9px] border border-strong bg-raised text-muted hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid place-items-center scroll-x rounded-lg border border-border bg-card p-[26px] text-[26px]">
          <Tex>{rule.tex}</Tex>
        </div>

        <p className="text-sm leading-relaxed text-ink2 text-pretty">{rule.note}</p>
      </div>
    </div>
  );
}
