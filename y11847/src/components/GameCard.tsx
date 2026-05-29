import React from 'react';
import { Card } from '../types/game';

interface GameCardProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
}

const getCardColor = (type: string): string => {
  switch (type) {
    case 'rain':
      return 'bg-blue-600 border-blue-800';
    case 'pump':
      return 'bg-amber-600 border-amber-800';
    case 'garden':
      return 'bg-emerald-600 border-emerald-800';
    case 'pipe':
      return 'bg-slate-600 border-slate-800';
    default:
      return 'bg-gray-600 border-gray-800';
  }
};

const getCardIcon = (type: string): string => {
  switch (type) {
    case 'rain':
      return '🌧️';
    case 'pump':
      return '⚙️';
    case 'garden':
      return '🌳';
    case 'pipe':
      return '🔧';
    default:
      return '📋';
  }
};

export const GameCard: React.FC<GameCardProps> = ({ card, onClick, disabled, selected }) => {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`
        relative w-36 h-48 rounded-lg border-2 p-3 flex flex-col
        transition-all duration-200 cursor-pointer select-none
        ${getCardColor(card.type)}
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-105 hover:shadow-lg'}
        ${selected ? 'ring-4 ring-yellow-400 scale-105' : ''}
      `}
    >
      <div className="text-3xl text-center mb-2">{getCardIcon(card.type)}</div>
      <div className="text-white font-bold text-sm text-center mb-2">{card.name}</div>
      <div className="text-white/80 text-xs flex-1 text-center leading-relaxed">
        {card.description}
      </div>
      <div className="absolute bottom-1 right-2 text-white/50 text-[10px] font-mono">
        {card.type.toUpperCase()}
      </div>
    </div>
  );
};
