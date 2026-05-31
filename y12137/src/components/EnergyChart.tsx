import { useRef, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { EnergyPoint } from '@/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface EnergyChartProps {
  data: EnergyPoint[];
  height?: number;
}

export default function EnergyChart({ data, height = 300 }: EnergyChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  const chartData = {
    labels: data.map((p) => `${p.distance.toFixed(1)}km`),
    datasets: [
      {
        label: '电池剩余电量 (%)',
        data: data.map((p) => p.batteryLevel),
        borderColor: '#00d4ff',
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
        fill: true,
        tension: 0.3,
        yAxisID: 'y',
      },
      {
        label: '功耗 (W)',
        data: data.map((p) => p.power),
        borderColor: '#ff6b6b',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.3,
        yAxisID: 'y1',
      },
      {
        label: '风速 (m/s)',
        data: data.map((p) => p.windSpeed),
        borderColor: '#fcc419',
        backgroundColor: 'transparent',
        borderDash: [2, 2],
        tension: 0.3,
        yAxisID: 'y2',
      },
    ],
  };

  const options = {
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
          color: '#cbd5e1',
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 31, 51, 0.95)',
        titleColor: '#00d4ff',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(0, 212, 255, 0.3)',
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
        ticks: {
          color: '#94a3b8',
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
        ticks: {
          color: '#00d4ff',
          callback: (value: any) => `${value}%`,
        },
        title: {
          display: true,
          text: '电池电量',
          color: '#00d4ff',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#ff6b6b',
        },
        title: {
          display: true,
          text: '功耗',
          color: '#ff6b6b',
        },
      },
      y2: {
        type: 'linear' as const,
        display: false,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <div style={{ height }}>
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}
