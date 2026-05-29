import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, AlertOctagon, Users, Ban, AlertCircle, Trophy, LinkIcon } from 'lucide-react';
import { useStore } from '@/store/useStore';
import RadarChart from '@/components/RadarChart';

const ANOMALY_TYPE_LABELS: Record<string, string> = {
  zero_value: '零值',
  negative_value: '负值',
  extreme_outlier: '极端偏离',
  weight_mismatch: '权重异常',
  consistency_error: '一致性异常',
};

export default function RankingBoard() {
  const scoredSuppliers = useStore(s => s.scoredSuppliers);
  const anomalies = useStore(s => s.anomalies);
  const highlightField = useStore(s => s.highlightField);
  const navigate = useNavigate();

  if (scoredSuppliers.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-slate-500 text-lg mb-4">请先在评分面板中计算排名</p>
          <Link to="/" className="text-amber-600 hover:text-amber-700 font-medium underline">
            前往评分面板
          </Link>
        </div>
      </div>
    );
  }

  const nonEliminated = scoredSuppliers.filter(s => !s.eliminated);
  const eliminated = scoredSuppliers.filter(s => s.eliminated);
  const maxScore = nonEliminated.length > 0 ? Math.max(...nonEliminated.map(s => s.weightedScore)) : 0;

  const anomalySupplierIds = new Set(anomalies.map(a => a.supplierId));

  const radarData = scoredSuppliers.map(s => ({
    name: s.quote.name,
    scores: s.dimensionScores,
    eliminated: s.eliminated,
    hasAnomaly: anomalySupplierIds.has(s.quote.id),
  }));

  const ranked = [...scoredSuppliers].sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    return b.weightedScore - a.weightedScore;
  });

  const tiedRanks = new Map<number, number>();
  const nonElimRanked = ranked.filter(s => !s.eliminated);
  nonElimRanked.forEach(s => {
    tiedRanks.set(s.rank, (tiedRanks.get(s.rank) ?? 0) + 1);
  });

  const handleAnomalyClick = (supplierId: string, dimension: string) => {
    highlightField(supplierId, dimension);
    navigate('/');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">雷达图对比</h2>
          <RadarChart data={radarData} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
            <Users className="text-blue-500" size={24} />
            <div>
              <div className="text-2xl font-bold text-blue-600">{nonEliminated.length}</div>
              <div className="text-xs text-slate-500">参评供应商数</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
            <Ban className="text-red-500" size={24} />
            <div>
              <div className="text-2xl font-bold text-red-600">{eliminated.length}</div>
              <div className="text-xs text-slate-500">已淘汰数</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
            <AlertCircle className="text-red-500" size={24} />
            <div>
              <div className="text-2xl font-bold text-red-600">{anomalies.length}</div>
              <div className="text-xs text-slate-500">异常数</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
            <Trophy className="text-emerald-500" size={24} />
            <div>
              <div className="text-2xl font-bold text-emerald-600">{maxScore.toFixed(1)}</div>
              <div className="text-xs text-slate-500">最高分</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">排名表</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white text-xs uppercase">
                <th className="px-3 py-2 text-left">排名</th>
                <th className="px-3 py-2 text-left">供应商</th>
                <th className="px-3 py-2 text-left">来源</th>
                <th className="px-3 py-2 text-right">价格得分</th>
                <th className="px-3 py-2 text-right">能耗得分</th>
                <th className="px-3 py-2 text-right">售后得分</th>
                <th className="px-3 py-2 text-right">交付期得分</th>
                <th className="px-3 py-2 text-right">加权总分</th>
                <th className="px-3 py-2 text-center">状态</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(s => {
                const isTied = (tiedRanks.get(s.rank) ?? 0) > 1;
                return (
                  <tr
                    key={s.quote.id}
                    className={
                      s.eliminated
                        ? 'bg-red-50 text-red-700 hover:bg-red-100'
                        : 'hover:bg-slate-50'
                    }
                  >
                    <td className="px-3 py-2">
                      {s.eliminated ? (
                        <span className="bg-red-100 text-red-700 rounded px-2 text-xs font-medium">淘汰</span>
                      ) : (
                        <span className="flex items-center gap-1">
                          {s.rank}
                          {isTied && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] rounded px-1">并列</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div>{s.quote.name}</div>
                      {s.eliminated && s.eliminationReason && (
                        <div className="text-xs text-red-400 mt-0.5">{s.eliminationReason}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">{s.quote.source}</td>
                    <td className="px-3 py-2 text-right font-mono">{s.dimensionScores.price.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right font-mono">{s.dimensionScores.energyConsumption.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right font-mono">{s.dimensionScores.afterSales.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right font-mono">{s.dimensionScores.deliveryPeriod.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">{s.weightedScore.toFixed(1)}</td>
                    <td className="px-3 py-2 text-center">
                      {s.eliminated ? (
                        <span className="text-red-600">已淘汰</span>
                      ) : (
                        <span className="text-emerald-600">正常</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="text-amber-500" size={20} />
          <h2 className="text-lg font-semibold text-slate-800">异常说明</h2>
        </div>
        {anomalies.length === 0 ? (
          <p className="text-emerald-600 text-sm font-medium">无异常数据</p>
        ) : (
          <div className="space-y-3">
            {anomalies.map(a => (
              <div
                key={a.id}
                className="border border-slate-100 rounded-lg p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => handleAnomalyClick(a.supplierId, a.dimension)}
              >
                <div className="flex items-start gap-2">
                  {a.severity === 'error' ? (
                    <AlertOctagon className="text-red-500 shrink-0 mt-0.5" size={18} />
                  ) : (
                    <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        a.severity === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {ANOMALY_TYPE_LABELS[a.type] ?? a.type}
                      </span>
                      <span className="text-sm text-slate-700">{a.description}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                      <LinkIcon size={12} />
                      <span>{a.sourceReference}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
