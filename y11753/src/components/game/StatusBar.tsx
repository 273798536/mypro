import { motion } from 'framer-motion';
import { Sun, Cloud, CloudRain, CloudLightning, Clock, Trophy, Battery } from 'lucide-react';
import { WeatherType, WEATHER_CONFIG } from '../../types';

const weatherIcons: Record<WeatherType, typeof Sun> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  stormy: CloudLightning
};

interface StatusBarProps {
  levelName: string;
  currentTime: number;
  totalTime: number;
  score: number;
  battery: number;
  weather: WeatherType;
  weatherForecast: WeatherType[];
  progress: number;
}

export const StatusBar = ({
  levelName,
  currentTime,
  totalTime,
  score,
  battery,
  weather,
  weatherForecast,
  progress
}: StatusBarProps) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const WeatherIcon = weatherIcons[weather];
  const batteryColor = battery > 50 ? 'text-green-400' : battery > 20 ? 'text-yellow-400' : 'text-red-400';
  const batteryBg = battery > 50 ? 'bg-green-500' : battery > 20 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="bg-slate-800 border-b border-slate-700 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-lg font-bold text-white">{levelName}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-1.5 rounded-lg">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-white font-mono">{formatTime(currentTime)} / {formatTime(totalTime)}</span>
            </div>

            <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <WeatherIcon className={`w-5 h-5 ${weather === 'sunny' ? 'text-yellow-400' : weather === 'cloudy' ? 'text-slate-400' : 'text-blue-400'}`} />
              <span className="text-white text-sm">{WEATHER_CONFIG[weather].name}</span>
              
              {weatherForecast.length > 0 && (
                <div className="flex items-center gap-1 ml-2">
                  <span className="text-xs text-slate-500">→</span>
                  {weatherForecast.slice(0, 2).map((w, i) => {
                    const Icon = weatherIcons[w];
                    return <Icon key={i} className="w-4 h-4 text-slate-500" />;
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-1.5 rounded-lg">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-bold">{score}</span>
            </div>

            <div className="flex items-center gap-2">
              <Battery className={`w-5 h-5 ${batteryColor}`} />
              <div className="w-24 h-4 bg-slate-700 rounded-full overflow-hidden relative">
                <motion.div
                  animate={{ width: `${battery}%` }}
                  transition={{ duration: 0.3 }}
                  className={`h-full ${batteryBg} rounded-full`}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                  {Math.round(battery)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
