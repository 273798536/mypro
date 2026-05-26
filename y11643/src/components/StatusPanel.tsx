import React from 'react';
import { motion } from 'framer-motion';
import type { RocketState, EnvironmentState } from '../types/game';
import { GAME_CONFIG } from '../types/game';

interface StatusPanelProps {
  rocket: RocketState;
  environment: EnvironmentState;
  gamePhase: string;
  flightTime: number;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({
  rocket,
  environment,
  gamePhase,
  flightTime,
}) => {
  const fuelPercentage = (rocket.fuel / rocket.maxFuel) * 100;
  const altitude = Math.max(0, environment.groundY - rocket.y);
  const totalVelocity = Math.sqrt(rocket.vx ** 2 + rocket.vy ** 2);

  const getFuelColor = () => {
    if (fuelPercentage > 60) return 'bg-green-500';
    if (fuelPercentage > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getVelocityStatus = () => {
    if (Math.abs(rocket.vy) > GAME_CONFIG.SAFE_LANDING_VY) return 'critical';
    if (Math.abs(rocket.vx) > GAME_CONFIG.SAFE_LANDING_VX) return 'warning';
    return 'normal';
  };

  const getAngleStatus = () => {
    if (Math.abs(rocket.angle) > GAME_CONFIG.SAFE_LANDING_ANGLE) return 'critical';
    if (Math.abs(rocket.angle) > GAME_CONFIG.SAFE_LANDING_ANGLE * 0.6) return 'warning';
    return 'normal';
  };

  const velocityStatus = getVelocityStatus();
  const angleStatus = getAngleStatus();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 border border-cyan-500/30 shadow-lg shadow-cyan-500/10"
    >
      <h3 className="text-cyan-400 font-bold text-sm mb-4 flex items-center gap-2">
        <span className="text-lg">📊</span> 飞行状态
      </h3>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>⛽ 燃料</span>
            <span className={fuelPercentage <= 20 ? 'text-red-400 font-bold' : ''}>
              {rocket.fuel.toFixed(1)} / {rocket.maxFuel}
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${getFuelColor()} rounded-full transition-all`}
              initial={false}
              animate={{ width: `${fuelPercentage}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-2">
            <div className="text-xs text-gray-400 mb-1">📍 高度</div>
            <div className="text-cyan-400 font-mono text-lg font-bold">
              {altitude.toFixed(0)}
              <span className="text-xs text-gray-500 ml-1">m</span>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-2">
            <div className="text-xs text-gray-400 mb-1">⏱️ 时间</div>
            <div className="text-cyan-400 font-mono text-lg font-bold">
              {flightTime.toFixed(1)}
              <span className="text-xs text-gray-500 ml-1">s</span>
            </div>
          </div>
        </div>

        <div className={`bg-slate-800/50 rounded-lg p-2 border-l-4 ${
          velocityStatus === 'critical' ? 'border-red-500' :
          velocityStatus === 'warning' ? 'border-yellow-500' : 'border-green-500'
        }`}>
          <div className="text-xs text-gray-400 mb-1">🚀 速度</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xs text-gray-500">垂直</div>
              <div className={`font-mono font-bold ${
                Math.abs(rocket.vy) > GAME_CONFIG.SAFE_LANDING_VY ? 'text-red-400' : 'text-green-400'
              }`}>
                {rocket.vy.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">水平</div>
              <div className={`font-mono font-bold ${
                Math.abs(rocket.vx) > GAME_CONFIG.SAFE_LANDING_VX ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {rocket.vx.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">合速度</div>
              <div className="text-white font-mono font-bold">
                {totalVelocity.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        <div className={`bg-slate-800/50 rounded-lg p-2 border-l-4 ${
          angleStatus === 'critical' ? 'border-red-500' :
          angleStatus === 'warning' ? 'border-yellow-500' : 'border-green-500'
        }`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-gray-400 mb-1">🧭 姿态角</div>
              <div className={`font-mono text-lg font-bold ${
                angleStatus === 'critical' ? 'text-red-400' :
                angleStatus === 'warning' ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {rocket.angle.toFixed(1)}°
              </div>
            </div>
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-2 border-slate-600 rounded-full" />
              <motion.div
                className="absolute top-1/2 left-1/2 w-1 h-5 bg-cyan-400 origin-bottom rounded-full"
                style={{ transform: `translate(-50%, -100%) rotate(${rocket.angle}deg)` }}
              />
              <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-cyan-400 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-gray-400 mb-1">💨 风力</div>
              <div className="text-white font-mono font-bold">
                {Math.abs(environment.windSpeed).toFixed(1)}
                <span className="text-xs text-gray-500 ml-1">m/s</span>
              </div>
            </div>
            <div className="text-2xl">
              {environment.windDirection > 0 ? '→' : '←'}
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-gray-400 mb-1">🔥 推力</div>
              <div className="text-orange-400 font-mono font-bold">
                {((rocket.thrust / rocket.maxThrust) * 100).toFixed(0)}
                <span className="text-xs text-gray-500 ml-1">%</span>
              </div>
            </div>
            <div className="w-16 h-12 relative">
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700 rounded" />
              <motion.div
                className="absolute bottom-0 left-0 bg-gradient-to-t from-orange-500 to-yellow-400 rounded"
                style={{ width: '100%' }}
                initial={false}
                animate={{ height: `${(rocket.thrust / rocket.maxThrust) * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>
        </div>
      </div>

      {(gamePhase === 'playing' || gamePhase === 'replaying') && (
        <div className="mt-4 pt-3 border-t border-slate-700">
          <div className="text-xs text-gray-500 mb-2">安全着陆阈值</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="text-gray-400">垂直速度</div>
              <div className="text-green-400">&lt; {GAME_CONFIG.SAFE_LANDING_VY} m/s</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">水平速度</div>
              <div className="text-green-400">&lt; {GAME_CONFIG.SAFE_LANDING_VX} m/s</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">姿态角</div>
              <div className="text-green-400">&lt; {GAME_CONFIG.SAFE_LANDING_ANGLE}°</div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
