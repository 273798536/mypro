
import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { GameSession, ErrorType, ERROR_TYPES } from '../../types';
import { cn } from '../../lib/utils';
import { getVoicePartName } from '../../utils/gameLogic';

interface ErrorTimelineProps {
  session: GameSession;
}

export const ErrorTimeline: React.FC<ErrorTimelineProps> = ({ session }) => {
  const [expandedType, setExpandedType] = useState<ErrorType | null>(null);

  const errorsByType = ERROR_TYPES.map((type) => ({
    ...type,
    errors: session.errors.filter((e) => e.type === type.type),
  }));

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-amber-500';
      case 'low':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high':
        return '严重';
      case 'medium':
        return '中等';
      case 'low':
        return '轻微';
      default:
        return severity;
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        错误详情分析
      </h3>

      {session.errors.length === 0 ? (
        <div className="text-center py-8 text-white/60">
          本次训练没有检测到错误，表现出色！
        </div>
      ) : (
        <div className="space-y-4">
          {errorsByType.map((type) => (
            <div key={type.type} className="border border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() =>
                  setExpandedType(expandedType === type.type ? null : type.type)
                }
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="font-semibold text-white">{type.name}</span>
                  <span className="text-white/50 text-sm">
                    {type.errors.length} 次
                  </span>
                </div>
                {expandedType === type.type ? (
                  <ChevronUp className="w-5 h-5 text-white/50" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white/50" />
                )}
              </button>

              {expandedType === type.type && type.errors.length > 0 && (
                <div className="p-4 space-y-3 border-t border-white/10">
                  {type.errors.map((error) => (
                    <div
                      key={error.id}
                      className="bg-white/5 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded">
                            第 {error.round} 回合
                          </span>
                          <span className="text-xs font-medium text-white">
                            {getVoicePartName(error.voicePart)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full',
                              getSeverityColor(error.severity)
                            )}
                          />
                          <span className="text-xs text-white/70">
                            {getSeverityText(error.severity)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-white/80">{error.description}</p>
                      <div className="mt-2 text-xs text-red-400">
                        - {error.pointsLost} 分
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

