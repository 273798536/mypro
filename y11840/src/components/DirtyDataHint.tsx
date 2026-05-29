import { AlertTriangle, Wrench, Info, Lightbulb } from 'lucide-react';
import type { DirtyDataAction } from '@/types';
import { DIRTY_ACTION_LABELS } from '@/types';
import { dirtyDataHandler } from '@/game/dirtyDataHandler';

interface DirtyDataHintProps {
  dirtyFields: string[];
  action: DirtyDataAction;
  customHint?: string;
}

const actionConfig = {
  auto_complete: {
    icon: Wrench,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
  },
  user_hint: {
    icon: Lightbulb,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
  },
  skip: {
    icon: Info,
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
  },
};

export function DirtyDataHint({ dirtyFields, action, customHint }: DirtyDataHintProps) {
  if (dirtyFields.length === 0) return null;

  const config = actionConfig[action];
  const Icon = config.icon;
  const hintText = customHint || dirtyDataHandler.generateDirtyDataHint(dirtyFields);

  return (
    <div className={`p-3 rounded-lg border ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 ${config.color} mt-0.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-medium ${config.color} mb-1`}>
            {DIRTY_ACTION_LABELS[action]}
          </div>
          <div className="text-xs text-gray-400">
            {hintText}
          </div>
        </div>
      </div>
    </div>
  );
}
