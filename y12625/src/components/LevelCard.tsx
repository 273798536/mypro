import React from 'react';
import { Lock, CheckCircle, XCircle, ChevronRight, FunctionSquare } from 'lucide-react';
import { Level } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useExperimentStore } from '@/store/experimentStore';

interface LevelCardProps {
  level: Level;
  index: number;
}

const STATUS_CONFIG = {
  locked: {
    icon: <Lock size={20} />,
    color: 'text-slate-400',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
    label: '未解锁'
  },
  unlocked: {
    icon: <FunctionSquare size={20} />,
    color: 'text-[#0F3B5F]',
    bgColor: 'bg-[#0F3B5F] bg-opacity-5',
    borderColor: 'border-[#0F3B5F] border-opacity-30',
    label: '进行中'
  },
  completed: {
    icon: <CheckCircle size={20} />,
    color: 'text-[#2DD4BF]',
    bgColor: 'bg-[#2DD4BF] bg-opacity-10',
    borderColor: 'border-[#2DD4BF] border-opacity-30',
    label: '已完成'
  },
  failed: {
    icon: <XCircle size={20} />,
    color: 'text-[#EC4899]',
    bgColor: 'bg-[#EC4899] bg-opacity-10',
    borderColor: 'border-[#EC4899] border-opacity-30',
    label: '待重试'
  }
};

export const LevelCard: React.FC<LevelCardProps> = ({ level, index }) => {
  const navigate = useNavigate();
  const { setCurrentLevel } = useExperimentStore();
  const config = STATUS_CONFIG[level.status];

  const handleClick = () => {
    if (level.status === 'locked') return;
    
    setCurrentLevel(level.id);
    navigate(`/experiment/${level.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative rounded-xl border-2 p-6 transition-all duration-300 cursor-pointer ${
        level.status === 'locked'
          ? 'opacity-60 cursor-not-allowed'
          : 'hover:-translate-y-1 hover:shadow-xl hover:scale-[1.02]'
      } ${config.bgColor} ${config.borderColor}`}
      style={{
        animationDelay: `${index * 100}ms`
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${config.bgColor} ${config.color}`}>
          {config.icon}
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${config.bgColor} ${config.color}`}>
          {config.label}
        </span>
      </div>

      <div className="text-xs text-slate-400 mb-2 font-mono">
        关卡 {index + 1}
      </div>
      
      <h3
        className="text-xl font-bold text-[#0F3B5F] mb-2"
        style={{ fontFamily: '"Playfair Display", serif' }}
      >
        {level.name}
      </h3>
      
      <p className="text-sm text-slate-600 mb-4 leading-relaxed">
        {level.description}
      </p>

      <div className="text-xs text-slate-500 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono">f(x) = </span>
          <code className="bg-slate-200 px-2 py-0.5 rounded">
            {level.targetFunction}
          </code>
        </div>
        <div>
          边界范围：[±{level.boundary.x}, ±{level.boundary.y}]
        </div>
      </div>

      {level.status !== 'locked' && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 border-opacity-50">
          <span className="text-sm font-medium text-[#0F3B5F]">
            {level.status === 'completed' ? '再次挑战' : '开始实验'}
          </span>
          <ChevronRight size={20} className={config.color} />
        </div>
      )}
    </div>
  );
};
