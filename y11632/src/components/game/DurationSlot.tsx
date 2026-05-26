import { motion } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { Package } from 'lucide-react';
import type { BondCard as BondCardType } from '@/types';
import { getBondById } from '@/data/bonds';

interface DurationSlotProps {
  slot: {
    id: string;
    label: string;
    minDuration: number;
    maxDuration: number;
  };
  placedBondIds: string[];
  onRemoveBond: (bondId: string) => void;
  isHighlighted?: boolean;
  hasError?: boolean;
}

export default function DurationSlot({
  slot,
  placedBondIds,
  onRemoveBond,
  isHighlighted,
  hasError,
}: DurationSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: slot.id,
    data: { type: 'slot', slotId: slot.id },
  });

  const placedBonds: BondCardType[] = placedBondIds
    .map(id => getBondById(id))
    .filter((b): b is BondCardType => !!b);

  return (
    <motion.div
      ref={setNodeRef}
      className={`
        relative rounded-xl border-2 p-4 min-h-40
        transition-all duration-200
        ${hasError ? 'border-red-500 bg-red-50' : ''}
        ${isHighlighted ? 'border-amber-400 bg-amber-50' : ''}
        ${isOver && !hasError ? 'border-amber-500 bg-amber-50 shadow-lg' : ''}
        ${!isOver && !hasError && !isHighlighted ? 'border-slate-200 bg-slate-50' : ''}
      `}
      animate={{
        boxShadow: isOver ? '0 0 20px rgba(251, 191, 36, 0.3)' : 'none',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-slate-500" />
        <span className="font-semibold text-slate-700 text-sm">{slot.label}</span>
        <span className="ml-auto text-xs text-slate-400">
          {placedBonds.length}/6
        </span>
      </div>

      <div className="space-y-2">
        {placedBonds.map(bond => (
          <motion.div
            key={bond.id}
            className={`
              flex items-center justify-between rounded-lg px-3 py-2 text-sm
              ${bond.category === 'short' ? 'bg-emerald-100 text-emerald-800' : ''}
              ${bond.category === 'medium' ? 'bg-amber-100 text-amber-800' : ''}
              ${bond.category === 'long' ? 'bg-rose-100 text-rose-800' : ''}
            `}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{bond.name}</span>
              <span className="text-xs opacity-70">({bond.duration}年)</span>
            </div>
            <button
              onClick={() => onRemoveBond(bond.id)}
              className="ml-2 text-xs px-2 py-0.5 rounded bg-white/50 hover:bg-white transition-colors"
            >
              取出
            </button>
          </motion.div>
        ))}

        {placedBonds.length === 0 && (
          <div className="text-center py-4 text-slate-400 text-sm">
            将债券拖入此处
          </div>
        )}
      </div>
    </motion.div>
  );
}
