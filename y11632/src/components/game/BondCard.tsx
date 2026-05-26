import { motion } from 'framer-motion';
import { Clock, Percent, Calendar } from 'lucide-react';
import type { BondCard as BondCardType } from '@/types';

interface BondCardProps {
  bond: BondCardType;
  isPlaced: boolean;
  isDragging?: boolean;
  onClick?: () => void;
}

const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  short: { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700' },
  long: { bg: 'bg-rose-50', border: 'border-rose-400', text: 'text-rose-700' },
};

export default function BondCard({ bond, isPlaced, isDragging, onClick }: BondCardProps) {
  const colors = categoryColors[bond.category];

  return (
    <motion.div
      className={`
        relative w-full rounded-xl border-2 p-3 cursor-grab
        transition-all duration-200
        ${colors.bg} ${colors.border} ${colors.text}
        ${isPlaced ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-lg hover:-translate-y-0.5'}
        ${isDragging ? 'shadow-2xl ring-2 ring-amber-400 ring-opacity-50 scale-105 cursor-grabbing' : ''}
      `}
      whileHover={!isPlaced ? { scale: 1.02 } : {}}
      whileTap={!isPlaced ? { scale: 0.98 } : {}}
      onClick={!isPlaced ? onClick : undefined}
    >
      <div className="absolute top-2 right-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
          {bond.category === 'short' ? '短久期' : bond.category === 'medium' ? '中久期' : '长久期'}
        </span>
      </div>

      <h3 className="font-bold text-base mb-2 pr-16">{bond.name}</h3>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col items-center">
          <Clock className="w-4 h-4 mb-0.5 opacity-70" />
          <span className="text-lg font-bold">{bond.duration}</span>
          <span className="text-xs opacity-60">久期(年)</span>
        </div>
        <div className="flex flex-col items-center">
          <Percent className="w-4 h-4 mb-0.5 opacity-70" />
          <span className="text-lg font-bold">{bond.couponRate}%</span>
          <span className="text-xs opacity-60">票面利率</span>
        </div>
        <div className="flex flex-col items-center">
          <Calendar className="w-4 h-4 mb-0.5 opacity-70" />
          <span className="text-lg font-bold">{bond.maturity}</span>
          <span className="text-xs opacity-60">到期(年)</span>
        </div>
      </div>
    </motion.div>
  );
}
