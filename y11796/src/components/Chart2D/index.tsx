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
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useStore } from '@/store/useStore';
import { toSeconds } from '@/utils/units';
import { Play, Pause, RotateCcw, Zap } from 'lucide-react';

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

export default function Chart2D() {
  const {
    params,
    result,
    selectedStudentId,
    studentData,
    simulationTime,
    isSimulating,
    toggleSimulation,
    setSimulationTime,
  } = useStore();

  const selectedStudent = studentData.find(s => s.id === selectedStudentId);

  const timeRange = toSeconds(params.timeRange, params.timeUnit);

  const chartData = useMemo(() => {
    if (!result) return null;

    const timeLabels = result.chargeCurve.map(p => p.time.toFixed(3));

    const datasets = [];

    if (params.mode !== 'discharge') {
      datasets.push({
        label: '充电曲线 (理论)',
        data: result.chargeCurve.map(p => p.voltage),
        borderColor: '#00D4FF',
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }

    if (params.mode !== 'charge') {
      datasets.push({
        label: '放电曲线 (理论)',
        data: result.dischargeCurve.map(p => p.voltage),
        borderColor: '#FF3366',
        backgroundColor: 'rgba(255, 51, 102, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }

    if (selectedStudent && selectedStudent.dataPoints.length > 0) {
      datasets.push({
        label: `${selectedStudent.studentName} (学生数据)`,
        data: selectedStudent.dataPoints.map(p => ({
          x: p.time,
          y: p.voltage,
        })),
        borderColor: '#00FF88',
        backgroundColor: 'rgba(0, 255, 136, 0.2)',
        borderWidth: 1.5,
        borderDash: [5, 5],
        fill: false,
        tension: 0.2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#00FF88',
        showLine: true,
      });
    }

    return {
      labels: timeLabels,
      datasets,
    };
  }, [result, params.mode, selectedStudent]);

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
          color: '#a0aec0',
          font: { family: 'JetBrains Mono' },
          padding: 15,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(10, 14, 23, 0.95)',
        titleColor: '#00D4FF',
        bodyColor: '#e2e8f0',
        borderColor: '#00D4FF',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(4)} V`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear' as const,
        title: {
          display: true,
          text: `时间 (${params.timeUnit})`,
          color: '#a0aec0',
          font: { family: 'JetBrains Mono' },
        },
        grid: {
          color: 'rgba(160, 174, 192, 0.1)',
        },
        ticks: {
          color: '#718096',
          font: { family: 'JetBrains Mono' },
        },
      },
      y: {
        title: {
          display: true,
          text: `电压 (${params.voltageUnit})`,
          color: '#a0aec0',
          font: { family: 'JetBrains Mono' },
        },
        grid: {
          color: 'rgba(160, 174, 192, 0.1)',
        },
        ticks: {
          color: '#718096',
          font: { family: 'JetBrains Mono' },
        },
      },
    },
  };

  const currentVoltage = useMemo(() => {
    if (!result) return 0;
    const curve = params.mode === 'discharge' ? result.dischargeCurve : result.chargeCurve;
    const idx = Math.min(
      Math.floor((simulationTime / timeRange) * (curve.length - 1)),
      curve.length - 1
    );
    return curve[Math.max(0, idx)]?.voltage || 0;
  }, [simulationTime, timeRange, result, params.mode]);

  return (
    <div className="w-full h-full bg-[#0F141F] rounded-xl border border-cyan-500/20 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-cyan-400 font-mono text-sm">RC 充放电曲线</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSimulationTime(0)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            title="重置"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={toggleSimulation}
            className={`p-2 rounded-lg transition-colors ${
              isSimulating
                ? 'bg-orange-500 text-white'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white'
            }`}
            title={isSimulating ? '暂停' : '播放'}
          >
            {isSimulating ? <Pause size={16} /> : <Play size={16} />}
          </button>
        </div>
      </div>

      {result && (
        <div className="flex items-center gap-4 mb-4 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/30 rounded-lg border border-cyan-500/20">
            <Zap size={14} className="text-cyan-400" />
            <span className="text-cyan-400">τ = {result.timeConstantDisplay}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/30 rounded-lg border border-pink-500/20">
            <span className="text-pink-400">Vc = {currentVoltage.toFixed(3)} V</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/30 rounded-lg border border-green-500/20">
            <span className="text-green-400">t = {simulationTime.toFixed(2)} s</span>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0">
        {chartData ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-gray-500 font-mono">计算中...</div>
          </div>
        )}
      </div>

      {selectedStudent && selectedStudent.errorAnalysis && (
        <div className="mt-4 p-3 bg-black/30 rounded-lg border border-green-500/20 p-3">
          <div className="text-xs font-mono text-gray-400 mb-2">误差分析 - {selectedStudent.studentName}</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-gray-500">MSE:</span>
              <span className="text-cyan-400 ml-1">{selectedStudent.errorAnalysis.mse.toFixed(6)}</span>
            </div>
            <div>
              <span className="text-gray-500">RMSE:</span>
              <span className="text-green-400 ml-1">{selectedStudent.errorAnalysis.rmse.toFixed(6)}</span>
            </div>
            <div>
              <span className="text-gray-500">相关系数:</span>
              <span className="text-pink-400 ml-1">{selectedStudent.errorAnalysis.correlation.toFixed(4)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
