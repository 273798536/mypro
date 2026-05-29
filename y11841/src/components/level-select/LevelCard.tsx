import React from 'react';
import { Play, Clock, Package, ThermometerSun, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Level } from '../../data/types';
import { cn } from '@/lib/utils';

interface LevelCardProps {
  level: Level;
}

const difficultyConfig = {
  easy: {
    label: '入门',
    color: 'text-cold-chain-success',
    bg: 'bg-cold-chain-success/20',
    border: 'border-cold-chain-success/50',
  },
  medium: {
    label: '进阶',
    color: 'text-cold-chain-warning',
    bg: 'bg-cold-chain-warning/20',
    border: 'border-cold-chain-warning/50',
  },
  hard: {
    label: '挑战',
    color: 'text-cold-chain-danger',
    bg: 'bg-cold-chain-danger/20',
    border: 'border-cold-chain-danger/50',
  },
};

const LevelCard: React.FC<LevelCardProps> = ({ level }) => {
  const navigate = useNavigate();
  const config = difficultyConfig[level.difficulty];

  const frozenCount = level.cargoBoxes.filter(c => c.temperatureZone === 'frozen').length;
  const chilledCount = level.cargoBoxes.filter(c => c.temperatureZone === 'chilled').length;
  const normalCount = level.cargoBoxes.filter(c => c.temperatureZone === 'normal').length;

  return (
    <div className={cn(
      'group relative bg-cold-chain-panel rounded-xl border-2 p-6 transition-all duration-300 cursor-pointer',
      'border-cold-chain-border hover:border-cold-chain-primary hover:shadow-lg hover:shadow-cold-chain-primary/10 hover:-translate-y-1'
    )}>
      <div className="absolute top-4 right-4">
        <span className={cn(
          'px-3 py-1 rounded-full text-xs font-bold font-mono',
          config.bg,
          config.color,
          config.border,
          'border'
        )}>
          {config.label}
        </span>
      </div>

      <div className="mb-4">
        <h3 className="font-display font-bold text-lg text-white group-hover:text-cold-chain-primary transition-colors pr-20">
          {level.originalName}
        </h3>
        <p className="text-sm text-gray-400 font-mono mt-2 line-clamp-2">
          {level.originalDescription}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-cold-chain-primary" />
          <span className="text-gray-400 font-mono">{level.originalTimeLimit}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Package className="w-4 h-4 text-cold-chain-primary" />
          <span className="text-gray-400 font-mono">{level.cargoBoxes.length} 个货箱</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-cold-chain-primary" />
          <span className="text-gray-400 font-mono">{level.compartments.length} 个格位</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <ThermometerSun className="w-4 h-4 text-cold-chain-primary" />
          <span className="text-gray-400 font-mono">
            <span className="text-cold-chain-frozen">冻{frozenCount}</span>
            <span className="mx-1">/</span>
            <span className="text-cold-chain-chilled">冷{chilledCount}</span>
            <span className="mx-1">/</span>
            <span className="text-cold-chain-normal">常{normalCount}</span>
          </span>
        </div>
      </div>

      <div className="p-3 bg-cold-chain-dark/50 rounded-lg mb-4 border border-cold-chain-border/50">
        <p className="text-xs text-gray-500 font-mono mb-1">规则摘要</p>
        <p className="text-xs text-gray-400 font-mono line-clamp-2">
          {level.originalRules}
        </p>
      </div>

      <button
        onClick={() => navigate(`/game/${level.id}`)}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-3 rounded-lg font-mono font-bold transition-all duration-200',
          'bg-cold-chain-primary hover:bg-cold-chain-primary/80 text-white',
          'group-hover:shadow-lg group-hover:shadow-cold-chain-primary/30'
        )}>
        <Play className="w-4 h-4" />
        开始挑战
      </button>
    </div>
  );
};

export default LevelCard;
