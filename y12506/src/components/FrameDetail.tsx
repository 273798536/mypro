import React from 'react';
import { SpectrumFrame, AnomalyDetail, ANOMALY_TYPE_LABELS, SEVERITY_COLORS, SEVERITY_LABELS } from '../types';

interface FrameDetailProps {
  frame: SpectrumFrame | null;
  anomalies: AnomalyDetail[];
  onClose: () => void;
}

const FrameDetail: React.FC<FrameDetailProps> = ({ frame, anomalies, onClose }) => {
  if (!frame) return null;

  const frameAnomalies = anomalies.filter(a => {
    if (a.frameIndex === frame.frameIndex) return true;
    if (a.affectedRange) {
      return frame.frameIndex >= a.affectedRange.startFrame && 
             frame.frameIndex <= a.affectedRange.endFrame;
    }
    return false;
  });

  return (
    <div className="bg-spectrum-mid/95 backdrop-blur-sm rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          帧详情
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-gray-500 text-xs mb-1">帧索引</div>
          <div className="text-white font-mono">{frame.frameIndex}</div>
        </div>
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-gray-500 text-xs mb-1">时间戳</div>
          <div className="text-white font-mono">{frame.timestamp.toFixed(3)}s</div>
        </div>
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-gray-500 text-xs mb-1">频段数</div>
          <div className="text-white font-mono">{frame.frequencies.length}</div>
        </div>
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-gray-500 text-xs mb-1">标签数</div>
          <div className="text-white font-mono">{frame.labels?.length || 0}</div>
        </div>
      </div>

      {frame.labels && frame.labels.length > 0 && (
        <div className="mb-4">
          <div className="text-gray-500 text-xs mb-2">标签</div>
          <div className="flex flex-wrap gap-1">
            {frame.labels.map((label, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-blue-600/30 text-blue-300 text-xs rounded"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="text-gray-500 text-xs mb-2">振幅分布</div>
        <div className="h-20 bg-gray-900 rounded p-2 relative overflow-hidden">
          <svg width="100%" height="100%" preserveAspectRatio="none">
            {frame.amplitudes.map((amp, idx) => {
              const x = (idx / frame.amplitudes.length) * 100;
              const height = amp * 100;
              const hue = (1 - amp) * 240;
              return (
                <rect
                  key={idx}
                  x={`${x}%`}
                  y={`${100 - height}%`}
                  width={`${100 / frame.amplitudes.length + 0.5}%`}
                  height={`${height}%`}
                  fill={`hsl(${hue}, 80%, 50%)`}
                />
              );
            })}
          </svg>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{frame.frequencies[0]?.toFixed(0)}Hz</span>
          <span>{frame.frequencies[frame.frequencies.length - 1]?.toFixed(0)}Hz</span>
        </div>
      </div>

      {frameAnomalies.length > 0 && (
        <div>
          <div className="text-gray-500 text-xs mb-2 flex items-center gap-2">
            <span>关联异常</span>
            <span className="bg-red-600/30 text-red-300 px-1.5 py-0.5 rounded">
              {frameAnomalies.length}
            </span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {frameAnomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className="p-2 bg-gray-800/50 rounded border-l-2"
                style={{ borderLeftColor: SEVERITY_COLORS[anomaly.severity] }}
              >
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: `${SEVERITY_COLORS[anomaly.severity]}20`,
                      color: SEVERITY_COLORS[anomaly.severity]
                    }}
                  >
                    {SEVERITY_LABELS[anomaly.severity]}
                  </span>
                  <span className="text-gray-400">
                    {ANOMALY_TYPE_LABELS[anomaly.type]}
                  </span>
                </div>
                <div className="text-xs text-gray-300 mt-1">
                  {anomaly.message}
                </div>
                {anomaly.suggestion && (
                  <div className="text-xs text-yellow-400 mt-1">
                    💡 {anomaly.suggestion}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {frame.sourceFile && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-gray-500 text-xs mb-1">源文件</div>
          <div className="text-xs text-gray-400 font-mono truncate">
            {frame.sourceFile}
          </div>
        </div>
      )}
    </div>
  );
};

export default FrameDetail;
