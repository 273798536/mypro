import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useAppStore } from '@/store/appStore';
import { formatNumber, formatDate, getFieldValues } from '@/utils/dataProcessor';
import { TrendingUp, AlertTriangle, CheckCircle, LineChart, ArrowUpRight, ArrowDownRight, Minus, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrendResult } from '@/types';

export default function TrendAnalysis() {
  const { analysisResult, analysisParams } = useAppStore();
  const [selectedTrend, setSelectedTrend] = useState<TrendResult | null>(null);

  const trendWithIssues = useMemo(() => {
    if (!analysisResult) return [];
    return analysisResult.trendResults.filter(t => t.warning === 'common_trend');
  }, [analysisResult]);

  const chartOption = useMemo(() => {
    if (!selectedTrend || !analysisResult) return null;

    const colors = ['#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899'];
    const series = selectedTrend.variables.map((variable, idx) => {
      const values: (number | null)[] = [];
      const times: string[] = [];
      
      for (const row of analysisResult.alignedData) {
        const timeVal = row[analysisParams.timeField];
        const val = row[variable];
        if (timeVal !== undefined && timeVal !== null) {
          times.push(formatDate(timeVal as Date));
          values.push(val !== null && val !== undefined ? Number(val) : null);
        }
      }

      return {
        name: variable,
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: {
          width: 2,
          color: colors[idx % colors.length]
        },
        itemStyle: {
          color: colors[idx % colors.length]
        }
      };
    });

    const times: string[] = [];
    for (const row of analysisResult.alignedData) {
      const timeVal = row[analysisParams.timeField];
      if (timeVal !== undefined && timeVal !== null) {
        times.push(formatDate(timeVal as Date));
      }
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: selectedTrend.variables,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        top: 0
      },
      grid: {
        left: '10%',
        right: '5%',
        top: '15%',
        bottom: '10%'
      },
      xAxis: {
        type: 'category',
        data: times,
        axisLabel: {
          color: '#94a3b8',
          fontSize: 9,
          rotate: 45
        },
        axisLine: { lineStyle: { color: '#475569' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        axisLine: { lineStyle: { color: '#475569' } },
        splitLine: { lineStyle: { color: '#334155', type: 'dashed' } }
      },
      series
    };
  }, [selectedTrend, analysisResult, analysisParams.timeField]);

  if (!analysisResult) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <TrendingUp className="h-12 w-12 mb-3 opacity-50" />
        <p>请先完成数据上传和参数配置，然后点击开始分析</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <h3 className="font-medium text-slate-200">共同趋势检测</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-slate-400">
            <LineChart className="h-4 w-4" />
            {analysisResult.trendResults.length} 个趋势组
          </span>
          {trendWithIssues.length > 0 && (
            <span className="flex items-center gap-1 text-red-400 animate-pulse">
              <AlertTriangle className="h-4 w-4" />
              {trendWithIssues.length} 个共同趋势
            </span>
          )}
        </div>
      </div>

      {selectedTrend && (
        <div className="bg-slate-800/50 border border-emerald-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-medium">
                趋势组：{selectedTrend.variables.join(', ')}
              </span>
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                selectedTrend.pattern === 'upward' ? "bg-emerald-900/50 text-emerald-300" :
                selectedTrend.pattern === 'downward' ? "bg-red-900/50 text-red-300" :
                selectedTrend.pattern === 'stable' ? "bg-slate-700 text-slate-300" :
                "bg-amber-900/50 text-amber-300"
              )}>
                <span className="inline-flex items-center gap-1">
                  {selectedTrend.pattern === 'upward' && <ArrowUpRight className="h-3 w-3" />}
                  {selectedTrend.pattern === 'downward' && <ArrowDownRight className="h-3 w-3" />}
                  {selectedTrend.pattern === 'stable' && <Minus className="h-3 w-3" />}
                  {selectedTrend.pattern === 'complex' && <Shuffle className="h-3 w-3" />}
                  {selectedTrend.pattern === 'upward' ? '上升' :
                   selectedTrend.pattern === 'downward' ? '下降' :
                   selectedTrend.pattern === 'stable' ? '稳定' : '复杂'}
                </span>
              </span>
            </div>
            <button
              onClick={() => setSelectedTrend(null)}
              className="text-slate-400 hover:text-slate-300 text-sm"
            >
              关闭
            </button>
          </div>
          {chartOption && (
            <ReactECharts
              option={chartOption}
              style={{ height: '250px' }}
              theme="dark"
            />
          )}
          <div className="mt-2 text-xs text-slate-400">
            趋势强度：{formatNumber(selectedTrend.trendStrength)} · 来源文件：{selectedTrend.sourceRows[0]?.file || '未知'}
          </div>
        </div>
      )}

      {analysisResult.trendResults.length === 0 ? (
        <div className="bg-slate-800/50 rounded-lg p-8 text-center">
          <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3 opacity-50" />
          <p className="text-slate-400">未检测到显著的共同趋势</p>
          <p className="text-xs text-slate-500 mt-1">变量间的趋势模式差异较大</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {analysisResult.trendResults.map((trend, idx) => (
            <TrendCard
              key={idx}
              trend={trend}
              isSelected={selectedTrend?.groupId === trend.groupId}
              onClick={() => setSelectedTrend(trend)}
            />
          ))}
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-300 mb-2">如何解读</h4>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• <span className="text-emerald-400">共同趋势</span>：多个变量具有相似的变化模式，可能导致虚假相关</li>
          <li>• <span className="text-emerald-400">趋势强度</span>：变量间趋势相似度，值越高表示趋势越一致</li>
          <li>• 共同趋势可能来自时间本身的影响（如季节性、增长）</li>
          <li>• 建议对数据进行一阶差分或去趋势处理后再分析相关性</li>
          <li>• 点击卡片可查看变量的趋势线对比图</li>
        </ul>
      </div>
    </div>
  );
}

function TrendCard({
  trend,
  isSelected,
  onClick
}: {
  trend: TrendResult;
  isSelected: boolean;
  onClick: () => void;
}) {
  const patternIcon = trend.pattern === 'upward' ? <ArrowUpRight className="h-5 w-5" /> :
                       trend.pattern === 'downward' ? <ArrowDownRight className="h-5 w-5" /> :
                       trend.pattern === 'stable' ? <Minus className="h-5 w-5" /> :
                       <Shuffle className="h-5 w-5" />;
  
  const patternColor = trend.pattern === 'upward' ? 'text-emerald-400' :
                        trend.pattern === 'downward' ? 'text-red-400' :
                        trend.pattern === 'stable' ? 'text-slate-400' :
                        'text-amber-400';

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 rounded-lg cursor-pointer transition-all border",
        isSelected && "ring-2 ring-emerald-500",
        trend.warning === 'common_trend'
          ? "bg-red-900/10 border-red-700/50 hover:bg-red-900/20"
          : "bg-slate-800 border-slate-700 hover:bg-slate-700/50"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={cn("mt-0.5", patternColor)}>
            {patternIcon}
          </div>
          <div>
            <p className="text-sm text-slate-200 font-medium mb-1">
              {trend.variables.join(' • ')}
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {trend.variables.map((v, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-300 font-mono">
                  {v}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              来源: {trend.sourceRows[0]?.file || '未知'} · 示例行: {trend.sourceRows.slice(0, 3).map(r => r.rowIndex).join(', ')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono font-medium text-slate-200">
            {formatNumber(trend.trendStrength)}
          </p>
          <p className="text-xs text-slate-500">趋势强度</p>
          {trend.warning === 'common_trend' && (
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-red-900/50 text-red-300">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              共同趋势
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
