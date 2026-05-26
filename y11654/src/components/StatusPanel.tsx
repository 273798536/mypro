import { Wind, Weight, Timer, Trophy, Target, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { DIFFICULTY_CONFIG, RISK_INFO } from '../types/game';
import { cn } from '../lib/utils';

export default function StatusPanel() {
  const { 
    score, 
    currentRound, 
    roundTimeRemaining, 
    crane, 
    environment, 
    activeRisks,
    difficulty,
    currentSession
  } = useGameStore();
  
  const config = DIFFICULTY_CONFIG[difficulty];
  
  const isOverweight = crane.loadWeight > crane.maxLoad;
  const isWindDanger = environment.windSpeed > environment.safeWindSpeed;
  const hasActiveRisk = activeRisks.some(r => !r.resolved);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getWindDirection = (deg: number) => {
    const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
  };
  
  return (
    <div className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-5 border border-dark-700 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary-500" />
          <span className="text-dark-400 text-sm">当前得分</span>
        </div>
        <span className="text-2xl font-industrial font-bold text-white">{score}</span>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-info-500" />
          <span className="text-dark-400 text-sm">回合进度</span>
        </div>
        <span className="text-lg font-semibold text-white">
          {currentRound} / {currentSession?.totalRounds || config.maxRounds}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-primary-400" />
          <span className="text-dark-400 text-sm">剩余时间</span>
        </div>
        <span className={cn(
          "text-lg font-mono font-bold",
          roundTimeRemaining < 10 ? 'text-danger-500 animate-pulse' : 'text-white'
        )}>
          {formatTime(roundTimeRemaining)}
        </span>
      </div>
      
      <div className="h-px bg-dark-700" />
      
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Weight className={cn("w-5 h-5", isOverweight ? 'text-danger-500' : 'text-success-500')} />
              <span className="text-dark-400 text-sm">吊物重量</span>
            </div>
            <div className="text-right">
              <span className={cn(
                "font-bold",
                isOverweight ? 'text-danger-500' : 'text-white'
              )}>
                {crane.loadWeight.toFixed(0)} kg
              </span>
              <span className="text-dark-500 text-sm ml-2">/ {crane.maxLoad} kg</span>
            </div>
          </div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-300",
                isOverweight ? 'bg-danger-500' : crane.loadWeight > crane.maxLoad * 0.8 ? 'bg-primary-500' : 'bg-success-500'
              )}
              style={{ width: `${Math.min(100, (crane.loadWeight / crane.maxLoad) * 100)}%` }}
            />
          </div>
          {isOverweight && (
            <div className="flex items-center gap-1 mt-2 text-danger-400 text-xs">
              <AlertTriangle className="w-3 h-3" />
              <span>超重警告！请拒绝起吊</span>
            </div>
          )}
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wind className={cn("w-5 h-5", isWindDanger ? 'text-danger-500' : 'text-info-500')} />
              <span className="text-dark-400 text-sm">风速风向</span>
            </div>
            <div className="text-right">
              <span className={cn(
                "font-bold",
                isWindDanger ? 'text-danger-500' : 'text-white'
              )}>
                {environment.windSpeed.toFixed(1)} m/s
              </span>
              <span className="text-dark-500 text-sm ml-2">
                {getWindDirection(environment.windDirection)}风
              </span>
            </div>
          </div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-300",
                isWindDanger ? 'bg-danger-500' : environment.windSpeed > environment.safeWindSpeed * 0.8 ? 'bg-primary-500' : 'bg-info-500'
              )}
              style={{ width: `${Math.min(100, (environment.windSpeed / environment.safeWindSpeed / 1.5) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-dark-500">
            <span>安全阈值: {environment.safeWindSpeed} m/s</span>
            {isWindDanger && (
              <span className="text-danger-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                风速超限！
              </span>
            )}
          </div>
        </div>
      </div>
      
      {hasActiveRisk && (
        <div className="p-4 bg-danger-500/20 border border-danger-500/50 rounded-lg animate-pulse">
          <div className="flex items-center gap-2 text-danger-400 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-bold">⚠️ 风险警报</span>
          </div>
          {activeRisks.filter(r => !r.resolved).map(risk => (
            <div key={risk.id} className="text-sm text-dark-300">
              {RISK_INFO[risk.type].name} - 请立即{
                risk.type === 'overweight' ? '拒绝起吊' : '紧急停止'
              }！
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
