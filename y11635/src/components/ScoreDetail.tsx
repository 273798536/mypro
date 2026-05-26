import React from 'react';
import {
  ShieldCheck, Bell, BellOff, AlertTriangle, Droplets, Waves, Trophy,
} from 'lucide-react';
import { ScoreDetail as ScoreDetailType } from '../types/game';

const iconMap: Record<string, React.ReactNode> = {
  ShieldCheck: <ShieldCheck className="w-4 h-4" />,
  Bell: <Bell className="w-4 h-4" />,
  BellOff: <BellOff className="w-4 h-4" />,
  AlertTriangle: <AlertTriangle className="w-4 h-4" />,
  Droplets: <Droplets className="w-4 h-4" />,
  Waves: <Waves className="w-4 h-4" />,
  Trophy: <Trophy className="w-4 h-4" />,
};

interface ScoreDetailProps {
  details: ScoreDetailType[];
  totalScore: number;
}

export function ScoreDetail({ details, totalScore }: ScoreDetailProps) {
  const groupedDetails = details.reduce((acc, detail) => {
    const round = detail.round;
    if (!acc[round]) {
      acc[round] = [];
    }
    acc[round].push(detail);
    return acc;
  }, {} as Record<number, ScoreDetailType[]>);

  const rounds = Object.keys(groupedDetails).map(Number).sort((a, b) => a - b);

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-100">得分明细</h3>
        <div className={`text-2xl font-mono font-bold ${
          totalScore >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          {totalScore >= 0 ? '+' : ''}{totalScore}
        </div>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
        {rounds.map((round) => (
          <div key={round} className="border border-slate-600 rounded-lg overflow-hidden">
            <div className="bg-slate-700/50 px-3 py-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">回合 {round}</span>
              <span className={`text-sm font-mono ${
                groupedDetails[round].reduce((sum, d) => sum + d.score, 0) >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                {groupedDetails[round].reduce((sum, d) => sum + d.score, 0) >= 0 ? '+' : ''}
                {groupedDetails[round].reduce((sum, d) => sum + d.score, 0)}
              </span>
            </div>
            <div className="divide-y divide-slate-700">
              {groupedDetails[round].map((detail, idx) => (
                <div key={idx} className="px-3 py-2 flex items-start gap-3 hover:bg-slate-700/30">
                  <div className={`mt-0.5 ${
                    detail.score >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {iconMap[detail.icon] || <ShieldCheck className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-200">{detail.category}</span>
                      <span className={`text-sm font-mono font-bold ${
                        detail.score >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {detail.score >= 0 ? '+' : ''}{detail.score}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{detail.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
