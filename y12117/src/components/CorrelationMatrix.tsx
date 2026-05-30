import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useAppStore } from '@/store/appStore';
import { formatNumber } from '@/utils/dataProcessor';
import { AlertTriangle, CheckCircle, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CorrelationMatrix() {
  const { analysisResult, analysisParams } = useAppStore();
  const [selectedCell, setSelectedCell] = useState<{ var1: string; var2: string } | null>(null);

  const chartOption = useMemo(() => {
    if (!analysisResult || analysisParams.metricFields.length < 2) return null;

    const fields = analysisParams.metricFields;
    const n = fields.length;
    
    const matrix: number[][] = [];
    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          const corr = analysisResult.correlationMatrix.find(
            c => (c.variable1 === fields[i] && c.variable2 === fields[j]) ||
                 (c.variable1 === fields[j] && c.variable2 === fields[i])
          );
          matrix[i][j] = corr ? corr.correlation : 0;
        }
      }
    }

    return {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const i = params.data[0];
          const j = params.data[1];
          const value = params.data[2];
          return `${fields[i]} × ${fields[j]}<br/>相关系数: <strong>${formatNumber(value)}</strong>`;
        }
      },
      grid: {
        left: '15%',
        right: '5%',
        top: '5%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: fields,
        axisLabel: {
          rotate: 45,
          color: '#94a3b8',
          fontSize: 11,
          interval: 0
        },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: '#475569' } }
      },
      yAxis: {
        type: 'category',
        data: fields,
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          interval: 0
        },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: '#475569' } }
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        text: ['正相关', '负相关'],
        textStyle: { color: '#94a3b8', fontSize: 10 },
        inRange: {
          color: ['#ef4444', '#334155', '#06b6d4']
        }
      },
      series: [{
        type: 'heatmap',
        data: matrix.flatMap((row, i) =>
          row.map((value, j) => [j, i, value])
        ),
        label: {
          show: true,
          formatter: (params: any) => formatNumber(params.data[2], 2),
          fontSize: 10,
          color: '#f1f5f9'
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(6, 182, 212, 0.5)'
          }
        }
      }]
    };
  }, [analysisResult, analysisParams.metricFields]);

  if (!analysisResult) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <Grid3X3 className="h-12 w-12 mb-3 opacity-50" />
        <p>请先完成数据上传和参数配置，然后点击开始分析</p>
      </div>
    );
  }

  const significantCorrelations = analysisResult.correlationMatrix.filter(c => c.isSignificant);
  const highCorrelations = significantCorrelations.filter(c => Math.abs(c.correlation) >= 0.8);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-cyan-400" />
          <h3 className="font-medium text-slate-200">相关性矩阵</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-slate-400">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            {significantCorrelations.length} 个显著相关
          </span>
          {highCorrelations.length > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              {highCorrelations.length} 个高度相关
            </span>
          )}
        </div>
      </div>

      {chartOption && (
        <div className="bg-slate-800/50 rounded-lg p-4">
          <ReactECharts
            option={chartOption}
            style={{ height: `${Math.max(300, analysisParams.metricFields.length * 60)}px` }}
            theme="dark"
          />
        </div>
      )}

      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-700/50">
              <th className="text-left p-3 text-slate-300 font-medium">变量 1</th>
              <th className="text-left p-3 text-slate-300 font-medium">变量 2</th>
              <th className="text-right p-3 text-slate-300 font-medium">相关系数</th>
              <th className="text-right p-3 text-slate-300 font-medium">P 值</th>
              <th className="text-center p-3 text-slate-300 font-medium">显著性</th>
            </tr>
          </thead>
          <tbody>
            {analysisResult.correlationMatrix
              .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
              .map((corr, idx) => (
              <tr
                key={idx}
                className={cn(
                  "border-t border-slate-700 hover:bg-slate-700/30 transition-colors cursor-pointer",
                  Math.abs(corr.correlation) >= 0.8 && "bg-amber-900/10"
                )}
                onClick={() => setSelectedCell({ var1: corr.variable1, var2: corr.variable2 })}
              >
                <td className="p-3 text-slate-200 font-mono">{corr.variable1}</td>
                <td className="p-3 text-slate-200 font-mono">{corr.variable2}</td>
                <td className={cn(
                  "p-3 text-right font-mono font-medium",
                  corr.correlation > 0 ? "text-cyan-400" : "text-red-400"
                )}>
                  {formatNumber(corr.correlation)}
                </td>
                <td className="p-3 text-right text-slate-400 font-mono">
                  {formatNumber(corr.pValue, 4)}
                </td>
                <td className="p-3 text-center">
                  {corr.isSignificant ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-900/50 text-emerald-300">
                      显著
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-400">
                      不显著
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-300 mb-2">如何解读</h4>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• <span className="text-cyan-400">相关系数</span>：范围 [-1, 1]，绝对值越接近1表示相关性越强</li>
          <li>• <span className="text-emerald-400">统计显著</span>：P 值 &lt; 0.05 表示相关性不太可能是随机产生的</li>
          <li>• <span className="text-amber-400">高度相关</span>：|相关系数| ≥ 0.8 可能存在虚假相关风险</li>
          <li>• 请结合滞后检测和共同趋势分析判断是否存在误判</li>
        </ul>
      </div>
    </div>
  );
}
