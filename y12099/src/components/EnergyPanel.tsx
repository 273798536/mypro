import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { Zap, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { EnergyEstimate } from '../data/types';

const SEASON_LABELS: Record<string, string> = {
  spring: '春季',
  summer: '夏季',
  autumn: '秋季',
  winter: '冬季',
};

export function EnergyPanel() {
  const currentSeason = useAppStore((s) => s.currentSeason);
  const diagnosticResult = useAppStore((s) => s.diagnosticResult);
  const selectedPanelId = useAppStore((s) => s.selectedPanelId);
  const panels = useAppStore((s) => s.panels);

  const currentSeasonData = useMemo(() => {
    if (!diagnosticResult) return [];
    return diagnosticResult.energyEstimates.filter((e) => e.season === currentSeason);
  }, [diagnosticResult, currentSeason]);

  const totals = useMemo(() => {
    if (!currentSeasonData.length) {
      return { gross: 0, shadowLoss: 0, azimuthLoss: 0, seasonLoss: 0, net: 0 };
    }
    return currentSeasonData.reduce(
      (acc, e) => ({
        gross: acc.gross + e.grossKwh,
        shadowLoss: acc.shadowLoss + e.shadowLossKwh,
        azimuthLoss: acc.azimuthLoss + e.azimuthLossKwh,
        seasonLoss: acc.seasonLoss + e.seasonLossKwh,
        net: acc.net + e.netKwh,
      }),
      { gross: 0, shadowLoss: 0, azimuthLoss: 0, seasonLoss: 0, net: 0 }
    );
  }, [currentSeasonData]);

  const comparisonData = useMemo(() => {
    if (!diagnosticResult) return [];
    const seasons = ['spring', 'summer', 'autumn', 'winter'];
    return seasons.map((s) => {
      const seasonData = diagnosticResult.energyEstimates.filter((e) => e.season === s);
      const gross = seasonData.reduce((sum, e) => sum + e.grossKwh, 0);
      const net = seasonData.reduce((sum, e) => sum + e.netKwh, 0);
      return {
        season: SEASON_LABELS[s],
        理论发电: Math.round(gross),
        实际发电: Math.round(net),
        修正后: Math.round(gross * 0.95),
      };
    });
  }, [diagnosticResult]);

  const selectedPanel = useMemo(() => {
    if (!selectedPanelId) return null;
    return panels.find((p) => p.id === selectedPanelId) || null;
  }, [selectedPanelId, panels]);

  if (!diagnosticResult) {
    return (
      <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col">
        <div className="p-4 flex-1 flex items-center justify-center">
          <div className="text-center">
            <Zap className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">点击"开始阴影分析"</p>
            <p className="text-slate-600 text-xs mt-1">查看发电估算数据</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col">
      <div className="p-3 border-b border-slate-700">
        <h3 className="text-slate-200 text-sm font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          发电估算 - {SEASON_LABELS[currentSeason]}
        </h3>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-800/50 p-2 border border-slate-700">
            <div className="text-slate-500 text-[10px] mb-0.5">总发电量</div>
            <div className="text-green-400 font-mono text-sm font-semibold">
              {totals.gross.toFixed(1)} kWh
            </div>
          </div>
          <div className="bg-slate-800/50 p-2 border border-slate-700">
            <div className="text-slate-500 text-[10px] mb-0.5">有效发电</div>
            <div className="text-blue-400 font-mono text-sm font-semibold">
              {totals.net.toFixed(1)} kWh
            </div>
          </div>
          <div className="bg-slate-800/50 p-2 border border-slate-700">
            <div className="text-slate-500 text-[10px] mb-0.5">阴影损失</div>
            <div className="text-red-400 font-mono text-sm font-semibold">
              -{totals.shadowLoss.toFixed(1)} kWh
            </div>
          </div>
          <div className="bg-slate-800/50 p-2 border border-slate-700">
            <div className="text-slate-500 text-[10px] mb-0.5">方位角损失</div>
            <div className="text-orange-400 font-mono text-sm font-semibold">
              -{totals.azimuthLoss.toFixed(1)} kWh
            </div>
          </div>
        </div>

        <div className="bg-slate-800/30 p-2 border border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-500 text-[10px]">修正后预计提升</span>
            <span className="text-emerald-400 font-mono text-xs font-semibold">
              +{(totals.shadowLoss + totals.azimuthLoss + totals.seasonLoss).toFixed(1)} kWh
            </span>
          </div>
          <div className="h-1.5 bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-emerald-500 transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  ((totals.shadowLoss + totals.azimuthLoss + totals.seasonLoss) / totals.gross) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-4">
          <h4 className="text-slate-400 text-xs font-semibold mb-2">逐时发电量</h4>
          <div className="h-40 bg-slate-950 border border-slate-700">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentSeasonData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="hour"
                  stroke="#475569"
                  tick={{ fill: '#64748b', fontSize: 9 }}
                />
                <YAxis
                  stroke="#475569"
                  tick={{ fill: '#64748b', fontSize: 9 }}
                  tickFormatter={(v) => v.toFixed(1)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 0,
                    fontSize: 11,
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(value: number) => [`${value.toFixed(2)} kWh`, '净发电']}
                />
                <Area
                  type="monotone"
                  dataKey="netKwh"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorNet)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="text-slate-400 text-xs font-semibold mb-2">季节修正对比</h4>
          <div className="h-36 bg-slate-950 border border-slate-700">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="season"
                  stroke="#475569"
                  tick={{ fill: '#64748b', fontSize: 9 }}
                />
                <YAxis
                  stroke="#475569"
                  tick={{ fill: '#64748b', fontSize: 9 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 0,
                    fontSize: 11,
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Bar dataKey="理论发电" fill="#475569" radius={0} />
                <Bar dataKey="实际发电" fill="#3b82f6" radius={0} />
                <Bar dataKey="修正后" fill="#22c55e" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {selectedPanel && (
          <div className="bg-slate-800/50 border border-blue-900/50 p-3">
            <h4 className="text-blue-400 text-xs font-semibold mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              选中组件详情
            </h4>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">组件ID:</span>
                <span className="text-slate-300 font-mono">{selectedPanel.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">型号:</span>
                <span className="text-slate-300 font-mono">{selectedPanel.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">尺寸:</span>
                <span className="text-slate-300 font-mono">
                  {selectedPanel.width}x{selectedPanel.height}m
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">效率:</span>
                <span className="text-slate-300 font-mono">
                  {(selectedPanel.efficiency * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">位置:</span>
                <span className="text-slate-300 font-mono">
                  ({selectedPanel.x.toFixed(1)}, {selectedPanel.y.toFixed(1)})
                </span>
              </div>
              {selectedPanel.notes && (
                <div className="mt-2 pt-2 border-t border-slate-700">
                  <span className="text-yellow-500 text-[10px]">备注: {selectedPanel.notes}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-700">
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <ArrowRight className="w-3 h-3" />
          <span>点击组件查看详情，点击明细表记录定位</span>
        </div>
      </div>
    </div>
  );
}
