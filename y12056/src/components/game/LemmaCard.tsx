import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useDragDrop } from '@/hooks/useDragDrop';
import { cn } from '@/lib/utils';
import type { LemmaCard as LemmaCardType } from '@/types/game';

interface LemmaCardProps {
  card: LemmaCardType;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string) => void;
}

export default function LemmaCard({ card, onDragStart, onDragEnd }: LemmaCardProps) {
  const { draggableProps, droppableProps, isDragging, transform } = useDragDrop({
    id: card.id,
    data: { type: 'lemma', card },
  });

  const handleDragStart = () => {
    onDragStart?.(card.id);
  };

  const handleDragEnd = () => {
    onDragEnd?.(card.id);
  };

  const borderColor = card.isCorrect ? 'border-accent-emerald' : 'border-neutral-slate';

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
        opacity: 1,
        y: 0,
        scale: isDragging ? 1.05 : 1,
        zIndex: isDragging ? 50 : 1,
      }}
      transition={{ duration: 0.2 }}
      whileHover={{
        y: -4,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
      }}
      className={cn(
        'relative w-64 rounded-xl border-2 bg-white p-4 shadow-card cursor-grab active:cursor-grabbing',
        borderColor,
        isDragging && 'shadow-glow opacity-80'
      )}
    >
      <div className="absolute -top-3 left-4">
        <span className="rounded-full bg-accent-emerald px-3 py-1 text-xs font-semibold text-white">
          引理
        </span>
      </div>

      <div className="mt-2">
        <h4 className="font-serif font-bold text-lg text-neutral-ink mb-2">
          {card.name}
        </h4>
        <p className="text-sm text-neutral-slate font-serif leading-relaxed">
          {card.description}
        </p>
      </div>

      {!card.isCorrect && (
        <div className="absolute top-2 right-2">
          <span className="text-xs bg-neutral-slate/10 text-neutral-slate px-2 py-0.5 rounded-full flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            陷阱
          </span>
        </div>
      )}

      {card.commonMistakes && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          whileHover={{ opacity: 1, height: 'auto' }}
          className="overflow-hidden"
        >
          <div className="mt-3 pt-3 border-t border-dashed border-neutral-slate/20">
            <div className="flex items-start gap-2 text-xs text-accent-rose">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">常见错误：</p>
                <p className="text-neutral-slate">{card.commonMistakes}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
