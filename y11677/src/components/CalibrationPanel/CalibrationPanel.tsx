import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
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
import { RefreshCw, Download, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { quaternionToEuler, eulerToDegrees, isNormalized } from '../../utils/quaternion';

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

export const CalibrationPanel = () => {
  const { frames, calibratedFrames, corrections, applyCalibration } = useAppStore();

  const stats = useMemo(() => {
    const unnormalizedCount = frames.filter((f) => !isNormalized(f.quaternion)).length;
    const uncalibratedSensorCount = frames.filter((f) => !f.sensorStatus.isCalibrated).length;
    const avgSignalQuality = frames.reduce((sum, f) => sum + f.sensorStatus.signalQuality, 0) / frames.length;

    let qualityScore = 100;
    qualityScore -= (unnormalizedCount / frames.length) * 30;
    qualityScore -= (uncalibratedSensorCount / frames.length) * 20;
    qualityScore -= Math.max(0, (70 - avgSignalQuality) / 70) * 30;
    qualityScore = Math.max(0, Math.min(100, Math.round(qualityScore)));

    return {
      totalFrames: frames.length,
      unnormalizedCount,
      uncalibratedSensorCount,
      avgSignalQuality: avgSignalQuality.toFixed(1),
      qualityScore,
      correctionsCount: corrections.length,
      needsCalibration: unnormalizedCount > 0 || uncalibratedSensorCount > 0,
    };
  }, [frames, corrections]);

  const comparisonData = useMemo(() => {
    const sampleCount = 50;
    const step = Math.max(1, Math.floor(frames.length / sampleCount));
    const indices: number[] = [];
    for (let i = 0; i < frames.length; i += step) {
      indices.push(i);
    }

    const originalData = indices.map((i) => eulerToDegrees(quaternionToEuler(frames[i].quaternion)));
    const calibratedData = calibratedFrames
      ? indices.map((i) => eulerToDegrees(quaternionToEuler(calibratedFrames[i].quaternion)))
      : null;

    return {
      labels: indices.map((i) => i + 1),
      original: originalData,
      calibrated: calibratedData,
    };
  }, [frames, calibratedFrames]);

  const chartData = {
    labels: comparisonData.labels,
    datasets: [
      {
        label: '原始数据 - Roll',
        data: comparisonData.original.map((d) => d[0]),
        borderColor: '#ff6600',
        backgroundColor: 'rgba(255, 102, 0, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
      },
      {
        label: '原始数据 - Pitch',
        data: comparisonData.original.map((d) => d[1]),
        borderColor: '#00ff88',
        backgroundColor: 'rgba(0, 255, 136, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
      },
      ...(comparisonData.calibrated
        ? [
            {
              label: '校准后 - Roll',
              data: comparisonData.calibrated.map((d) => d[0]),
              borderColor: '#ff9966',
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderDash: [5, 5],
              tension: 0.3,
              pointRadius: 0,
            },
            {
              label: '校准后 - Pitch',
              data: comparisonData.calibrated.map((d) => d[1]),
              borderColor: '#66ffaa',
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderDash: [5, 5],
              tension: 0.3,
              pointRadius: 0,
            },
          ]
        : []),
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#9ca3af',
          font: { size: 10 },
          boxWidth: 12,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(10, 22, 40, 0.95)',
        titleColor: '#00d4ff',
        bodyColor: '#e5e7eb',
        borderColor: '#00d4ff33',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#6b7280', font: { size: 9 } },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#6b7280', font: { size: 9 } },
      },
    },
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="bg-[#0f1d30] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[#00d4ff] font-bold text-sm">数据质量评分</div>
          <div className={`text-3xl font-bold ${getScoreColor(stats.qualityScore)}`}>
            {stats.qualityScore}
            <span className="text-lg text-gray-500">/100</span>
          </div>
        </div>
        <div className="w-full h-2 bg-[#1a2a4a] rounded-full overflow-hidden">
          <div
            className={`h-full ${getScoreBgColor(stats.qualityScore)} rounded-full transition-all duration-500`}
            style={{ width: `${stats.qualityScore}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>差</span>
          <span>一般</span>
          <span>良好</span>
          <span>优秀</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#0f1d30] rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">总帧数</span>
            <TrendingUp size={14} className="text-[#00d4ff]" />
          </div>
          <div className="text-xl font-bold text-gray-200 mt-1">{stats.totalFrames}</div>
        </div>
        <div className="bg-[#0f1d30] rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">未归一化</span>
            <AlertTriangle size={14} className={stats.unnormalizedCount > 0 ? 'text-yellow-500' : 'text-green-500'} />
          </div>
          <div className={`text-xl font-bold mt-1 ${stats.unnormalizedCount > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
            {stats.unnormalizedCount}
          </div>
        </div>
        <div className="bg-[#0f1d30] rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">未校准传感器</span>
            <AlertTriangle size={14} className={stats.uncalibratedSensorCount > 0 ? 'text-yellow-500' : 'text-green-500'} />
          </div>
          <div className={`text-xl font-bold mt-1 ${stats.uncalibratedSensorCount > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
            {stats.uncalibratedSensorCount}
          </div>
        </div>
        <div className="bg-[#0f1d30] rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">平均信号质量</span>
            <CheckCircle2 size={14} className="text-[#00d4ff]" />
          </div>
          <div className="text-xl font-bold text-gray-200 mt-1">{stats.avgSignalQuality}%</div>
        </div>
      </div>

      {corrections.length > 0 && (
        <div className="bg-[#0f1d30] rounded-lg p-4">
          <div className="text-[#00d4ff] font-bold text-sm mb-3">
            修正记录 ({corrections.length})
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {corrections.slice(-5).reverse().map((correction) => (
              <div
                key={correction.id}
                className="text-xs p-2 bg-[#1a2a4a] rounded flex justify-between items-center"
              >
                <div>
                  <span className="text-gray-300">{correction.type}</span>
                  {correction.note && (
                    <div className="text-[10px] text-gray-500 mt-0.5">{correction.note}</div>
                  )}
                </div>
                <span className="text-[10px] text-gray-500 font-mono">
                  {new Date(correction.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#0f1d30] rounded-lg p-4">
        <div className="text-[#00d4ff] font-bold text-sm mb-3">姿态对比</div>
        <div className="h-48">
          <Line data={chartData} options={chartOptions} />
        </div>
        {calibratedFrames && (
          <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-[#ff6600]" />
              <span>实线 = 原始数据</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-[#ff9966]" style={{ borderTop: '2px dashed' }} />
              <span>虚线 = 校准后</span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <button
          onClick={applyCalibration}
          className="w-full py-3 bg-[#00d4ff] hover:bg-[#00b8e0] text-[#0a1628] font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw size={16} />
          应用全局校准
        </button>

        {calibratedFrames && (
          <button
            onClick={() => {}}
            className="w-full py-2 bg-[#1a2a4a] hover:bg-[#2a3a5a] text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Download size={14} />
            导出校准后数据
          </button>
        )}
      </div>

      {stats.needsCalibration && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-200">
              <p className="font-bold mb-1">校准建议</p>
              <p>
                检测到 {stats.unnormalizedCount} 个未归一化四元数和 {stats.uncalibratedSensorCount} 个未校准传感器帧。
                建议应用全局校准以提高数据质量。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
