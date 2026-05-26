import { useEffect, useRef } from 'react';
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
import { useSimulationStore } from '../store/simulationStore';
import { TrendingUp } from 'lucide-react';

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

export function PhaseChart() {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const phaseHistory = useSimulationStore(state => state.phaseHistory);
  const pendulums = useSimulationStore(state => state.pendulums);

  const labels = phaseHistory.map(h => h.time.toFixed(2));

  const datasets = pendulums.map((pendulum, index) => ({
    label: `摆 ${index + 1}`,
    data: phaseHistory.map(h => h.phases[index] ?? 0),
    borderColor: pendulum.color,
    backgroundColor: `${pendulum.color}20`,
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 4,
    tension: 0.4,
    fill: false,
  }));

  const data = {
    labels,
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          font: { size: 11 },
          boxWidth: 12,
          padding: 8,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        callbacks: {
          title: (items: any[]) => `时间: ${items[0].label} s`,
          label: (item: any) => `${item.dataset.label}: ${item.parsed.y.toFixed(3)} rad`,
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: '时间 (s)',
          color: '#64748b',
          font: { size: 11 },
        },
        ticks: {
          color: '#64748b',
          font: { size: 10 },
          maxTicksLimit: 10,
        },
        grid: {
          color: 'rgba(51, 65, 85, 0.3)',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: '相位 (rad)',
          color: '#64748b',
          font: { size: 11 },
        },
        ticks: {
          color: '#64748b',
          font: { size: 10 },
        },
        grid: {
          color: 'rgba(51, 65, 85, 0.3)',
        },
        min: -Math.PI,
        max: Math.PI,
      },
    },
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/90">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2 text-cyan-400">
          <TrendingUp className="w-5 h-5" />
          <h2 className="text-lg font-semibold tracking-wide">相位轨迹</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">各摆相位随时间变化曲线</p>
      </div>
      <div className="flex-1 p-4 min-h-0">
        <div className="h-full bg-slate-800/50 rounded-lg p-3">
          <Line ref={chartRef} data={data} options={options} />
        </div>
      </div>
    </div>
  );
}
