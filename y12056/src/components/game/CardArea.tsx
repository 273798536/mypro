import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import ConditionCard from './ConditionCard';
import LemmaCard from './LemmaCard';
import type { ConditionCard as ConditionCardType, LemmaCard as LemmaCardType } from '@/types/game';

type CardType = 'condition' | 'lemma';

interface CardAreaProps {
  title: string;
  cards: (ConditionCardType | LemmaCardType)[];
  cardType: CardType;
  onCardDragStart?: (id: string) => void;
  onCardDragEnd?: (id: string) => void;
  onReorder?: (cards: (ConditionCardType | LemmaCardType)[]) => void;
}

interface SortableCardProps {
  card: ConditionCardType | LemmaCardType;
  cardType: CardType;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string) => void;
}

function SortableCard({ card, cardType, onDragStart, onDragEnd }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: cardType, card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'absolute left-1 top-1/2 -translate-y-1/2 z-20 p-1 rounded cursor-grab active:cursor-grabbing',
          'opacity-0 hover:opacity-100 transition-opacity',
          'bg-white/80 text-neutral-slate hover:text-neutral-ink'
        )}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {cardType === 'condition' ? (
        <ConditionCard
          card={card as ConditionCardType}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ) : (
        <LemmaCard
          card={card as LemmaCardType}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      )}
    </div>
  );
}

export default function CardArea({
  title,
  cards,
  cardType,
  onCardDragStart,
  onCardDragEnd,
  onReorder,
}: CardAreaProps) {
  const cardIds = useMemo(() => cards.map((card) => card.id), [cards]);

  const handleDragEnd = (event: { active: { id: string }; over: { id: string } | null }) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = cardIds.indexOf(active.id as string);
      const newIndex = cardIds.indexOf(over.id as string);

      if (oldIndex !== -1 && newIndex !== -1 && onReorder) {
        const newCards = arrayMove(cards, oldIndex, newIndex);
        onReorder(newCards);
      }
    }

    onCardDragEnd?.(active.id as string);
  };

  const handleDragStart = (event: { active: { id: string } }) => {
    onCardDragStart?.(event.active.id as string);
  };

  const availableCards = cards.filter((card) => {
    if (card.type === 'condition') {
      return !(card as ConditionCardType).isUsed;
    }
    return true;
  });

  const usedCount = cards.length - availableCards.length;

  const headerColor = cardType === 'condition' ? 'bg-accent-amber' : 'bg-accent-emerald';
  const borderColor = cardType === 'condition' ? 'border-accent-amber/20' : 'border-accent-emerald/20';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'rounded-2xl border bg-white/50 backdrop-blur-sm shadow-card overflow-hidden',
        borderColor
      )}
    >
      <div className={cn('px-5 py-3 flex items-center justify-between', headerColor)}>
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-white" />
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {usedCount > 0 && (
            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
              已使用 {usedCount}
            </span>
          )}
          <span className="text-xs bg-white/30 text-white px-2 py-0.5 rounded-full font-medium">
            {availableCards.length} 张
          </span>
        </div>
      </div>

      <div className="p-4">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-wrap gap-4">
            {cards.map((card) => (
              <SortableCard
                key={card.id}
                card={card}
                cardType={cardType}
                onDragStart={handleDragStart as unknown as (id: string) => void}
                onDragEnd={handleDragEnd as unknown as (id: string) => void}
              />
            ))}
          </div>
        </SortableContext>

        {cards.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-neutral-slate/60"
          >
            <Layers className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">暂无卡片</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
