import React, { useMemo } from 'react';
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
import { LineChart, AreaChart } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';

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

export const SimulationChart: React.FC = () => {
  const { result } = useSimulationStore();

  const velocityData = useMemo(() => {
    if (!result || result.timeSeries.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    return {
      labels: result.timeSeries.map((t) => t.toFixed(1)),
      datasets: [
        {
          label: '下落速度 (m/s)',
          data: result.velocitySeries,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: '终端速度 (m/s)',
          data: Array(result.timeSeries.length).fill(result.terminalVelocity),
          borderColor: '#ef4444',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          tension: 0,
          pointRadius: 0,
        },
      ],
    };
  }, [result]);

  const positionData = useMemo(() => {
    if (!result || result.timeSeries.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    return {
      labels: result.timeSeries.map((t) => t.toFixed(1)),
      datasets: [
        {
          label: '高度 (m)',
          data: result.positionSeries,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    };
  }, [result]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 11,
          },
          usePointStyle: true,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1e293b',
        bodyColor: '#475569',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(226, 232, 240, 0.5)',
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 10,
          },
          maxTicksLimit: 10,
        },
        title: {
          display: true,
          text: '时间 (s)',
          color: '#64748b',
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(226, 232, 240, 0.5)',
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 10,
          },
        },
      },
    },
  };

  if (!result || result.timeSeries.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-xl">
            <LineChart className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">变化曲线</h2>
            <p className="text-xs text-slate-500">速度和位置随时间变化</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <AreaChart className="w-16 h-16 mb-4 opacity-50" />
          <p>开始模拟后将显示变化曲线</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-xl">
          <LineChart className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">变化曲线</h2>
          <p className="text-xs text-slate-500">速度和位置随时间变化</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-slate-600 mb-3">速度-时间曲线</h3>
          <div className="h-64">
            <Line data={velocityData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, display: false } } }} />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-600 mb-3">高度-时间曲线</h3>
          <div className="h-64">
            <Line data={positionData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, display: false } } }} />
          </div>
        </div>
      </div>
    </div>
  );
};
