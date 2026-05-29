import { useEffect } from 'react';
import type { WeatherCard } from '../../types';
import { useGameStore } from '../../store/gameStore';
import { CloudRain, Sun, Wind, CloudSun, X } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  'weather-rain': <CloudRain className="w-5 h-5" />,
  'weather-heat': <Sun className="w-5 h-5" />,
  'weather-wind': <Wind className="w-5 h-5" />,
  'weather-sunny': <CloudSun className="w-5 h-5" />,
};

const bgMap: Record<string, string> = {
  'weather-rain': 'bg-blue-900/70 border-blue-500/50',
  'weather-heat': 'bg-orange-900/70 border-orange-500/50',
  'weather-wind': 'bg-gray-700/70 border-gray-400/50',
  'weather-sunny': 'bg-yellow-900/70 border-yellow-500/50',
};

const textMap: Record<string, string> = {
  'weather-rain': 'text-blue-300',
  'weather-heat': 'text-orange-300',
  'weather-wind': 'text-gray-300',
  'weather-sunny': 'text-yellow-300',
};

export default function WeatherBanner() {
  const weatherJustTriggered = useGameStore((s) => s.weatherJustTriggered);
  const dismissWeatherAlert = useGameStore((s) => s.dismissWeatherAlert);

  useEffect(() => {
    if (!weatherJustTriggered) return;
    const timer = setTimeout(dismissWeatherAlert, 8000);
    return () => clearTimeout(timer);
  }, [weatherJustTriggered, dismissWeatherAlert]);

  if (!weatherJustTriggered) return null;

  const w: WeatherCard = weatherJustTriggered;
  const id = w.id;

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-50
        flex items-center justify-between px-5 py-3
        border-b backdrop-blur-sm
        animate-slide-down
        ${bgMap[id] ?? 'bg-gray-800/70 border-gray-500/50'}
      `}
    >
      <div className="flex items-center gap-3">
        <span className={textMap[id] ?? 'text-gray-300'}>{iconMap[id] ?? <Sun className="w-5 h-5" />}</span>
        <div>
          <span className={`font-bold text-sm ${textMap[id] ?? 'text-gray-200'}`}>{w.name}</span>
          <span className="ml-3 text-xs text-gray-300">{w.description}</span>
        </div>
      </div>
      <button
        onClick={dismissWeatherAlert}
        className="text-gray-400 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <style>{`
        @keyframes slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down {
          animation: slide-down 0.35s ease-out;
        }
      `}</style>
    </div>
  );
}
