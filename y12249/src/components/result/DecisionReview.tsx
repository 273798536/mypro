
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { History, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { GameSession } from '../../types';
import { cn } from '../../lib/utils';

interface DecisionReviewProps {
  session: GameSession;
}

export const DecisionReview: React.FC<DecisionReviewProps> = ({ session }) => {
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  const decisionsByRound = session.decisions.reduce((acc, decision) => {
    if (!acc[decision.round]) {
      acc[decision.round] = [];
    }
    acc[decision.round].push(decision);
    return acc;
  }, {} as Record<number, typeof session.decisions>);

  const scoreHistory = Array.from({ length: session.totalRounds }, (_, i) => {
    const round = i + 1;
    const roundDecisions = decisionsByRound[round] || [];
    const roundErrors = session.errors.filter((e) => e.round === round);
    const scoreImpact = roundDecisions.reduce((sum, d) => sum + d.scoreImpact, 0);
    const errorImpact = roundErrors.reduce((sum, e) => sum + e.pointsLost, 0);
    const hasSync = roundDecisions.some((d) => d.triggeredSync);

    return {
      round,
      score: 70 + scoreImpact - errorImpact + (hasSync ? 5 : 0),
      hasSync,
      decisions: roundDecisions.length,
      errors: roundErrors.length,
    };
  });

  const syncPoints = scoreHistory.filter((s) => s.hasSync);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <History className="w-5 h-5 text-blue-400" />
        决策回溯
      </h3>

      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={scoreHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="round"
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(30, 58, 95, 0.95)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: 'white',
              }}
              formatter={(value: number) => [`${value.toFixed(1)} 分`, '得分']}
              labelFormatter={(label) => `第 ${label} 回合`}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#D4AF37"
              strokeWidth={3}
              dot={{ fill: '#D4AF37', strokeWidth: 2 }}
              activeDot={{ r: 8, fill: '#D4AF37' }}
            />
            {syncPoints.map((point, index) => (
              <ReferenceDot
                key={index}
                x={point.round}
                y={point.score}
                r={8}
                fill="#2ECC71"
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="text-white/60">评分趋势</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-white/60 flex items-center gap-1">
            声部同步 <Sparkles className="w-3 h-3 text-amber-400" />
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(decisionsByRound)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([round, decisions]) => {
            const roundNum = Number(round);
            const hasSync = decisions.some((d) => d.triggeredSync);

            return (
              <div
                key={round}
                className={cn(
                  'border rounded-xl overflow-hidden transition-all',
                  hasSync ? 'border-amber-400/50' : 'border-white/10'
                )}
              >
                <button
                  onClick={() =>
                    setExpandedRound(expandedRound === roundNum ? null : roundNum)
                  }
                  className={cn(
                    'w-full flex items-center justify-between p-4 transition-colors',
                    hasSync ? 'bg-amber-400/10 hover:bg-amber-400/20' : 'bg-white/5 hover:bg-white/10'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white/50 text-sm">第 {round} 回合</span>
                    {hasSync && (
                      <span className="text-xs bg-amber-400/20 text-amber-400 px-2 py-1 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        触发同步
                      </span>
                    )}
                    <span className="text-white/60 text-sm">
                      {decisions.length} 个决策
                    </span>
                  </div>
                  {expandedRound === roundNum ? (
                    <ChevronUp className="w-5 h-5 text-white/50" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white/50" />
                  )}
                </button>

                {expandedRound === roundNum && (
                  <div className="p-4 space-y-2 border-t border-white/10">
                    {decisions.map((decision) => (
                      <div
                        key={decision.id}
                        className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                      >
                        <span className="text-sm text-white/80">
                          {decision.description}
                        </span>
                        <span
                          className={cn(
                            'text-sm font-medium',
                            decision.scoreImpact >= 0 ? 'text-green-400' : 'text-red-400'
                          )}
                        >
                          {decision.scoreImpact >= 0 ? '+' : ''}
                          {decision.scoreImpact} 分
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

