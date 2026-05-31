import { motion } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import type { ConditionCard as ConditionCardType } from '@/types/game';
import { cn } from '@/lib/utils';

interface ConditionCardProps {
  card: ConditionCardType;
  onDragStart?: (e: React.DragEvent, card: ConditionCardType) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

const sourceLabel = { original: '原始', derived: '推导' } as const;
const sourceColor = {
  original: 'bg-amber-700 text-amber-100',
  derived: 'bg-blue-700 text-blue-100',
} as const;

const categoryLabel = { given: '已知', lemma: '引理', conclusion: '结论' } as const;
const categoryColor = {
  given: 'bg-emerald-800/60 text-emerald-300 border-emerald-600/40',
  lemma: 'bg-violet-800/60 text-violet-300 border-violet-600/40',
  conclusion: 'bg-rose-800/60 text-rose-300 border-rose-600/40',
} as const;

export default function ConditionCard({ card, onDragStart, onDragEnd }: ConditionCardProps) {
  const isOriginal = card.source === 'original';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      draggable
      onDragStart={(e) => {
        const nativeEvent = (e as unknown as { nativeEvent: React.DragEvent }).nativeEvent;
        if (onDragStart && nativeEvent) onDragStart(nativeEvent, card);
      }}
      onDragEnd={(e) => {
        const nativeEvent = (e as unknown as { nativeEvent: React.DragEvent }).nativeEvent;
        if (onDragEnd && nativeEvent) onDragEnd(nativeEvent);
      }}
      className={cn(
        'relative rounded-md p-3 cursor-grab active:cursor-grabbing select-none',
        'bg-gradient-to-br from-[#2a1a0e] to-[#1a0f06]',
        'shadow-md shadow-black/30',
        'transition-shadow hover:shadow-lg hover:shadow-amber-900/20',
        isOriginal
          ? 'border-2 border-amber-600/70'
          : 'border-2 border-dashed border-blue-500/60'
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 mt-0.5 text-amber-600/60 shrink-0" />

        <div className="flex-1 min-w-0 space-y-2">
          <p
            className="text-amber-50/90 text-xs leading-relaxed break-words"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {card.content}
          </p>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold',
                sourceColor[card.source]
              )}
            >
              {sourceLabel[card.source]}
            </span>
            <span
              className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border',
                categoryColor[card.category]
              )}
            >
              {categoryLabel[card.category]}
            </span>
          </div>
        </div>
      </div>

      {isOriginal && (
        <div className="absolute top-0 right-0 w-6 h-6">
          <div className="absolute top-0 right-0 w-0 h-0 border-t-[12px] border-t-amber-500 border-l-[12px] border-l-transparent" />
        </div>
      )}
    </motion.div>
  );
}
