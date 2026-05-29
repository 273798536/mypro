import { Bot, User, Eye } from 'lucide-react';
import type { Decision } from '@/types';
import { DECISION_LABELS } from '@/types';
import { cn } from '@/lib/utils';

interface DecisionButtonsProps {
  onDecision: (decision: Decision) => void;
  disabled?: boolean;
  escalationCost?: number;
  canEscalate?: boolean;
  escalateReason?: string;
}

export function DecisionButtons({
  onDecision,
  disabled = false,
  escalationCost = 1,
  canEscalate = true,
  escalateReason,
}: DecisionButtonsProps) {
  const buttonConfig = {
    ai: {
      icon: Bot,
      label: DECISION_LABELS.ai,
      color: 'from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500',
      border: 'border-emerald-500/50',
      shadow: 'shadow-emerald-500/25',
      shortcut: '1',
    },
    human: {
      icon: User,
      label: DECISION_LABELS.human,
      color: canEscalate
        ? 'from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500'
        : 'from-gray-500 to-gray-600',
      border: canEscalate ? 'border-orange-500/50' : 'border-gray-500/50',
      shadow: canEscalate ? 'shadow-orange-500/25' : 'shadow-gray-500/25',
      shortcut: '2',
    },
    observe: {
      icon: Eye,
      label: DECISION_LABELS.observe,
      color: 'from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500',
      border: 'border-blue-500/50',
      shadow: 'shadow-blue-500/25',
      shortcut: '3',
    },
  };

  const handleClick = (decision: Decision) => {
    if (disabled) return;
    if (decision === 'human' && !canEscalate) return;
    onDecision(decision);
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {(Object.keys(buttonConfig) as Decision[]).map(decision => {
        const config = buttonConfig[decision];
        const Icon = config.icon;
        const isDisabled = disabled || (decision === 'human' && !canEscalate);

        return (
          <button
            key={decision}
            onClick={() => handleClick(decision)}
            disabled={isDisabled}
            className={cn(
              'group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all duration-300 transform',
              'bg-gradient-to-br',
              config.color,
              config.border,
              'shadow-lg',
              config.shadow,
              isDisabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-105 hover:shadow-xl active:scale-95 cursor-pointer'
            )}
          >
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/30 text-xs text-white/80 font-mono">
              {config.shortcut}
            </div>
            <Icon className="w-10 h-10 text-white drop-shadow-lg" />
            <span className="text-white font-semibold text-base">{config.label}</span>
            {decision === 'human' && escalationCost > 1 && (
              <span className="text-xs text-white/80 bg-black/20 px-2 py-1 rounded-full">
                成本 ×{escalationCost}
              </span>
            )}
            {decision === 'human' && !canEscalate && escalateReason && (
              <div className="absolute inset-x-0 bottom-0 p-2 bg-black/80 rounded-b-2xl">
                <p className="text-xs text-red-300 text-center">{escalateReason}</p>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
