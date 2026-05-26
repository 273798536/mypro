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

export const DataPanel = () => {
  const { frames, currentFrameIndex, anomalies } = useAppStore();
  const currentFrame = frames[currentFrameIndex];

  const frameAnomalies = useMemo(
    () => anomalies.filter((a) => a.frameIndex === currentFrameIndex),
    [anomalies, currentFrameIndex]
  );

  const chartData = useMemo(() => {
    const startIndex = Math.max(0, currentFrameIndex - 50);
    const endIndex = Math.min(frames.length - 1, currentFrameIndex + 10);
    const windowFrames = frames.slice(startIndex, endIndex + 1);

    return {
      labels: windowFrames.map((_, i) => startIndex + i + 1),
      datasets: [
        {
          label: 'Roll (X)',
          data: windowFrames.map((f) => eulerToDegrees(quaternionToEuler(f.quaternion))[0]),
          borderColor: '#ff6600',
          backgroundColor: 'rgba(255, 102, 0, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Pitch (Y)',
          data: windowFrames.map((f) => eulerToDegrees(quaternionToEuler(f.quaternion))[1]),
          borderColor: '#00ff88',
          backgroundColor: 'rgba(0, 255, 136, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Yaw (Z)',
          data: windowFrames.map((f) => eulerToDegrees(quaternionToEuler(f.quaternion))[2]),
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    };
  }, [frames, currentFrameIndex]);

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

  if (!currentFrame) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        暂无数据
      </div>
    );
  }

  const eulerAngles = quaternionToEuler(currentFrame.quaternion);
  const eulerDegrees = eulerToDegrees(eulerAngles);
  const normalized = isNormalized(currentFrame.quaternion);
  const quaternionNorm = Math.sqrt(
    currentFrame.quaternion[0] ** 2 +
    currentFrame.quaternion[1] ** 2 +
    currentFrame.quaternion[2] ** 2 +
    currentFrame.quaternion[3] ** 2
  );

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {frameAnomalies.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <div className="text-red-400 font-bold text-sm mb-2">当前帧异常 ({frameAnomalies.length})</div>
          {frameAnomalies.map((anomaly) => (
            <div key={anomaly.id} className="text-xs text-red-300 mb-1">
              • {anomaly.description}
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#0f1d30] rounded-lg p-4">
        <div className="text-[#00d4ff] font-bold text-sm mb-3">四元数</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">w:</span>
            <span className="text-gray-300 font-mono">{currentFrame.quaternion[0].toFixed(6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">x:</span>
            <span className="text-gray-300 font-mono">{currentFrame.quaternion[1].toFixed(6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">y:</span>
            <span className="text-gray-300 font-mono">{currentFrame.quaternion[2].toFixed(6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">z:</span>
            <span className="text-gray-300 font-mono">{currentFrame.quaternion[3].toFixed(6)}</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-[#00d4ff]/10 flex justify-between items-center">
          <span className="text-gray-500 text-xs">模长:</span>
          <div className="flex items-center gap-2">
            <span className={`font-mono text-xs ${normalized ? 'text-green-400' : 'text-red-400'}`}>
              {quaternionNorm.toFixed(6)}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                normalized
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {normalized ? '正常' : '未归一'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[#0f1d30] rounded-lg p-4">
        <div className="text-[#00d4ff] font-bold text-sm mb-3">欧拉角 (度)</div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">Roll (X轴):</span>
            <span className="text-[#ff6600] font-mono">{eulerDegrees[0].toFixed(2)}°</span>
          </div>
          <div className="w-full h-1.5 bg-[#1a2a4a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ff6600] rounded-full"
              style={{ width: `${Math.min(100, Math.abs(eulerDegrees[0]) / 1.8)}%` }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">Pitch (Y轴):</span>
            <span className="text-[#00ff88] font-mono">{eulerDegrees[1].toFixed(2)}°</span>
          </div>
          <div className="w-full h-1.5 bg-[#1a2a4a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00ff88] rounded-full"
              style={{ width: `${Math.min(100, Math.abs(eulerDegrees[1]) / 1.8)}%` }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">Yaw (Z轴):</span>
            <span className="text-[#00d4ff] font-mono">{eulerDegrees[2].toFixed(2)}°</span>
          </div>
          <div className="w-full h-1.5 bg-[#1a2a4a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00d4ff] rounded-full"
              style={{ width: `${Math.min(100, Math.abs(eulerDegrees[2]) / 3.6)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-[#0f1d30] rounded-lg p-4">
        <div className="text-[#00d4ff] font-bold text-sm mb-3">角速度 (rad/s)</div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">X:</span>
            <span className="text-gray-300 font-mono">{currentFrame.angularVelocity[0].toFixed(4)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">Y:</span>
            <span className="text-gray-300 font-mono">{currentFrame.angularVelocity[1].toFixed(4)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">Z:</span>
            <span className="text-gray-300 font-mono">{currentFrame.angularVelocity[2].toFixed(4)}</span>
          </div>
        </div>
      </div>

      <div className="bg-[#0f1d30] rounded-lg p-4">
        <div className="text-[#00d4ff] font-bold text-sm mb-3">传感器状态</div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">温度:</span>
            <span className={`font-mono ${
              currentFrame.sensorStatus.temperature > 60 || currentFrame.sensorStatus.temperature < -10
                ? 'text-red-400'
                : 'text-gray-300'
            }`}>
              {currentFrame.sensorStatus.temperature.toFixed(1)}°C
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">电压:</span>
            <span className={`font-mono ${
              currentFrame.sensorStatus.voltage < 3.3 || currentFrame.sensorStatus.voltage > 5.5
                ? 'text-red-400'
                : 'text-gray-300'
            }`}>
              {currentFrame.sensorStatus.voltage.toFixed(2)}V
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-xs">信号质量:</span>
              <span className={`font-mono ${
                currentFrame.sensorStatus.signalQuality < 40
                  ? 'text-red-400'
                  : currentFrame.sensorStatus.signalQuality < 70
                  ? 'text-yellow-400'
                  : 'text-green-400'
              }`}>
                {currentFrame.sensorStatus.signalQuality.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#1a2a4a] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  currentFrame.sensorStatus.signalQuality < 40
                    ? 'bg-red-500'
                    : currentFrame.sensorStatus.signalQuality < 70
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${currentFrame.sensorStatus.signalQuality}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">校准状态:</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                currentFrame.sensorStatus.isCalibrated
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}
            >
              {currentFrame.sensorStatus.isCalibrated ? '已校准' : '未校准'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[#0f1d30] rounded-lg p-4">
        <div className="text-[#00d4ff] font-bold text-sm mb-3">姿态趋势 (最近50帧)</div>
        <div className="h-40">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="bg-[#0f1d30] rounded-lg p-4">
        <div className="text-[#00d4ff] font-bold text-sm mb-3">数据来源</div>
        <div className="text-xs text-gray-400 font-mono break-all">
          {currentFrame.source}
        </div>
        {currentFrame.calibrationNote && (
          <div className="mt-3 pt-3 border-t border-[#00d4ff]/10">
            <div className="text-yellow-400 text-xs">
              📝 {currentFrame.calibrationNote}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
