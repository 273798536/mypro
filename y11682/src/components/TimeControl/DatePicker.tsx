import { Calendar } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function DatePicker() {
  const { timeSettings, setDate } = useAppStore();

  const quickDates = [
    { label: '冬至', date: '2024-12-21' },
    { label: '春分', date: '2024-03-20' },
    { label: '夏至', date: '2024-06-21' },
    { label: '秋分', date: '2024-09-22' }
  ];

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-slate-400" />
        <input
          type="date"
          value={timeSettings.date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm border border-slate-600 focus:border-blue-500 focus:outline-none"
        />
      </div>
      
      <div className="flex items-center gap-1">
        {quickDates.map(({ label, date }) => (
          <button
            key={date}
            onClick={() => setDate(date)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              timeSettings.date === date
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
