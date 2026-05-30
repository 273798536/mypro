import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDragDrop } from '@/hooks/useDragDrop';
import { cn } from '@/lib/utils';
import { renderLatex } from '@/utils/math';
import type { ConditionCard as ConditionCardType } from '@/types/game';

interface ConditionCardProps {
  card: ConditionCardType;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string) => void;
}

export default function ConditionCard({ card, onDragStart, onDragEnd }: ConditionCardProps) {
  const { draggableProps, droppableProps, isDragging, transform } = useDragDrop({
    id: card.id,
    data: { type: 'condition', card },
    disabled: card.isUsed,
  });

  const renderedLatex = useMemo(() => {
    if (!card.latex) return null;
    return renderLatex(card.latex);
  }, [card.latex]);

  const handleDragStart = () => {
    onDragStart?.(card.id);
  };

  const handleDragEnd = () => {
    onDragEnd?.(card.id);
  };

  return (
    <motion.div
      ref={droppableProps}
      {...draggableProps.attributes}
      {...draggableProps.listeners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{ transform: transform ?? undefined }}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: card.isUsed ? 0.5 : 1,
        y: 0,
        scale: isDragging ? 1.05 : 1,
        zIndex: isDragging ? 50 : 1,
      }}
      transition={{ duration: 0.2 }}
      whileHover={{
        y: card.isUsed ? 0 : -4,
        boxShadow: card.isUsed
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)'
          : '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
      }}
      className={cn(
        'relative w-64 rounded-xl border-2 bg-white p-4 shadow-card cursor-grab active:cursor-grabbing',
        'border-accent-amber',
        card.isUsed && 'cursor-not-allowed',
        isDragging && 'shadow-glow opacity-80'
      )}
    >
      <div className="absolute -top-3 left-4">
        <span className="rounded-full bg-accent-amber px-3 py-1 text-xs font-semibold text-white">
          条件
        </span>
      </div>

      <div className="mt-2">
        <div className="text-sm text-neutral-slate mb-2 font-serif">
          {card.content}
        </div>
        {renderedLatex && (
          <div
            dangerouslySetInnerHTML={{ __html: renderedLatex }}
            className="text-base font-mono text-neutral-ink bg-neutral-ivory rounded-lg p-2 mt-2 border border-neutral-ivory"
          />
        )}
      </div>

      {card.isRequired && (
        <div className="absolute top-2 right-2">
          <span className="text-xs bg-accent-amber/10 text-accent-amber px-2 py-0.5 rounded-full">
            必要
          </span>
        </div>
      )}

      {card.isUsed && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-xl">
          <span className="text-sm text-neutral-slate font-medium">已使用</span>
        </div>
      )}
    </motion.div>
  );
}
