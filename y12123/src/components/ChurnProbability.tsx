import { useEffect, useRef } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { MemberState } from '../types';
import { MEMBER_STATE_LABELS, MEMBER_STATE_COLORS } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ChurnProbabilityProps {
  probabilities: Record<string, number>;
  stateDistribution: Record<MemberState, number>;
  threshold: number;
}

export function ChurnProbability({ probabilities, stateDistribution, threshold }: ChurnProbabilityProps) {
  const chartRef = useRef<ChartJS<'bar'>>(null);

  const probValues = Object.values(probabilities);

  const buckets = [
    { label: '0-20%', min: 0, max: 0.2, count: 0 },
    { label: '20-40%', min: 0.2, max: 0.4, count: 0 },
    { label: '40-60%', min: 0.4, max: 0.6, count: 0 },
    { label: '60-80%', min: 0.6, max: 0.8, count: 0 },
    { label: '80-100%', min: 0.8, max: 1, count: 0 },
  ];

  probValues.forEach(p => {
    for (const bucket of buckets) {
      if (p >= bucket.min && p < bucket.max) {
        bucket.count++;
        break;
      }
      if (p === 1 && bucket.max === 1) {
        bucket.count++;
      }
    }
  });

  const highRiskCount = probValues.filter(p => p >= threshold).length;
  const mediumRiskCount = probValues.filter(p => p >= threshold * 0.7 && p < threshold).length;
  const lowRiskCount = probValues.filter(p => p < threshold * 0.7).length;

  const chartData = {
    labels: buckets.map(b => b.label),
    datasets: [
      {
        label: '会员人数',
        data: buckets.map(b => b.count),
        backgroundColor: buckets.map((_, i) => {
          if (i < 2) return 'rgba(16, 185, 129, 0.7)';
          if (i === 2) return 'rgba(245, 158, 11, 0.7)';
          return 'rgba(239, 68, 68, 0.7)';
        }),
        borderColor: buckets.map((_, i) => {
          if (i < 2) return 'rgb(16, 185, 129)';
          if (i === 2) return 'rgb(245, 158, 11)';
          return 'rgb(239, 68, 68)';
        }),
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(30, 58, 95, 0.95)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            const count = context.raw;
            const total = probValues.length;
            const percent = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
            return `${count} 人 (${percent}%)`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  };

  const stateLabels = Object.keys(stateDistribution) as MemberState[];
  const stateCounts = Object.values(stateDistribution);

  const stateChartData = {
    labels: stateLabels.map(s => MEMBER_STATE_LABELS[s]),
    datasets: [
      {
        label: '会员人数',
        data: stateCounts,
        backgroundColor: stateLabels.map(s => `${MEMBER_STATE_COLORS[s]}CC`),
        borderColor: stateLabels.map(s => MEMBER_STATE_COLORS[s]),
        borderWidth: 2,
        borderRadius: 6,
      },
    ],
  };

  const stateChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(30, 58, 95, 0.95)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  };

  if (probValues.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-slate-700" />
          <h3 className="font-semibold text-slate-800">流失概率分布</h3>
        </div>
        <div className="text-center py-12 text-gray-500">
          暂无数据，请先上传数据并运行计算
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 transition-all duration-300 hover:shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-800">流失概率分布</h3>
        <div className="ml-auto text-xs text-gray-500">
          共 {probValues.length} 个会员
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{highRiskCount}</div>
          <div className="text-xs text-red-700">高风险 (≥{(threshold * 100).toFixed(0)}%)</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{mediumRiskCount}</div>
          <div className="text-xs text-amber-700">中风险</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600">{lowRiskCount}</div>
          <div className="text-xs text-emerald-700">低风险</div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">流失概率区间分布</h4>
          <div className="h-48">
            <Bar ref={chartRef} data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-2">当前状态分布</h4>
          <div className="h-36">
            <Bar data={stateChartData} options={stateChartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
