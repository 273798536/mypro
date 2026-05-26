import { Globe } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { TIMEZONES, getSystemTimezone } from '../../utils/timezone';

export function TimezoneSelector() {
  const { timeSettings, setTimezone } = useAppStore();
  const systemTimezone = getSystemTimezone();

  return (
    <div className="flex items-center gap-2">
      <Globe size={16} className="text-slate-400" />
      <select
        value={timeSettings.timezone}
        onChange={(e) => setTimezone(e.target.value)}
        className="bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm border border-slate-600 focus:border-blue-500 focus:outline-none"
      >
        {TIMEZONES.map((tz) => (
          <option key={tz.value} value={tz.value}>
            {tz.label}
          </option>
        ))}
      </select>
      {timeSettings.timezone !== systemTimezone && (
        <span className="text-xs text-amber-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          与系统时区不同
        </span>
      )}
    </div>
  );
}
