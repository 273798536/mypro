import { motion } from 'framer-motion';
import { Zap, Cable, Wrench, Lock } from 'lucide-react';
import { ToolType } from '../../types';

interface ToolCardProps {
  tool: ToolType;
  unlocked: boolean;
  used: boolean;
  selected: boolean;
  onClick: () => void;
}

const toolConfig = {
  power_station: {
    name: '电源站',
    description: '在节点放置电源',
    icon: Zap,
    color: 'amber',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    hoverBorder: 'hover:border-amber-500',
    textColor: 'text-amber-400',
  },
  wire: {
    name: '导线',
    description: '连接两个节点',
    icon: Cable,
    color: 'blue',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    hoverBorder: 'hover:border-blue-500',
    textColor: 'text-blue-400',
  },
  repair_team: {
    name: '维修队',
    description: '修复故障节点',
    icon: Wrench,
    color: 'purple',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    hoverBorder: 'hover:border-purple-500',
    textColor: 'text-purple-400',
  },
};

export default function ToolCard({ tool, unlocked, used, selected, onClick }: ToolCardProps) {
  const config = toolConfig[tool];
  const Icon = config.icon;

  if (!unlocked) {
    return (
      <div
        className={`tool-card p-4 rounded-xl border ${config.bgColor} ${config.borderColor} opacity-40 cursor-not-allowed`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor} ${config.textColor}`}>
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className={`font-display font-bold ${config.textColor}`}>{config.name}</h3>
            <p className="text-xs text-slate-500 mt-1">完成前置任务解锁</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={!unlocked}
      className={`tool-card w-full p-4 rounded-xl border text-left transition-all ${
        selected
          ? `${config.bgColor} ${config.hoverBorder} border-2 ring-2 ring-offset-2 ring-offset-slate-900 ring-${config.color}-500/50`
          : used
          ? `${config.bgColor} border-green-500/50 bg-green-500/5`
          : `${config.bgColor} ${config.borderColor} ${config.hoverBorder}`
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg ${config.bgColor} ${config.textColor} ${
            selected ? 'animate-pulse' : ''
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className={`font-display font-bold ${config.textColor}`}>{config.name}</h3>
          <p className="text-xs text-slate-400 mt-1">{config.description}</p>
          {used && (
            <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
              已使用
            </span>
          )}
          {selected && (
            <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
              已选中
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
