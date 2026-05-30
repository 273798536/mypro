import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { useSimulationStore } from '@/store/useSimulationStore';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend, annotationPlugin);

function buildHistogram(data: number[], bins: number = 40) {
  if (data.length === 0) return { labels: [] as string[], counts: [] as number[], edges: [] as number[] };
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const binWidth = range / bins;
  const counts = new Array(bins).fill(0);
  const edges: number[] = [];
  const labels: string[] = [];

  for (let i = 0; i < bins; i++) {
    edges.push(min + i * binWidth);
    labels.push(`${((min + i * binWidth) / 10000).toFixed(1)}`);
  }
  edges.push(min + bins * binWidth);

  data.forEach((v) => {
    let idx = Math.floor((v - min) / binWidth);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  });

  return { labels, counts, edges };
}

function findBinIndex(edges: number[], value: number): number {
  for (let i = 0; i < edges.length - 1; i++) {
    if (value >= edges[i] && value < edges[i + 1]) return i;
  }
  return edges.length - 2;
}

export default function LossDistribution() {
  const { result } = useSimulationStore();

  const { chartData, var95Label, var99Label } = useMemo(() => {
    if (!result) return { chartData: null, var95Label: '', var99Label: '' };
    const hist = buildHistogram(result.lossDistribution, 40);

    const var95Idx = findBinIndex(hist.edges, result.var95);
    const var99Idx = findBinIndex(hist.edges, result.var99);

    const bgColors = hist.counts.map((_, i) => {
      if (i >= var99Idx) return 'rgba(239, 68, 68, 0.6)';
      if (i >= var95Idx) return 'rgba(245, 158, 11, 0.6)';
      return 'rgba(16, 185, 129, 0.4)';
    });

    const data = {
      labels: hist.labels,
      datasets: [{
        label: '频次',
        data: hist.counts,
        backgroundColor: bgColors,
        borderColor: bgColors.map((c: string) => c.replace(/0\.\d+\)/, '0.8)')),
        borderWidth: 1,
        borderRadius: 2,
      }],
    };

    return {
      chartData: data,
      var95Label: hist.labels[var95Idx] ?? '',
      var99Label: hist.labels[var99Idx] ?? '',
    };
  }, [result]);

  if (!result || !chartData) return null;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: '亏损分布',
        color: '#9ca3af',
        font: { size: 12, family: 'Noto Sans SC' },
        padding: { bottom: 8 },
      },
      annotation: {
        annotations: {
          var95: {
            type: 'line' as const,
            xMin: var95Label,
            xMax: var95Label,
            borderColor: 'rgba(245, 158, 11, 0.8)',
            borderWidth: 2,
            label: {
              display: true,
              content: 'VaR 95%',
              position: 'start' as const,
              color: '#f59e0b',
              font: { size: 10, family: 'JetBrains Mono' },
              backgroundColor: 'rgba(15, 17, 23, 0.8)',
            },
          },
          var99: {
            type: 'line' as const,
            xMin: var99Label,
            xMax: var99Label,
            borderColor: 'rgba(239, 68, 68, 0.8)',
            borderWidth: 2,
            label: {
              display: true,
              content: 'VaR 99%',
              position: 'start' as const,
              color: '#ef4444',
              font: { size: 10, family: 'JetBrains Mono' },
              backgroundColor: 'rgba(15, 17, 23, 0.8)',
            },
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: '亏损额（万元）', color: '#6b7280', font: { size: 10 } },
        ticks: { color: '#6b7280', font: { size: 9, family: 'JetBrains Mono' }, maxTicksLimit: 10 },
        grid: { color: 'rgba(47, 51, 64, 0.5)' },
      },
      y: {
        title: { display: true, text: '频次', color: '#6b7280', font: { size: 10 } },
        ticks: { color: '#6b7280', font: { size: 9, family: 'JetBrains Mono' } },
        grid: { color: 'rgba(47, 51, 64, 0.5)' },
      },
    },
  };

  return (
    <div className="space-y-2">
      <div className="h-64 bg-surface-50 rounded-xl border border-surface-200 p-3">
        <Bar data={chartData} options={options} />
      </div>
      <div className="flex items-center gap-4 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-accent/60" /> 正常区间
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-warn/60" /> VaR 95% 以上
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-danger/60" /> VaR 99% 以上
        </span>
      </div>
    </div>
  );
}
