import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useStore } from '../../store/useStore';
import { calculateFrequencyResponse } from '../../utils/acoustics';
import type { MeasurementPoint } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);

interface FrequencyChartProps {
  point: MeasurementPoint;
}

export default function FrequencyChart({ point }: FrequencyChartProps) {
  const room = useStore((state) => state.room);
  const soundSource = useStore((state) => state.soundSource);
  const materials = useStore((state) => state.materials);
  const absorberPanels = useStore((state) => state.absorberPanels);

  const responseData = useMemo(() => {
    return calculateFrequencyResponse(
      room,
      soundSource,
      point,
      materials,
      absorberPanels,
      20,
      1000,
      50
    );
  }, [room, soundSource.frequency, point, materials, absorberPanels]);

  const data = {
    labels: responseData.map((d) => Math.round(d.frequency)),
    datasets: [
      {
        label: '声压级 (dB)',
        data: responseData.map((d) => d.dB),
        borderColor: '#00d4ff',
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1a2d4a',
        titleColor: '#00d4ff',
        bodyColor: '#fff',
        borderColor: '#00d4ff',
        borderWidth: 1,
        callbacks: {
          label: (context: { raw: unknown }) => {
            return `声压级: ${(context.raw as number).toFixed(1)} dB`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear' as const,
        title: {
          display: true,
          text: '频率 (Hz)',
          color: '#888',
          font: { size: 10 },
        },
        ticks: {
          color: '#666',
          font: { size: 9 },
        },
        grid: {
          color: 'rgba(100, 100, 100, 0.2)',
        },
      },
      y: {
        title: {
          display: true,
          text: '声压级 (dB)',
          color: '#888',
          font: { size: 10 },
        },
        ticks: {
          color: '#666',
          font: { size: 9 },
        },
        grid: {
          color: 'rgba(100, 100, 100, 0.2)',
        },
      },
    },
  };

  return (
    <div className="h-48">
      <div className="text-xs text-gray-400 mb-2 text-center">
        {point.name} - 频率响应曲线
      </div>
      <Line data={data} options={options} />
    </div>
  );
}
