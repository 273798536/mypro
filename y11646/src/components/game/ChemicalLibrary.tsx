import React, { useState, useMemo } from 'react';
import { Package, Filter } from 'lucide-react';
import { Chemical, ChemicalCategory } from '../../types';
import { ChemicalCard } from './ChemicalCard';
import { RiskEngine } from '../../engine/RiskEngine';

interface ChemicalLibraryProps {
  chemicals: Chemical[];
  onChemicalSelect: (chemical: Chemical) => void;
  selectedChemicalId?: string;
  onDragStart: (e: React.DragEvent, chemicalId: string) => void;
}

export const ChemicalLibrary: React.FC<ChemicalLibraryProps> = ({
  chemicals,
  onChemicalSelect,
  selectedChemicalId,
  onDragStart
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ChemicalCategory | 'all'>('all');
  const [expandedChemicalId, setExpandedChemicalId] = useState<string | null>(null);

  const categories = [
    { key: 'all', label: '全部' },
    { key: ChemicalCategory.FLAMMABLE, label: '易燃物' },
    { key: ChemicalCategory.EXPLOSIVE, label: '爆炸物' },
    { key: ChemicalCategory.CORROSIVE, label: '腐蚀性' },
    { key: ChemicalCategory.TOXIC, label: '有毒物' },
    { key: ChemicalCategory.OXIDIZER, label: '氧化剂' },
    { key: ChemicalCategory.COMPRESSED, label: '压缩气体' },
    { key: ChemicalCategory.REFRIGERATED, label: '冷藏品' }
  ];

  const filteredChemicals = useMemo(() => {
    if (selectedCategory === 'all') return chemicals;
    return chemicals.filter(c => c.category === selectedCategory);
  }, [chemicals, selectedCategory]);

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-700 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package size={20} className="text-blue-400" />
          <h3 className="text-lg font-semibold text-white">化学品库</h3>
        </div>
        <span className="text-sm text-gray-400">
          剩余 {chemicals.length} 件
        </span>
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        <Filter size={14} className="text-gray-500 flex-shrink-0" />
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key as ChemicalCategory | 'all')}
            className={`
              px-2 py-1 text-xs rounded-full whitespace-nowrap transition-colors
              ${selectedCategory === cat.key
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}
            `}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredChemicals.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Package size={40} className="mx-auto mb-2 opacity-50" />
            <p>暂无可用化学品</p>
          </div>
        ) : (
          filteredChemicals.map(chemical => (
            <ChemicalCard
              key={chemical.id}
              chemical={chemical}
              isSelected={selectedChemicalId === chemical.id}
              onSelect={() => {
                onChemicalSelect(chemical);
                setExpandedChemicalId(expandedChemicalId === chemical.id ? null : chemical.id);
              }}
              onDragStart={(e) => onDragStart(e, chemical.id)}
              showDetails={expandedChemicalId === chemical.id}
            />
          ))
        )}
      </div>
    </div>
  );
};
