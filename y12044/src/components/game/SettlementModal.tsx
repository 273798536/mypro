import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Trophy, TrendingUp, TrendingDown, AlertCircle, Droplets, Snowflake, Leaf, ChevronRight } from 'lucide-react';
import { RoundData } from '../../types/game';
import { useGameStore } from '../../store/useGameStore';
import { anomalyTypeLabels, anomalyExplanations } from '../../data/initialState';

interface SettlementModalProps {
  data: RoundData;
  onClose: () => void;
  isGameOver: boolean;
}

const SettlementModal: React.FC<SettlementModalProps> = ({ data, onClose, isGameOver }) => {
  const navigate = useNavigate();
  const totalScore = useGameStore(state => state.totalScore);

  const getScoreColor = (score: number) => {
    if (score >= 0) return 'text-green-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-space-800 rounded-2xl max-w-lg w-full p-6 glow-border animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="font-orbitron text-xl font-bold text-tech-400">
              {isGameOver ? '🏆 游戏结束' : `回合 ${data.roundNumber} 结算`}
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              {isGameOver ? '最终成绩已出炉' : '本回合结果汇总'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-space-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6 p-4 bg-space-700 rounded-xl">
          <Trophy className="text-yellow-400" size={28} />
          <div className="text-center">
            <div className={`font-orbitron text-3xl font-bold ${getScoreColor(data.score)}`}>
              {data.score >= 0 ? '+' : ''}{data.score}
            </div>
            <div className="text-xs text-gray-400">本回合得分</div>
          </div>
          <div className="text-gray-500 text-2xl mx-2">=</div>
          <div className="text-center">
            <div className="font-orbitron text-2xl font-bold text-yellow-400">
              {totalScore}
            </div>
            <div className="text-xs text-gray-400">总分</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 bg-space-700 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <Droplets size={14} className="text-blue-400" />
              <span>储水量</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{data.resources.water}</span>
              <span className="text-xs text-gray-500">L</span>
            </div>
          </div>
          <div className="p-3 bg-space-700 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <Snowflake size={14} className="text-cyan-400" />
              <span>冰储量</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{data.resources.ice}</span>
              <span className="text-xs text-gray-500">kg</span>
            </div>
          </div>
          <div className="p-3 bg-space-700 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <Leaf size={14} className="text-green-400" />
              <span>温室湿度</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{data.resources.greenhouseHumidity}</span>
              <span className="text-xs text-gray-500">%</span>
            </div>
          </div>
          <div className="p-3 bg-space-700 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              {data.score >= 0 ? (
                <TrendingUp size={14} className="text-green-400" />
              ) : (
                <TrendingDown size={14} className="text-red-400" />
              )}
              <span>执行操作</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{data.actions.length}</span>
              <span className="text-xs text-gray-500">次</span>
            </div>
          </div>
        </div>

        {data.anomalies.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-red-400 mb-3">
              <AlertCircle size={16} />
              <span className="font-medium">异常事件 ({data.anomalies.length})</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {data.anomalies.map((anomaly, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-lg ${
                    anomaly.severity === 'critical' 
                      ? 'bg-red-500/10 border border-red-500/30' 
                      : 'bg-yellow-500/10 border border-yellow-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${
                      anomaly.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {anomalyTypeLabels[anomaly.type]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {anomaly.severity === 'critical' ? '严重' : '警告'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{anomaly.message}</p>
                  <p className="text-xs text-gray-500 mt-1 italic">
                    💡 {anomalyExplanations[anomaly.type]?.simple}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.conflicts.length > 0 && (
          <div className="mb-6 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
            <div className="text-sm text-yellow-400 font-medium mb-1">
              ⚠️ 本回合解决了 {data.conflicts.length} 个冲突
            </div>
            <div className="text-xs text-gray-400">
              冲突管理是团队协作的重要部分，继续加油！
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-space-700 text-gray-300 font-medium rounded-lg hover:bg-space-600 transition-all"
          >
            {isGameOver ? '返回游戏' : '继续游戏'}
          </button>
          {isGameOver && (
            <button
              onClick={() => navigate('/report')}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-tech-500 to-tech-400 text-white font-bold rounded-lg hover:from-tech-400 hover:to-tech-500 transition-all"
            >
              <span>查看报告</span>
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettlementModal;
