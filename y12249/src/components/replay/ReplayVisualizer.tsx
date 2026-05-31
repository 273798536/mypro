
import React from 'react';
import { Music, Sparkles } from 'lucide-react';
import { GameSession, DecisionStep, ErrorEvent, VOICE_PARTS } from '../../types';
import { cn } from '../../lib/utils';
import { getVoicePartName, getErrorTypeName } from '../../utils/gameLogic';

interface ReplayVisualizerProps {
  session: GameSession;
  currentRound: number;
}

export const ReplayVisualizer: React.FC<ReplayVisualizerProps> = ({
  session,
  currentRound,
}) => {
  const roundDecisions = session.decisions.filter((d) => d.round === currentRound);
  const roundErrors = session.errors.filter((e) => e.round === currentRound);

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Music className="w-5 h-5 text-amber-400" />
          第 {currentRound} 回合 - 声部状态
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {session.voiceStates.map((voice) => {
            const config = VOICE_PARTS.find((v) => v.part === voice.part);
            return (
              <div
                key={voice.part}
                className="bg-white/5 rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: config?.color }}
                    />
                    <span className="font-semibold text-white">{voice.name}</span>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      voice.syncLevel >= 80
                        ? 'text-green-400'
                        : voice.syncLevel >= 60
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    )}
                  >
                    同步 {voice.syncLevel.toFixed(0)}%
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-white/60 mb-1">
                      <span>音量</span>
                      <span>{voice.volume.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${voice.volume}%`,
                          backgroundColor: config?.color,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-white/60 mb-1">
                      <span>节奏偏差</span>
                      <span>
                        {voice.rhythmOffset > 0 ? '+' : ''}
                        {voice.rhythmOffset.toFixed(1)}
                      </span>
                    </div>
                    <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30" />
                      <div
                        className="absolute h-full rounded-full"
                        style={{
                          left: `calc(50% + ${voice.rhythmOffset}%)`,
                          width: '8px',
                          backgroundColor: config?.color,
                          transform: 'translateX(-50%)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <h4 className="text-lg font-bold text-white mb-4">指挥决策</h4>
          {roundDecisions.length === 0 ? (
            <p className="text-white/50 text-sm">本回合暂无决策记录</p>
          ) : (
            <div className="space-y-3">
              {roundDecisions.map((decision: DecisionStep) => (
                <div
                  key={decision.id}
                  className={cn(
                    'bg-white/5 rounded-lg p-4 border-l-4',
                    decision.triggeredSync
                      ? 'border-amber-400'
                      : 'border-blue-400'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-white/80">{decision.description}</p>
                    <span
                      className={cn(
                        'text-sm font-bold',
                        decision.scoreImpact >= 0 ? 'text-green-400' : 'text-red-400'
                      )}
                    >
                      {decision.scoreImpact >= 0 ? '+' : ''}
                      {decision.scoreImpact}
                    </span>
                  </div>
                  {decision.triggeredSync && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-400">
                      <Sparkles className="w-3 h-3" />
                      触发声部同步
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <h4 className="text-lg font-bold text-white mb-4">错误检测</h4>
          {roundErrors.length === 0 ? (
            <p className="text-white/50 text-sm">本回合无错误</p>
          ) : (
            <div className="space-y-3">
              {roundErrors.map((error: ErrorEvent) => (
                <div
                  key={error.id}
                  className="bg-red-500/10 rounded-lg p-4 border-l-4 border-red-400"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-red-400">
                      {getErrorTypeName(error.type)}
                    </span>
                    <span className="text-xs text-red-400">
                      -{error.pointsLost} 分
                    </span>
                  </div>
                  <p className="text-xs text-white/60">
                    {getVoicePartName(error.voicePart)} - {error.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

