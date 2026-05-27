import React from 'react';
import { Card } from './Card';
import { Card as CardType } from '@/types';

interface CardGridProps {
  title: string;
  cards: CardType[];
  onCardClick: (cardId: string) => void;
  type: 'invoice' | 'customer' | 'payment';
}

const typeIcons = {
  invoice: { bg: 'bg-blue-600', label: '发票牌' },
  customer: { bg: 'bg-emerald-600', label: '客户牌' },
  payment: { bg: 'bg-purple-600', label: '付款记录牌' },
};

export const CardGrid: React.FC<CardGridProps> = ({ title, cards, onCardClick, type }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div
        className={`px-4 py-3 text-white font-bold flex items-center gap-2 ${typeIcons[type].bg}`}
      >
        <span className="text-lg">{typeIcons[type].label}</span>
        <span className="ml-auto text-sm font-normal opacity-80">
          共 {cards.length} 张
        </span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => (
            <Card key={card.id} card={card} onClick={() => onCardClick(card.id)} />
          ))}
        </div>
        {cards.length === 0 && (
          <div className="text-center py-8 text-slate-400">
          暂无卡牌
          </div>
        )}
      </div>
    </div>
  );
};
