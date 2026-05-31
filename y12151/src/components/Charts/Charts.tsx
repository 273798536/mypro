import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useCalibrationStore } from '../../store/useCalibrationStore';
import { calculateSoundSpeed } from '../../utils/calibration';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export const ComparisonChart = () => {
  const { records, phase } = useCalibrationStore();

  const chartData = useMemo(() => {
    const sortedRecords = [...records]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    return {
      labels: sortedRecords.map((_, i) => `#${i + 1}`),
      datasets: [
        {
          label: '原始距离',
          data: sortedRecords.map(r => r.standardizedDistance ?? r.rawDistance),
          borderColor: '#9CA3AF',
          backgroundColor: 'rgba(156, 163, 175, 0.2)',
          borderDash: [5, 5],
          tension: 0.3,
        },
        {
          label: '校准后距离',
          data: sortedRecords.map(r => r.calibratedDistance ?? null),
          borderColor: '#0A2463',
          backgroundColor: 'rgba(10, 36, 99, 0.2)',
          tension: 0.3,
        },
      ],
    };
  }, [records]);

  const options = {
    responsive: true,
    plugins: {
      legend: {
      position: 'top' as const,
      },
      title: {
        display: true,
        text: '校准前后对比',
        font: { size: 14 },
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: '距离 (m)',
        },
      },
    },
  };

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">数据可视化</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          暂无数据可显示
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">数据可视化</h3>
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export const ErrorDistributionChart = () => {
  const { records } = useCalibrationStore();

  const chartData = useMemo(() => {
    const anomalyTypes = [
      'temperature_uncorrected', 'multiple_echo', 'unit_confusion', 'outlier', 'material_missing'];
    const counts = anomalyTypes.map(type => 
      records.filter(r => r.anomalies.some(a => a.type === type)).length
    );
    
    return {
      labels: ['温度校正', '多重回声', '单位混乱', '离群值', '材质缺失'],
      datasets: [
        {
          label: '异常数量',
          data: counts,
          backgroundColor: [
            'rgba(245, 158, 11, 0.7)',
            'rgba(239, 68, 68, 0.7)',
            'rgba(139, 92, 246, 0.7)',
            'rgba(239, 68, 68, 0.7)',
            'rgba(245, 158, 11, 0.7)',
          ],
          borderColor: [
            '#f59e0b',
            '#ef4444',
            '#8b5cf6',
            '#ef4444',
            '#f59e0b',
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [records]);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: '异常类型分布',
        font: { size: 14 },
      },
    },
  };

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export const TempSoundSpeedChart = () => {
  const { config, records } = useCalibrationStore();

  const chartData = useMemo(() => {
    const tempValues = Array.from({ length: 21 }, (_, i) => i - 5 + config.referenceTemperature - 10);
    return {
      labels: tempValues.map(t => `${t}°C`),
      datasets: [
        {
          label: '声速 (m/s)',
          data: tempValues.map(t => calculateSoundSpeed(t)),
          borderColor: '#3E92CC',
          backgroundColor: 'rgba(62, 146, 204, 0.2)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [config.referenceTemperature]);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: '温度-声速关系曲线',
        font: { size: 14 },
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: '声速 (m/s)',
        },
      },
      x: {
        title: {
          display: true,
          text: '温度 (°C)',
        },
      },
    },
  };

  return (
    <div className="h-64">
      <Line data={chartData} options={options} />
    </div>
  );
};
