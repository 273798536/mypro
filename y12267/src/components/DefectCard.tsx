import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { DefectCard as DefectCardType } from '../types/game';
import { useGameStore } from '../store/gameStore';

interface DefectCardComponentProps {
  card: DefectCardType;
  index: number;
}

const getDefectIcon = (type: string): string => {
  const icons: Record<string, string> = {
    vacancy: '◯',
    interstitial: '◉',
    dislocation: '◎',
    grain_boundary: '⬡',
  };
  return icons[type] || '?';
};

const DefectCardComponent: React.FC<DefectCardComponentProps> = ({ card, index }) => {
  const { selectedCard, selectCard, currentEnergy } = useGameStore();
  const isSelected = selectedCard?.id === card.id;
  const canAfford = currentEnergy >= card.energyCost;

  const handleClick = () => {
    if (isSelected) {
      selectCard(null);
    } else if (canAfford) {
      selectCard(card);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={handleClick}
      className={`
        relative p-4 rounded-xl cursor-pointer transition-all duration-300
        border-2 backdrop-blur-sm
        ${isSelected
          ? 'border-blue-400 bg-blue-900/40 scale-105 shadow-lg shadow-blue-500/30'
          : canAfford
            ? 'border-slate-600 bg-slate-800/60 hover:border-slate-500 hover:bg-slate-700/60'
            : 'border-slate-700 bg-slate-800/30 opacity-50 cursor-not-allowed'
        }
      `}
      whileHover={canAfford ? { scale: 1.02 } : {}}
      whileTap={canAfford ? { scale: 0.98 } : {}}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl text-white shadow-md"
          style={{
            backgroundColor: card.color,
            boxShadow: `0 0 15px ${card.color}60`,
          }}
        >
          {getDefectIcon(card.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-white">{card.nameCn}</h4>
            <div className="flex items-center gap-1 text-yellow-400">
              <Zap size={14} />
              <span className="text-sm font-mono">{card.energyCost}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">{card.name}</p>
          <p className="text-xs text-slate-500 mt-2 line-clamp-2">
            {card.description}
          </p>
          <div className="mt-2">
            <span className="text-xs px-2 py-1 rounded-full bg-slate-700/50 text-slate-300">
              {card.material}
            </span>
          </div>
        </div>
      </div>

      {isSelected && (
        <motion.div
          className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500 }}
        >
          <span className="text-white text-xs">✓</span>
        </motion.div>
      )}
    </motion.div>
  );
};

interface DefectCardPanelProps {
  cards: DefectCardType[];
}

const DefectCardPanel: React.FC<DefectCardPanelProps> = ({ cards }) => {
  const { selectedCard } = useGameStore();

  return (
    <div className="p-6 bg-slate-900/80 rounded-xl border border-slate-700 backdrop-blur-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">缺陷卡</h3>
        <p className="text-sm text-slate-400 mt-1">
          选择一张卡片，然后点击晶格放置缺陷
        </p>
      </div>

      {selectedCard && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg"
        >
          <p className="text-sm text-blue-300">
            已选择: <span className="font-semibold">{selectedCard.nameCn}</span>
            <span className="text-xs text-blue-400 ml-2">
              ({selectedCard.material})
            </span>
          </p>
        </motion.div>
      )}

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {cards.map((card, index) => (
          <DefectCardComponent key={card.id} card={card} index={index} />
        ))}
      </div>
    </div>
  );
};

export default DefectCardPanel;
