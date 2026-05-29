import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { cn } from '@/lib/utils';

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: 'bg-cold-chain-success/90 border-cold-chain-success',
  error: 'bg-cold-chain-danger/90 border-cold-chain-danger',
  warning: 'bg-cold-chain-warning/90 border-cold-chain-warning',
  info: 'bg-cold-chain-primary/90 border-cold-chain-primary',
};

const FeedbackToast: React.FC = () => {
  const { feedbackMessages, removeFeedback } = useGameStore();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {feedbackMessages.map((message) => {
        const Icon = iconMap[message.type];
        return (
          <div
            key={message.id}
            className={cn(
              'flex items-start gap-3 px-4 py-3 rounded-lg border-2 text-white animate-slide-in shadow-lg',
              colorMap[message.type]
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="flex-1 text-sm font-mono">{message.message}</p>
            <button
              onClick={() => removeFeedback(message.id)}
              className="flex-shrink-0 hover:bg-white/20 rounded p-0.5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default FeedbackToast;
