import React from 'react';
import { TrendingDown, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

const ScoreImpact: React.FC = () => {
  const { score, misjudgments, decisionLog } = useGameStore();

  const collisionCount = decisionLog.filter(d => d.consequence === 'collision').length;
  const nearMissCount = decisionLog.filter(d => d.consequence === 'near-miss').length;
  const lateEntryCount = decisionLog.filter(d => d.isLateEntry).length;
  const missingFieldsCount = decisionLog.filter(d => d.isMissingFields).length;

  const scoreBreakdown = [
    { label: '基础分', value: 100, color: 'text-sonar-green-400', positive: true },
    { label: '回声误判', value: misjudgments.length * -15, color: 'text-warning-orange-400', positive: false, count: misjudgments.length },
    { label: '碰撞事故', value: collisionCount * -30, color: 'text-danger-red-400', positive: false, count: collisionCount },
    { label: '险象环生', value: nearMissCount * -5, color: 'text-warning-orange-400', positive: false, count: nearMissCount },
    { label: '节拍外决策', value: lateEntryCount * -3, color: 'text-tech-cyan-400', positive: false, count: lateEntryCount },
    { label: '记录不完整', value: missingFieldsCount * -2, color: 'text-gray-400', positive: false, count: missingFieldsCount },
  ];

  return (
    <div className="glow-border rounded-lg p-4 bg-deep-ocean-950/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-tech-cyan-500 font-display text-sm">成绩影响分析</h3>
        <TrendingDown size={16} className="text-gray-500" />
      </div>

      <div className="mb-4">
        <div className="flex items-end justify-between mb-2">
          <span className="text-xs text-gray-500">最终得分</span>
          <span className={`text-3xl font-display ${score >= 60 ? 'text-sonar-green-400' : score >= 40 ? 'text-warning-orange-400' : 'text-danger-red-400'}`}>
            {score}
          </span>
        </div>
        <div className="h-3 bg-deep-ocean-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              score >= 60 ? 'bg-sonar-green-500' : score >= 40 ? 'bg-warning-orange-500' : 'bg-danger-red-500'
            }`}
            style={{ width: `${Math.max(0, score)}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {scoreBreakdown.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {item.positive ? (
                <CheckCircle size={14} className={item.color} />
              ) : (
                item.count && item.count > 0 ? (
                  <XCircle size={14} className={item.color} />
                ) : (
                  <div className="w-3.5" />
                )
              )}
              <span className="text-gray-400">{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span className={`text-xs ${item.color}`}>({item.count}次)</span>
              )}
            </div>
            <span className={`font-mono ${item.color}`}>
              {item.positive ? '+' : ''}{item.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-deep-ocean-800">
        <div className="flex items-start gap-2">
          <AlertTriangle size={14} className="text-warning-orange-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-400">
            <p className="text-warning-orange-400 font-medium mb-1">关键学习点</p>
            {misjudgments.length > 0 ? (
              <p>本次航行共发生 {misjudgments.length} 次回声误判。建议重点学习波形识别技巧，在复杂地形前减速确认。</p>
            ) : collisionCount > 0 ? (
              <p>发生了碰撞事故。建议增加声呐扫描频率，保持安全距离。</p>
            ) : (
              <p>表现良好！继续保持谨慎的航行习惯。</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreImpact;
