import { Sun, Moon } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TimePeriod } from '../../types';

export function TimePeriodToggle() {
  const { currentPeriod, setCurrentPeriod } = useGameStore();

  const handleToggle = (period: TimePeriod) => {
    setCurrentPeriod(period);
  };

  return (
    <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
      <button
        onClick={() => handleToggle('day')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
          currentPeriod === 'day'
            ? 'bg-white shadow-md text-yellow-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <Sun size={16} />
        <span>白天</span>
      </button>
      <button
        onClick={() => handleToggle('night')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
          currentPeriod === 'night'
            ? 'bg-indigo-600 shadow-md text-white'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <Moon size={16} />
        <span>夜间</span>
      </button>
    </div>
  );
}
