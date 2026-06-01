import { useMemo, useRef } from 'react';
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
  ChartData,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useAppStore } from '../store/useAppStore';
import { exponentialFit, correctBackground } from '../utils/exponentialFit';
import { formatNumber } from '../utils/unitConversion';

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
  const { dataPoints, background, currentTimeUnit, activeResultId, fitResults, anomalies } = useAppStore();
  const chartRef = useRef<ChartJS<'line'>>(null);

  const activeResult = fitResults.find(r => r.id === activeResultId);

  const chartData = useMemo(() => {
    let displayPoints = dataPoints;
    let fitCurve: { time: number; count: number }[] = [];

    if (activeResult) {
      displayPoints = activeResult.dataPoints;
      try {
        const fitParams = exponentialFit(displayPoints, currentTimeUnit);
        fitCurve = fitParams.fitCurve;
      } catch {
        // Ignore fit errors
      }
    } else if (dataPoints.length >= 2) {
      try {
        const corrected = correctBackground(dataPoints, background.value, background.isDeducted);
        const fitParams = exponentialFit(corrected, currentTimeUnit);
        fitCurve = fitParams.fitCurve;
        displayPoints = corrected;
      } catch {
        // Ignore fit errors
      }
    }

    const times = displayPoints.map(p => p.time);
    const rawCounts = displayPoints.map(p => p.count);
    const correctedCounts = displayPoints.map(p => p.correctedCount ?? p.count);

    const pointBackgroundColors = displayPoints.map((p) => {
      if (p.isAbnormal) {
        return p.abnormalType === 'boundary_error' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(245, 158, 11, 0.8)';
      }
      return 'rgba(59, 130, 246, 0.8)';
    });

    const pointBorderColors = displayPoints.map((p) => {
      if (p.isAbnormal) {
        return p.abnormalType === 'boundary_error' ? 'rgb(239, 68, 68)' : 'rgb(245, 158, 11)';
      }
      return 'rgb(59, 130, 246)';
    });

    const datasets: ChartData<'line'>['datasets'] = [
      {
        label: '原始计数',
        data: rawCounts,
        borderColor: 'rgba(59, 130, 246, 0.5)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        pointBackgroundColor: pointBackgroundColors as string[],
        pointBorderColor: pointBorderColors as string[],
        pointRadius: 6,
        pointHoverRadius: 8,
        showLine: false,
        order: 2,
      },
    ];

    if (background.isDeducted) {
      datasets.push({
        label: '校正后计数',
        data: correctedCounts,
        borderColor: 'rgba(16, 185, 129, 0.5)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        pointBackgroundColor: 'rgba(16, 185, 129, 0.6)',
        pointBorderColor: 'rgb(16, 185, 129)',
        pointRadius: 4,
        pointHoverRadius: 6,
        showLine: false,
        order: 3,
      });
    }

    if (fitCurve.length > 0) {
      const fitTimes = fitCurve.map(p => p.time);
      const fitCounts = fitCurve.map(p => p.count);
      
      datasets.unshift({
        label: '拟合曲线',
        data: fitCounts,
        borderColor: 'rgba(139, 92, 246, 1)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
        fill: false,
        order: 1,
      });

      return {
        labels: fitTimes,
        datasets
      };
    }

    return {
      labels: times,
      datasets
    };
  }, [dataPoints, background, currentTimeUnit, activeResult]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: 'easeOutQuart' as const,
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94A3B8',
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
          }
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#E2E8F0',
        bodyColor: '#E2E8F0',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context: { dataset: { label?: string }; parsed: { y: number } }) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${formatNumber(value, 2)} 计数`;
          },
          title: function(context: { label: number | string }[]) {
            return `时间: ${formatNumber(Number(context[0].label), 2)} ${currentTimeUnit}`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(51, 65, 85, 0.5)',
        },
        ticks: {
          color: '#94A3B8',
          maxRotation: 45,
          minRotation: 0,
        },
        title: {
          display: true,
          text: `时间 (${currentTimeUnit})`,
          color: '#94A3B8',
          font: {
            size: 12,
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(51, 65, 85, 0.5)',
        },
        ticks: {
          color: '#94A3B8',
        },
        title: {
          display: true,
          text: '计数',
          color: '#94A3B8',
          font: {
            size: 12,
          }
        }
      },
    },
  };

  return (
    <div className="lab-card h-full flex flex-col">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <span className="text-2xl">📈</span>
        衰变曲线
      </h2>
      
      <div className="flex-1 min-h-0 relative">
        {dataPoints.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-lab-muted">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <p>输入数据后显示衰变曲线</p>
            </div>
          </div>
        ) : (
          <Line 
          ref={chartRef}
          data={chartData}
          options={options}
          />
        )}
      </div>

      {anomalies.filter(a => a.type === 'abnormal_peak' || a.type === 'background_not_deducted').length > 0 && (
        <div className="mt-3 pt-3 border-t border-lab-border text-xs text-lab-muted">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-lab-warning"></span>
              异常峰值
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-lab-danger"></span>
              边界错误
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-lab-info"></span>
              正常数据
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
