import { useRef, useEffect } from 'react';
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
import { Scatter } from 'react-chartjs-2';
import { useFitStore } from '../hooks/useFitStore';
import { getModelById } from '../utils/models';

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

export default function FitChart() {
  const { xData, yData, fitResult, selectedModelId, outliers } = useFitStore();
  const chartRef = useRef<any>(null);

  const model = getModelById(selectedModelId);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  if (!fitResult || !model || xData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-zinc-600 text-sm border border-zinc-800 rounded-lg bg-zinc-900/30">
        执行拟合后将显示曲线图
      </div>
    );
  }

  const normalPoints = outliers
    .filter((o) => !o.isOutlier)
    .map((o) => ({ x: o.x, y: o.y }));
  const outlierPoints = outliers
    .filter((o) => o.isOutlier)
    .map((o) => ({ x: o.x, y: o.y }));

  const xMin = Math.min(...xData);
  const xMax = Math.max(...xData);
  const xRange = xMax - xMin || 1;
  const curveX = Array.from({ length: 200 }, (_, i) => xMin - xRange * 0.05 + (xRange * 1.1 * i) / 199);
  const curveY = curveX.map((x) => model.fn(fitResult.parameters, x));

  const data = {
    datasets: [
      {
        label: '拟合曲线',
        data: curveX.map((x, i) => ({ x, y: curveY[i] })),
        showLine: true,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        fill: true,
        pointRadius: 0,
        borderWidth: 2,
        order: 2,
      },
      {
        label: '数据点',
        data: normalPoints,
        showLine: false,
        borderColor: '#a1a1aa',
        backgroundColor: '#a1a1aa',
        pointRadius: 5,
        pointHoverRadius: 7,
        order: 1,
      },
      {
        label: '离群点',
        data: outlierPoints,
        showLine: false,
        borderColor: '#ef4444',
        backgroundColor: '#ef4444',
        pointRadius: 8,
        pointHoverRadius: 10,
        pointStyle: 'triangle',
        order: 0,
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
        labels: {
          color: '#a1a1aa',
          font: { size: 11 },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(24, 24, 27, 0.95)',
        titleColor: '#e4e4e7',
        bodyColor: '#a1a1aa',
        borderColor: '#3f3f46',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(63, 63, 70, 0.3)' },
        ticks: { color: '#71717a', font: { size: 11 } },
        title: { display: true, text: 'X', color: '#71717a' },
      },
      y: {
        grid: { color: 'rgba(63, 63, 70, 0.3)' },
        ticks: { color: '#71717a', font: { size: 11 } },
        title: { display: true, text: 'Y', color: '#71717a' },
      },
    },
  };

  return (
    <div className="h-80 border border-zinc-800 rounded-lg bg-zinc-900/50 p-3">
      <Scatter ref={chartRef} data={data} options={options} />
    </div>
  );
}
