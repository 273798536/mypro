import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useAppStore } from '@/store/appStore';
import { formatNumber } from '@/utils/dataProcessor';
import { Clock, AlertTriangle, CheckCircle, XCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LagResult } from '@/types';

export default function LagAnalysis() {
  const { analysisResult, analysisParams } = useAppStore();
  const [selectedLag, setSelectedLag] = useState<LagResult | null>(null);

  const lagWithIssues = useMemo(() => {
    if (!analysisResult) return [];
    return analysisResult.lagResults.filter(l => l.warning === 'lag_detected');
  }, [analysisResult]);

  const chartOption = useMemo(() => {
    if (!selectedLag || selectedLag.correlations.length === 0) return null;

    const maxLag = analysisParams.maxLag;
    const lags = Array.from({ length: maxLag * 2 + 1 }, (_, i) => i - maxLag);
    const zeroIndex = maxLag;

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const lag = params[0].axisValue;
          const value = params[0].data;
          return `滞后 ${lag} 期<br/>相关系数: <strong>${formatNumber(value)}</strong>`;
        }
      },
      grid: {
        left: '10%',
        right: '5%',
        top: '10%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: lags,
        name: '滞后阶数',
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        axisLine: { lineStyle: { color: '#475569' } }
      },
      yAxis: {
        type: 'value',
        min: -1,
        max: 1,
        name: '相关系数',
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        axisLine: { lineStyle: { color: '#475569' } },
        splitLine: { lineStyle: { color: '#334155', type: 'dashed' } }
      },
      series: [{
        type: 'bar',
        data: selectedLag.correlations.map((val, i) => ({
          value: val,
          itemStyle: {
            color: i === zeroIndex 
              ? '#64748b' 
              : i === zeroIndex + selectedLag.bestLag 
                ? '#f59e0b' 
                : val > 0 ? '#06b6d4' : '#ef4444'
          }
        })),
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#475569', type: 'dashed' },
          data: [{ yAxis: 0 }, { yAxis: analysisParams.correlationThreshold }, { yAxis: -analysisParams.correlationThreshold }]
        }
      }]
    };
  }, [selectedLag, analysisParams.maxLag, analysisParams.correlationThreshold]);

  if (!analysisResult) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <Clock className="h-12 w-12 mb-3 opacity-50" />
        <p>请先完成数据上传和参数配置，然后点击开始分析</p>
      </div>
    );
  }

  const displayedResults = lagWithIssues.length > 0 ? lagWithIssues : analysisResult.lagResults.slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-400" />
          <h3 className="font-medium text-slate-200">滞后关系检测</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-slate-400">
            <BarChart3 className="h-4 w-4" />
            共 {analysisResult.lagResults.length} 组检测
          </span>
          {lagWithIssues.length > 0 && (
            <span className="flex items-center gap-1 text-red-400 animate-pulse">
              <AlertTriangle className="h-4 w-4" />
              {lagWithIssues.length} 个滞后关系
            </span>
          )}
        </div>
      </div>

      {selectedLag && (
        <div className="bg-slate-800/50 border border-amber-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-medium">
                {selectedLag.variable1} <span className="text-amber-400">→</span> {selectedLag.variable2}
              </span>
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                selectedLag.warning === 'lag_detected' 
                  ? "bg-amber-900/50 text-amber-300"
                  : "bg-slate-700 text-slate-400"
              )}>
                {selectedLag.warning === 'lag_detected' ? '检测到滞后' :
                 selectedLag.warning === 'no_lag' ? '无显著滞后' : '数据不足'}
              </span>
            </div>
            <button
              onClick={() => setSelectedLag(null)}
              className="text-slate-400 hover:text-slate-300 text-sm"
            >
              关闭
            </button>
          </div>
          {chartOption && (
            <ReactECharts
              option={chartOption}
              style={{ height: '200px' }}
              theme="dark"
            />
          )}
          <div className="mt-2 text-xs text-slate-400">
            <span className="text-amber-400">●</span> 最佳滞后阶数为 {selectedLag.bestLag} 期，最大相关系数 {formatNumber(selectedLag.maxCorrelation)}
          </div>
        </div>
      )}

      {lagWithIssues.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-amber-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            检测到的滞后关系
          </h4>
          {lagWithIssues.map((lag, idx) => (
            <LagCard
              key={`issue-${idx}`}
              lag={lag}
              isSelected={selectedLag?.variable1 === lag.variable1 && selectedLag?.variable2 === lag.variable2}
              onClick={() => setSelectedLag(lag)}
              highlight={true}
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-slate-300">
          {lagWithIssues.length > 0 ? '其他检测结果' : '检测结果'}
        </h4>
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {displayedResults.map((lag, idx) => (
            <LagCard
              key={`all-${idx}`}
              lag={lag}
              isSelected={selectedLag?.variable1 === lag.variable1 && selectedLag?.variable2 === lag.variable2}
              onClick={() => setSelectedLag(lag)}
              highlight={false}
            />
          ))}
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-300 mb-2">如何解读</h4>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• <span className="text-amber-400">滞后关系</span>：变量 A 的变化在 N 期后影响变量 B，说明可能存在因果关系</li>
          <li>• <span className="text-amber-400">最佳滞后阶数</span>：相关系数最大时的滞后期数</li>
          <li>• 灰色柱表示零期（同期）相关，橙色柱表示最佳滞后</li>
          <li>• 虚线表示相关系数阈值，超出则为显著</li>
          <li>• 请结合业务逻辑验证滞后关系是否合理</li>
        </ul>
      </div>
    </div>
  );
}

function LagCard({
  lag,
  isSelected,
  onClick,
  highlight
}: {
  lag: LagResult;
  isSelected: boolean;
  onClick: () => void;
  highlight: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg cursor-pointer transition-all",
        isSelected && "ring-2 ring-amber-500",
        highlight
          ? "bg-red-900/20 border border-red-700/50 hover:bg-red-900/30"
          : "bg-slate-800 hover:bg-slate-700/50 border border-transparent"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {lag.warning === 'lag_detected' ? (
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          ) : lag.warning === 'insufficient_data' ? (
            <XCircle className="h-5 w-5 text-slate-500 flex-shrink-0" />
          ) : (
            <CheckCircle className="h-5 w-5 text-slate-500 flex-shrink-0" />
          )}
          <div>
            <p className="text-sm text-slate-200">
              <span className="font-mono">{lag.variable1}</span>
              <span className="mx-2 text-slate-500">→</span>
              <span className="font-mono">{lag.variable2}</span>
            </p>
            <p className="text-xs text-slate-500">
              来源: {Array.from(new Set(lag.sourceRows.map(r => r.file))).join(', ') || '未知'} · 示例行: {lag.sourceRows.slice(0, 3).map(r => r.rowIndex).join(', ')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn(
            "font-mono font-medium",
            lag.warning === 'lag_detected' ? "text-amber-400" : "text-slate-400"
          )}>
            滞后 {lag.bestLag} 期
          </p>
          <p className="text-xs text-slate-500">
            r = {formatNumber(lag.maxCorrelation)}
          </p>
        </div>
      </div>
    </div>
  );
}
