import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ChartsProps {
  passRateData: number[];
  errorDistribution: {
    colorBoundary: number;
    collision: number;
    success: number;
  };
}

export function Charts({ passRateData, errorDistribution }: ChartsProps) {
  const barData = {
    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    datasets: [
      {
        label: '检测通过率 (%)',
        data: passRateData,
        backgroundColor: 'rgba(45, 90, 39, 0.8)',
        borderColor: 'rgba(45, 90, 39, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: '本周检测通过率趋势',
        font: {
          size: 14,
          weight: 'bold' as const,
        },
        color: '#374151',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const pieData = {
    labels: ['颜色越界', '边界碰撞', '正常通过'],
    datasets: [
      {
        data: [
          errorDistribution.colorBoundary,
          errorDistribution.collision,
          errorDistribution.success,
        ],
        backgroundColor: [
          'rgba(224, 122, 95, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(129, 178, 154, 0.8)',
        ],
        borderColor: [
          'rgba(224, 122, 95, 1)',
          'rgba(251, 191, 36, 1)',
          'rgba(129, 178, 154, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: '检测结果类型分布',
        font: {
          size: 14,
          weight: 'bold' as const,
        },
        color: '#374151',
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <Bar data={barData} options={barOptions} />
      </div>
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <Pie data={pieData} options={pieOptions} />
      </div>
    </div>
  );
}
