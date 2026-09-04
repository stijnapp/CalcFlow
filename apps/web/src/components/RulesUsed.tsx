import { ruleById, type Problem } from '@calcflow/generators';
import { useStore } from '@/state/store';
import { Eyebrow } from './Eyebrow';
import { Tex } from './Tex';

/**
 * Shown once the answer is in. The book's whole premise is that these are meant
 * to be known by heart, so the moment just after working one is the moment the
 * rule is worth seeing again.
 */
export function RulesUsed({ problem }: { problem: Problem }) {
  const setOpenRule = useStore((s) => s.setOpenRule);
  const rules = [...new Set(problem.ruleIds)].map(ruleById).filter((r) => r !== undefined);
  if (rules.length === 0) return null;

  return (
    <section className="flex min-h-0 flex-col gap-2.5">
      <Eyebrow>RULES THIS USED</Eyebrow>
      <div className="scroll-y flex flex-col gap-2">
        {rules.map((rule) => (
          <button
            key={rule.id}
            onClick={() => setOpenRule(rule.id)}
            className="flex items-center gap-3.5 rounded-md border border-edge bg-card px-4 py-3 text-left hover:border-accent"
          >
            <span className="w-[132px] shrink-0 text-[13px] text-ink2">{rule.name}</span>
            <span className="min-w-0 flex-1 scroll-x text-base text-muted">
              <Tex>{rule.tex}</Tex>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
