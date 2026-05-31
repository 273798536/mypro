
import React from 'react';
import { Volume2, Volume1, Star, RefreshCw, Pause, Check } from 'lucide-react';
import { GestureType, GESTURES } from '../../types';
import { cn } from '../../lib/utils';

interface GesturePanelProps {
  onGesture: (gesture: GestureType) => void;
  disabled?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  'volume-2': <Volume2 className="w-6 h-6" />,
  'volume-1': <Volume1 className="w-6 h-6" />,
  'star': <Star className="w-6 h-6" />,
  'refresh-cw': <RefreshCw className="w-6 h-6" />,
  'pause': <Pause className="w-6 h-6" />,
  'check': <Check className="w-6 h-6" />,
};

export const GesturePanel: React.FC<GesturePanelProps> = ({ onGesture, disabled }) => {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <h3 className="text-lg font-bold text-white mb-4 text-center">指挥手势</h3>
      <div className="grid grid-cols-3 gap-3">
        {GESTURES.map((gesture) => (
          <button
            key={gesture.type}
            onClick={() => onGesture(gesture.type)}
            disabled={disabled}
            className={cn(
              'flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200',
              'bg-white/5 hover:bg-white/15 border border-white/10 hover:border-amber-400/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'group relative overflow-hidden'
            )}
          >
            <div className="text-amber-400 group-hover:scale-110 transition-transform duration-200 mb-2">
              {iconMap[gesture.icon]}
            </div>
            <span className="text-sm font-medium text-white">{gesture.name}</span>
            <div className="absolute inset-0 bg-gradient-to-t from-amber-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        ))}
      </div>
      <p className="text-xs text-white/50 mt-4 text-center">
        选择声部后点击手势进行指挥
      </p>
    </div>
  );
};

