import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getMigrationDirectionText } from '../../utils/ratingUtils';
import type { IndustryType } from '../../types';

export default function FloatingDetail() {
  const { selectedCube, setSelectedCube, balanceWeightEnabled } = useAppStore();

  if (!selectedCube) return null;

  const directionText = getMigrationDirectionText(selectedCube.fromRating, selectedCube.toRating);
  const direction = selectedCube.y - selectedCube.x;

  const industryStats = selectedCube.records.reduce((acc, r) => {
    const industry = r.industry || '未标注';
    acc[industry] = (acc[industry] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed top-20 right-6 w-80 bg-slate-800/95 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl z-40 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white font-mono">{selectedCube.fromRating}</span>
            <span className="text-slate-500">→</span>
            <span className="text-xl font-bold text-white font-mono">{selectedCube.toRating}</span>
          </div>
          <button
            onClick={() => setSelectedCube(null)}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {direction < 0 ? (
            <TrendingUp className="text-green-400" size={16} />
          ) : direction > 0 ? (
            <TrendingDown className="text-red-400" size={16} />
          ) : (
            <Minus className="text-blue-400" size={16} />
          )}
          <span className={
            direction < 0 ? 'text-green-400' :
            direction > 0 ? 'text-red-400' : 'text-blue-400'
          }>
            {directionText}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-xs text-slate-500">迁徙次数</p>
            <p className="text-xl font-bold text-white font-mono">{selectedCube.count}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-xs text-slate-500">总余额</p>
            <p className="text-xl font-bold text-white font-mono">{selectedCube.totalBalance.toLocaleString()}</p>
            <p className="text-xs text-slate-500">万元</p>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-2">平均余额</p>
          <p className="text-lg font-bold text-purple-400 font-mono">
            {selectedCube.avgBalance.toFixed(0).toLocaleString()} 万
          </p>
          {balanceWeightEnabled && (
            <p className="text-xs text-purple-400 mt-1">✓ 余额权重已启用</p>
          )}
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-2">时间</p>
          <p className="text-sm text-slate-200 font-mono">{selectedCube.month}</p>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-2">行业分布</p>
          <div className="space-y-1.5">
            {Object.entries(industryStats).map(([industry, count]) => (
              <div key={industry} className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{industry}</span>
                <span className="text-sm text-slate-300 font-mono">{count} 笔</span>
              </div>
            ))}
          </div>
        </div>

        {selectedCube.anomalies.length > 0 && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
            <p className="text-xs text-red-400 font-semibold mb-2">
              ⚠️ 检测到 {selectedCube.anomalies.length} 个异常
            </p>
            <div className="space-y-1">
              {selectedCube.anomalies.map((a) => (
                <p key={a.id} className={`text-xs ${a.severity === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
                  • {a.description}
                </p>
              ))}
            </div>
          </div>
        )}

        {selectedCube.records[0]?.riskReport && (
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
            <p className="text-xs text-blue-400 font-semibold mb-1">风险报告摘要</p>
            <p className="text-sm text-slate-300">{selectedCube.records[0].riskReport}</p>
          </div>
        )}
      </div>
    </div>
  );
}
