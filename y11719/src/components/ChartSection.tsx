import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { LineChart, Download, BarChart3 } from 'lucide-react';
import { useExperimentStore } from '../store/useExperimentStore';
import { normalizeTime, normalizeAngularVelocity } from '../utils/unitConversion';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function ChartSection() {
  const { dataPoints, activeDataPointIndex, result } = useExperimentStore();

  const validPoints = useMemo(
    () => dataPoints.filter((p) => p.isValid && p.time > 0 && p.angularVelocity > 0),
    [dataPoints]
  );

  const velocityData = useMemo(() => {
    const labels = validPoints.map((p) => normalizeTime(p.time, p.timeUnit).toFixed(2));
    const data = validPoints.map((p) =>
      normalizeAngularVelocity(p.angularVelocity, p.angularVelocityUnit)
    );
    const pointBackgroundColors = validPoints.map((p, idx) =>
      dataPoints.findIndex((dp) => dp.index === p.index) === activeDataPointIndex
        ? '#f59e0b'
        : '#14b8a6'
    );

    return {
      labels,
      datasets: [
        {
          label: '角速度 (rad/s)',
          data,
          borderColor: '#14b8a6',
          backgroundColor: 'rgba(20, 184, 166, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: pointBackgroundColors,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        },
      ],
    };
  }, [validPoints, activeDataPointIndex, dataPoints]);

  const errorData = useMemo(() => {
    if (!result || !result.scoreDetails) return null;

    const labels = result.scoreDetails.map((d) => d.category);
    const data = result.scoreDetails.map((d) => (d.score / d.maxScore) * 100);

    return {
      labels,
      datasets: [
        {
          label: '得分率 (%)',
          data,
          backgroundColor: [
            'rgba(20, 184, 166, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(236, 72, 153, 0.8)',
          ],
          borderColor: [
            '#14b8a6',
            '#3b82f6',
            '#f59e0b',
            '#ec4899',
          ],
          borderWidth: 2,
        },
      ],
    };
  }, [result]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: '时间 (s)',
          color: '#94a3b8',
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
        ticks: {
          color: '#94a3b8',
        },
      },
      y: {
        title: {
          display: true,
          text: '角速度 (rad/s)',
          color: '#94a3b8',
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
        ticks: {
          color: '#94a3b8',
        },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
        ticks: {
          color: '#94a3b8',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#94a3b8',
        },
      },
    },
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 rounded-lg p-4 shadow-lg border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LineChart className="w-5 h-5 text-teal-400" />
            <h3 className="text-lg font-semibold text-slate-100">角速度-时间曲线</h3>
          </div>
          <button
            onClick={() => {}}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
        <div className="h-64">
          {validPoints.length > 0 ? (
            <Line data={velocityData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              输入数据后显示图表
            </div>
          )}
        </div>
      </div>

      {errorData && (
        <div className="bg-slate-800 rounded-lg p-4 shadow-lg border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-teal-400" />
            <h3 className="text-lg font-semibold text-slate-100">评分分布</h3>
          </div>
          <div className="h-48">
            <Line data={errorData} options={barOptions} />
          </div>
        </div>
      )}
    </div>
  );
}
