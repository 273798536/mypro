import { useDroppable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConclusionSlot as ConclusionSlotType, PlacedCard, Connection, ConditionCard, LemmaCard } from '@/types/game';

interface ConclusionSlotProps {
  slot: ConclusionSlotType;
  placedCards: PlacedCard[];
  onCardDrop: (slotId: string, cardId: string, cardType: string) => void;
  onCardRemove: (slotId: string, cardId: string) => void;
  connections: Connection[];
  conditionCards?: ConditionCard[];
  lemmaCards?: LemmaCard[];
}

export default function ConclusionSlot({
  slot,
  placedCards,
  onCardDrop,
  onCardRemove,
  connections,
  conditionCards = [],
  lemmaCards = [],
}: ConclusionSlotProps) {
  void onCardDrop;
  void connections;

  const { setNodeRef, isOver } = useDroppable({
    id: slot.id,
    data: { type: 'conclusion', slot },
  });

  const slotPlacedCards = placedCards.filter((pc) => pc.slotId === slot.id);

  const getCardInfo = (cardId: string, cardType: string) => {
    if (cardType === 'condition') {
      return conditionCards.find((c) => c.id === cardId);
    }
    return lemmaCards.find((l) => l.id === cardId);
  };

  const handleRemove = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onCardRemove(slot.id, cardId);
  };

  const allConditionsMet = slot.requiredConditionIds.every((condId) =>
    slotPlacedCards.some((pc) => pc.cardId === condId && pc.cardType === 'condition')
  );

  const lemmaPlaced = slotPlacedCards.some(
    (pc) => pc.cardId === slot.requiredLemmaId && pc.cardType === 'lemma'
  );

  const isComplete = allConditionsMet && lemmaPlaced;

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: 1,
        boxShadow: isOver
          ? '0 0 20px rgba(139, 92, 246, 0.3)'
          : isComplete
          ? '0 0 15px rgba(16, 185, 129, 0.2)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
      }}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative w-80 min-h-48 rounded-xl border-2 border-dashed p-4 bg-white transition-all duration-300',
        isOver
          ? 'border-accent-violet bg-accent-violet/5 scale-102'
          : isComplete
          ? 'border-accent-emerald border-solid bg-accent-emerald/5'
          : 'border-accent-violet'
      )}
    >
      <div className="absolute -top-3 left-4">
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold text-white',
            isComplete ? 'bg-accent-emerald' : 'bg-accent-violet'
          )}
        >
          步骤{slot.stepNumber}
        </span>
      </div>

      <div className="mt-2 mb-4">
        <p className="text-sm font-serif text-neutral-ink leading-relaxed">
          {slot.content}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-neutral-slate">
            需要 {slot.requiredConditionIds.length} 个条件 + 1 个引理
          </span>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              isComplete
                ? 'bg-accent-emerald/10 text-accent-emerald'
                : 'bg-neutral-slate/10 text-neutral-slate'
            )}
          >
            {slotPlacedCards.length}/{slot.requiredConditionIds.length + 1}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {slotPlacedCards.map((placedCard) => {
            const cardInfo = getCardInfo(placedCard.cardId, placedCard.cardType);
            if (!cardInfo) return null;

            const isCorrectCard =
              (placedCard.cardType === 'condition' &&
                slot.requiredConditionIds.includes(placedCard.cardId)) ||
              (placedCard.cardType === 'lemma' &&
                placedCard.cardId === slot.requiredLemmaId);

            const cardName =
              placedCard.cardType === 'condition'
                ? (cardInfo as ConditionCard).content
                : (cardInfo as LemmaCard).name;

            return (
              <motion.div
                key={`${placedCard.slotId}-${placedCard.cardId}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'flex items-center justify-between p-2 rounded-lg border',
                  isCorrectCard
                    ? 'bg-accent-emerald/10 border-accent-emerald/30'
                    : 'bg-accent-rose/10 border-accent-rose/30'
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      placedCard.cardType === 'condition'
                        ? 'bg-accent-amber text-white'
                        : 'bg-accent-emerald text-white'
                    )}
                  >
                    {placedCard.cardType === 'condition' ? '条件' : '引理'}
                  </span>
                  <span className="text-sm text-neutral-ink font-serif truncate max-w-44">
                    {cardName}
                  </span>
                </div>
                <button
                  onClick={(e) => handleRemove(placedCard.cardId, e)}
                  className="p-1 rounded-full hover:bg-white/50 transition-colors text-neutral-slate hover:text-accent-rose"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {slotPlacedCards.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center h-16 border-2 border-dashed border-neutral-slate/20 rounded-lg"
          >
            <span className="text-sm text-neutral-slate/60">拖拽卡片到此处</span>
          </motion.div>
        )}
      </div>

      {slot.hasCounterexample && (
        <div className="absolute top-2 right-2">
          <span className="text-xs bg-accent-violet/10 text-accent-violet px-2 py-0.5 rounded-full">
            有反例
          </span>
        </div>
      )}

      <div className="absolute bottom-2 right-2">
        <span className="text-xs text-neutral-slate/60">{slot.points} 分</span>
      </div>
    </motion.div>
  );
}
