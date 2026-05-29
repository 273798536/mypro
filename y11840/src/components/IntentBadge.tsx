import type { Intent } from '@/types';
import { INTENT_LABELS } from '@/types';
import { HelpCircle, DollarSign, AlertTriangle, HelpCircle as HelpIcon, Wrench, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IntentBadgeProps {
  intent: Intent | null;
  confidence?: number | null;
  showConfidence?: boolean;
}

const intentConfig: Record<Intent, { icon: typeof HelpCircle; color: string }> = {
  refund: {
    icon: DollarSign,
    color: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
  },
  complaint: {
    icon: AlertTriangle,
    color: 'text-red-400 bg-red-500/20 border-red-500/30',
  },
  inquiry: {
    icon: HelpIcon,
    color: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  },
  technical_support: {
    icon: Wrench,
    color: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
  },
  cancellation: {
    icon: UserX,
    color: 'text-rose-400 bg-rose-500/20 border-rose-500/30',
  },
  unknown: {
    icon: HelpCircle,
    color: 'text-gray-400 bg-gray-500/20 border-gray-500/30',
  },
};

export function IntentBadge({ intent, confidence, showConfidence = true }: IntentBadgeProps) {
  if (!intent) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-gray-600/30 bg-gray-600/10">
        <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs font-medium text-gray-400">未识别</span>
      </div>
    );
  }

  const config = intentConfig[intent];
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border ${config.color}`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">{INTENT_LABELS[intent]}</span>
      {showConfidence && confidence !== null && confidence !== undefined && (
        <span className="text-gray-500 text-xs">{Math.round(confidence * 100)}%</span>
      )}
    </div>
  );
}
