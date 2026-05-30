import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Users, Shield, Cloud, Clock, TrendingUp, Zap } from 'lucide-react';
import type { WeatherCondition } from '../../engine/types';

interface MonitorPanelProps {
  congestionIndex: number;
  patrolCoverage: number;
  riskLevel: number;
  weather: WeatherCondition;
  currentTime: number;
  speed: number;
  status: string;
}

export const MonitorPanel: React.FC<MonitorPanelProps> = ({
  congestionIndex,
  patrolCoverage,
  riskLevel,
  weather,
  currentTime,
  speed,
  status
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getWeatherText = (w: WeatherCondition) => {
    const map: Record<WeatherCondition, string> = {
      clear: '晴朗',
      cloudy: '多云',
      rain: '小雨',
      heavy_rain: '大雨',
      storm: '暴风雨'
    };
    return map[w];
  };

  const getWeatherColor = (w: WeatherCondition) => {
    const map: Record<WeatherCondition, string> = {
      clear: 'text-yellow-400',
      cloudy: 'text-gray-400',
      rain: 'text-blue-400',
      heavy_rain: 'text-blue-600',
      storm: 'text-red-500'
    };
    return map[w];
  };

  const getRiskColor = (level: number) => {
    if (level < 2) return 'bg-green-500';
    if (level < 3) return 'bg-yellow-500';
    if (level < 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getRiskText = (level: number) => {
    if (level < 2) return '低风险';
    if (level < 3) return '中风险';
    if (level < 4) return '高风险';
    return '极高风险';
  };

  const getCongestionColor = (index: number) => {
    if (index < 0.6) return 'bg-green-500';
    if (index < 1.0) return 'bg-yellow-500';
    if (index < 1.5) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusText = (s: string) => {
    const map: Record<string, string> = {
      idle: '待命',
      deploying: '布阵阶段',
      running: '进行中',
      paused: '已暂停',
      finished: '已结束'
    };
    return map[s] || s;
  };

  const getStatusColor = (s: string) => {
    const map: Record<string, string> = {
      idle: 'text-gray-400',
      deploying: 'text-blue-400',
      running: 'text-green-400',
      paused: 'text-yellow-400',
      finished: 'text-purple-400'
    };
    return map[s] || 'text-gray-400';
  };

  return (
    <div className="bg-slate-800/90 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-cyan-400" />
        实时监控
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4" />
            <span className="text-sm">对局时间</span>
          </div>
          <span className="text-white font-mono font-bold">
            {formatTime(currentTime)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${getStatusColor(status)}`} />
            <span className="text-slate-300">状态</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-bold ${getStatusColor(status)}`}>
              {getStatusText(status)}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-cyan-400 font-mono">{speed}x</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <AlertTriangle className="w-3 h-3" />
              拥堵指数
            </div>
            <div className="flex items-end gap-2">
              <motion.span
                key={congestionIndex}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className={`text-2xl font-bold ${congestionIndex > 1.2 ? 'text-red-400' : 'text-white'}`}
              >
                {congestionIndex.toFixed(2)}
              </motion.span>
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full ${getCongestionColor(congestionIndex)} transition-all duration-500`}
                  style={{ width: `${Math.min(100, congestionIndex * 50)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <Users className="w-3 h-3" />
              巡逻覆盖率
            </div>
            <div className="flex items-end gap-2">
              <motion.span
                key={patrolCoverage}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className={`text-2xl font-bold ${patrolCoverage < 0.5 ? 'text-red-400' : 'text-white'}`}
              >
                {(patrolCoverage * 100).toFixed(0)}%
              </motion.span>
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${patrolCoverage * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <Shield className="w-3 h-3" />
              风险等级
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getRiskColor(riskLevel)} animate-pulse`} />
              <span className="text-lg font-bold text-white">
                {riskLevel.toFixed(1)}
              </span>
              <span className={`text-xs ${getRiskColor(riskLevel).replace('bg-', 'text-')}`}>
                {getRiskText(riskLevel)}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <Cloud className="w-3 h-3" />
              天气状态
            </div>
            <div className={`text-lg font-bold ${getWeatherColor(weather)}`}>
              {getWeatherText(weather)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
