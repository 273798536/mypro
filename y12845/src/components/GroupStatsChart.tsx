import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { GroupStat } from '@/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
  statistics: GroupStat[];
}

export default function GroupStatsChart({ statistics }: Props) {
  const data = {
    labels: statistics.map((s) => s.groupName),
    datasets: [
      {
        label: '平均存活率 (%)',
        data: statistics.map((s) => s.avgSurvivalRate),
        backgroundColor: [
          'rgba(15, 76, 92, 0.7)',
          'rgba(82, 147, 166, 0.7)',
          'rgba(227, 100, 20, 0.7)',
          'rgba(154, 3, 30, 0.7)',
        ],
        borderColor: [
          'rgba(15, 76, 92, 1)',
          'rgba(82, 147, 166, 1)',
          'rgba(227, 100, 20, 1)',
          'rgba(154, 3, 30, 1)',
        ],
        borderWidth: 1,
        borderRadius: 4,
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
        backgroundColor: 'rgba(15, 76, 92, 0.9)',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          label: (context: any) => {
            const stat = statistics[context.dataIndex];
            return [
              `平均存活率: ${stat.avgSurvivalRate}%`,
              `标准差: ${stat.stdDev}`,
              `范围: ${stat.minValue}% - ${stat.maxValue}%`,
              `样本数: ${stat.sampleCount}`,
            ];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(15, 76, 92, 0.08)',
        },
        ticks: {
          color: '#527589',
          font: { size: 11 },
          callback: (value: any) => `${value}%`,
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#527589',
          font: { size: 11 },
        },
      },
    },
  };

  return (
    <div className="h-64">
      <Bar data={data} options={options} />
    </div>
  );
}
