import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { calculateGameState } from '../../game/engine';
import { getPressureStatus } from '../../game/pressure';
import { getScoreLevelColor, getScoreLevelText } from '../../game/scoring';
import { Gauge, Droplets, Users, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const StatusPanel: React.FC = () => {
  const { gameState, currentScene, scoreBreakdown } = useGameStore();
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (gameState.status !== 'playing') {
      if (gameState.startTime && gameState.endTime) {
        setElapsedTime(Math.floor((gameState.endTime - gameState.startTime) / 1000));
      }
      return;
    }

    const interval = setInterval(() => {
      if (gameState.startTime) {
        setElapsedTime(Math.floor((Date.now() - gameState.startTime) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.status, gameState.startTime, gameState.endTime]);

  const engineResult = gameState.status === 'playing' || gameState.status === 'finished'
    ? calculateGameState(gameState, currentScene)
    : null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const controlledLeaks = engineResult
    ? Array.from(engineResult.leaks.values()).filter((l) => l.isControlled).length
    : 0;
  const totalLeaks = gameState.leaks.size;

  const affectedUsers = engineResult
    ? engineResult.userZones.filter((z) => !z.hasWater).reduce((sum, z) => sum + z.population, 0)
    : 0;
  const totalUsers = gameState.userZones.reduce((sum, z) => sum + z.population, 0);

  const avgPressure = engineResult?.pressure.averagePressure ?? 0;
  const pressureStatus = getPressureStatus(avgPressure);

  const unacknowledgedAlerts = gameState.alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="w-full industrial-panel p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-industrial-text">状态监控</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            gameState.status === 'playing' ? 'bg-green-500 animate-pulse' :
            gameState.status === 'finished' ? 'bg-blue-500' :
            'bg-gray-500'
          }`} />
          <span className="text-sm text-industrial-muted">
            {gameState.status === 'playing' ? '运行中' :
             gameState.status === 'finished' ? '已结束' :
             gameState.status === 'replaying' ? '回放中' : '待开始'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-industrial-bg/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-industrial-muted text-sm mb-1">
            <Clock size={14} />
            <span>用时</span>
          </div>
          <div className="data-value text-industrial-text">
            {formatTime(elapsedTime)}
          </div>
          <div className="text-xs text-industrial-muted">
            目标: {formatTime(currentScene.targetTime)}
          </div>
        </div>

        <div className="bg-industrial-bg/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-industrial-muted text-sm mb-1">
            <Gauge size={14} />
            <span>管网压力</span>
          </div>
          <div className={`data-value ${
            pressureStatus === 'normal' ? 'text-green-400' :
            pressureStatus === 'low' ? 'text-yellow-400' :
            pressureStatus === 'critical' ? 'text-red-400' :
            'text-gray-400'
          }`}>
            {(avgPressure * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-industrial-muted">
            {pressureStatus === 'normal' ? '正常' :
             pressureStatus === 'low' ? '偏低' :
             pressureStatus === 'critical' ? '危险' :
             '离线'}
          </div>
        </div>

        <div className="bg-industrial-bg/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-industrial-muted text-sm mb-1">
            <Droplets size={14} />
            <span>漏点控制</span>
          </div>
          <div className="data-value text-industrial-text">
            {controlledLeaks} / {totalLeaks}
          </div>
          <div className="w-full h-2 bg-industrial-border rounded-full mt-1">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalLeaks > 0 ? (controlledLeaks / totalLeaks) * 100 : 0}%`,
                backgroundColor: controlledLeaks === totalLeaks ? '#10B981' : '#F59E0B'
              }}
            />
          </div>
        </div>

        <div className="bg-industrial-bg/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-industrial-muted text-sm mb-1">
            <Users size={14} />
            <span>受影响用户</span>
          </div>
          <div className={`data-value ${affectedUsers > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {affectedUsers}
          </div>
          <div className="text-xs text-industrial-muted">
            总计: {totalUsers}户
          </div>
        </div>
      </div>

      {scoreBreakdown && (
        <div className="bg-industrial-bg/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-industrial-muted">当前得分</span>
            <span
              className="text-2xl font-bold font-mono"
              style={{ color: getScoreLevelColor(scoreBreakdown.score.level) }}
            >
              {scoreBreakdown.score.total}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-industrial-muted">评级</span>
            <span
              className="px-2 py-0.5 rounded text-sm font-bold"
              style={{
                backgroundColor: `${getScoreLevelColor(scoreBreakdown.score.level)}20`,
                color: getScoreLevelColor(scoreBreakdown.score.level),
              }}
            >
              {getScoreLevelText(scoreBreakdown.score.level)}
            </span>
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-industrial-muted">止漏得分</span>
              <span className={scoreBreakdown.score.leakControl >= 0 ? 'text-green-400' : 'text-red-400'}>
                {scoreBreakdown.score.leakControl > 0 ? '+' : ''}{scoreBreakdown.score.leakControl}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-industrial-muted">用户影响</span>
              <span className={scoreBreakdown.score.userImpact >= 0 ? 'text-green-400' : 'text-red-400'}>
                {scoreBreakdown.score.userImpact > 0 ? '+' : ''}{scoreBreakdown.score.userImpact}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-industrial-muted">操作效率</span>
              <span className={scoreBreakdown.score.operationEfficiency >= 0 ? 'text-green-400' : 'text-red-400'}>
                {scoreBreakdown.score.operationEfficiency > 0 ? '+' : ''}{scoreBreakdown.score.operationEfficiency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-industrial-muted">合规性</span>
              <span className={scoreBreakdown.score.compliance >= 0 ? 'text-green-400' : 'text-red-400'}>
                {scoreBreakdown.score.compliance > 0 ? '+' : ''}{scoreBreakdown.score.compliance}
              </span>
            </div>
          </div>
        </div>
      )}

      {unacknowledgedAlerts > 0 && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle size={16} />
            <span className="font-medium">{unacknowledgedAlerts} 条警告待确认</span>
          </div>
        </div>
      )}

      <div className="border-t border-industrial-border pt-3">
        <h3 className="text-sm font-medium text-industrial-text mb-2">用户区域状态</h3>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {gameState.userZones.map((zone) => {
            const zoneState = engineResult?.userZones.find((z) => z.id === zone.id) ?? zone;
            return (
              <div key={zone.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {zoneState.hasWater ? (
                    <CheckCircle size={14} className="text-green-500" />
                  ) : (
                    <XCircle size={14} className="text-red-500" />
                  )}
                  <span className="text-industrial-text">{zone.name}</span>
                </div>
                <span className="text-industrial-muted">
                  {zone.population}户
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StatusPanel;
