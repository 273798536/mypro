import { motion } from 'framer-motion';
import { Droplets, Gauge, Wrench, Leaf, Sparkles } from 'lucide-react';
import type { Card } from '../types/card';
import {
  cardTypeLabels,
  cardRarityColors,
  cardTypeBgColors,
  cardTypeColors,
} from '../types/card';

interface CardComponentProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function CardComponent({
  card,
  onClick,
  disabled = false,
  selected = false,
  size = 'medium',
}: CardComponentProps) {
  const iconMap = {
    rainfall: Droplets,
    pipeline: Gauge,
    disposal: Wrench,
    garden: Leaf,
  };

  const Icon = iconMap[card.type];

  const sizeClasses = {
    small: 'w-28 h-40',
    medium: 'w-36 h-52',
    large: 'w-44 h-64',
  };

  const rarityBadge = {
    common: null,
    rare: <span className="absolute top-1 right-1 text-blue-400"><Sparkles size={14} /></span>,
    epic: <span className="absolute top-1 right-1 text-purple-400 animate-pulse"><Sparkles size={16} /></span>,
  };

  return (
    <motion.div
      whileHover={!disabled ? { scale: 1.05, y: -8 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={!disabled ? onClick : undefined}
      className={`
        ${sizeClasses[size]}
        relative rounded-xl border-2 ${cardTypeColors[card.type]}
        ${cardTypeBgColors[card.type]}
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}
        ${selected ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-900' : ''}
        overflow-hidden shadow-lg transition-all duration-200
      `}
    >
      {rarityBadge[card.rarity]}

      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

      <div className="h-full flex flex-col p-3">
        <div className="flex items-center justify-between mb-2">
          <div className={`w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center`}>
            <Icon size={18} className="text-white" />
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-gradient-to-r ${cardRarityColors[card.rarity]} text-white`}>
            {cardTypeLabels[card.type]}
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <h4 className="text-white font-bold text-sm mb-1 leading-tight">{card.name}</h4>
          <p className="text-slate-300 text-xs leading-relaxed opacity-80">
            {card.description}
          </p>
        </div>

        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">效果值</span>
            <span className="text-xl font-bold text-white font-mono">
              {card.value}
              <span className="text-xs text-slate-400 ml-0.5">
                {card.type === 'rainfall' ? 'mm/h' : 'm³'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {!disabled && (
        <div className="absolute inset-0 bg-cyan-400/0 hover:bg-cyan-400/10 transition-colors pointer-events-none" />
      )}
    </motion.div>
  );
}
