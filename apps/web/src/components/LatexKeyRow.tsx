import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '@/state/store';
import { insertKey, moveCaret } from '@/lib/latexInput';
import { latexKey } from '@/lib/latexKeys';
import { Tex } from './Tex';
import { cx } from '@/lib/cx';

interface Props {
  compact?: boolean;
}

/** The long notation, one tap each. Everything else is his own keyboard. */
export function LatexKeyRow({ compact }: Props) {
  const ids = useStore((s) => s.settings.keys);
  const setAnswer = useStore((s) => s.setAnswer);
  const keys = ids.map(latexKey).filter((k) => k !== undefined);

  return (
    <div className="flex items-stretch gap-1.5">
      <div className="scroll-x flex min-w-0 flex-1 gap-1.5">
        {keys.map((key) => (
          <motion.button
            key={key.id}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 700, damping: 30 }}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              const next = insertKey(key);
              if (next !== null) setAnswer(next);
            }}
            aria-label={key.name}
            className={cx(
              'grid shrink-0 place-items-center rounded-[10px] border border-border bg-raised px-3 text-ink transition-colors hover:border-accent active:bg-overlay',
              compact ? 'h-[42px] min-w-[46px] text-[15px]' : 'h-[46px] min-w-[52px] text-[17px]',
            )}
          >
            <Tex>{key.tex}</Tex>
          </motion.button>
        ))}
        {keys.length === 0 && (
          <div className="grid h-[42px] flex-1 place-items-center text-[13px] text-faint">
            Add keys in settings
          </div>
        )}
      </div>
      {(['left', 'right'] as const).map((dir) => (
        <motion.button
          key={dir}
          whileTap={{ scale: 0.92 }}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => moveCaret(dir === 'left' ? -1 : 1)}
          aria-label={dir === 'left' ? 'Move the caret left' : 'Move the caret right'}
          className={cx(
            'grid shrink-0 place-items-center rounded-[10px] border border-edge bg-sunken text-muted hover:border-accent hover:text-ink',
            compact ? 'h-[42px] w-[42px]' : 'h-[46px] w-[46px]',
          )}
        >
          {dir === 'left' ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
        </motion.button>
      ))}
    </div>
  );
}
