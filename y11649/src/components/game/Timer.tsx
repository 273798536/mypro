import { useGameStore } from '@/store/useGameStore';
import { Clock } from 'lucide-react';

export const Timer = () => {
  const { currentTime, totalTime } = useGameStore();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (currentTime / totalTime) * 100;
  const isUrgent = progress > 75;

  return (
    <div className="flex items-center gap-3">
      <Clock className={isUrgent ? 'text-alert-red-500 animate-pulse' : 'text-gray-600'} size={24} />
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className={`text-2xl font-bold font-display ${isUrgent ? 'text-alert-red-500' : 'text-gray-800'}`}>
            {formatTime(currentTime)}
          </span>
          <span className="text-sm text-gray-500">
            / {formatTime(totalTime)}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isUrgent ? 'bg-alert-red-500' : progress > 50 ? 'bg-yellow-500' : 'bg-snow-blue-500'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
