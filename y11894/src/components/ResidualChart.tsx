import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import { useFitStore } from '../hooks/useFitStore';
import { getModelById } from '../utils/models';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function ResidualChart() {
  const { xData, yData, fitResult, selectedModelId, residualAnalysis } =
    useFitStore();
  const model = getModelById(selectedModelId);

  if (!fitResult || !model || !residualAnalysis || !fitResult.success) {
    return (
      <div className="h-60 flex items-center justify-center text-zinc-600 text-sm border border-zinc-800 rounded-lg bg-zinc-900/30">
        拟合成功后显示残差分析
      </div>
    );
  }

  const fittedY = xData.map((x) => model.fn(fitResult.parameters, x));
  const residuals = residualAnalysis.residuals;

  const data = {
    datasets: [
      {
        label: '残差',
        data: fittedY.map((fy, i) => ({ x: fy, y: residuals[i] })),
        showLine: false,
        borderColor: '#8b5cf6',
        backgroundColor: '#8b5cf6',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: '+2σ',
        data: [
          {
            x: Math.min(...fittedY),
            y: 2 * residualAnalysis.residualStdDev,
          },
          {
            x: Math.max(...fittedY),
            y: 2 * residualAnalysis.residualStdDev,
          },
        ],
        showLine: true,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
      },
      {
        label: '-2σ',
        data: [
          {
            x: Math.min(...fittedY),
            y: -2 * residualAnalysis.residualStdDev,
          },
          {
            x: Math.max(...fittedY),
            y: -2 * residualAnalysis.residualStdDev,
          },
        ],
        showLine: true,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: { color: '#a1a1aa', font: { size: 10 }, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: 'rgba(24, 24, 27, 0.95)',
        titleColor: '#e4e4e7',
        bodyColor: '#a1a1aa',
        borderColor: '#3f3f46',
        borderWidth: 1,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(63, 63, 70, 0.3)' },
        ticks: { color: '#71717a', font: { size: 10 } },
        title: { display: true, text: '拟合值', color: '#71717a', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(63, 63, 70, 0.3)' },
        ticks: { color: '#71717a', font: { size: 10 } },
        title: { display: true, text: '残差', color: '#71717a', font: { size: 10 } },
      },
    },
  };

  return (
    <div>
      <div className="h-60 border border-zinc-800 rounded-lg bg-zinc-900/50 p-3">
        <Scatter data={data} options={options} />
      </div>
      {residualAnalysis.hasPattern && residualAnalysis.patternDescription && (
        <div className="mt-2 p-2 rounded-md bg-violet-500/10 border border-violet-500/30 text-xs text-violet-300">
          {residualAnalysis.patternDescription}
        </div>
      )}
    </div>
  );
}
