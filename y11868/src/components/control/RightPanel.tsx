import { AlertTriangle, Info, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useLogStore } from '../../store/useLogStore';
import { getAnomalyColor, getAnomalyIcon, getAnomalyTitle } from '../../utils/colorMap';

export function RightPanel() {
  const { logEntries, anomalies } = useLogStore();

  const chartData = logEntries.slice(0, 100).map(entry => ({
  step: entry.step,
  loss: Math.min(entry.loss, 10),
  valLoss: Math.min(entry.valLoss || entry.loss, 10),
}));

  return (
    <div className="glass-panel w-80 h-full p-4 flex flex-col gap-4 overflow-y-auto scrollbar-thin">
      <div>
        <h2 className="text-primary-400 font-bold text-sm mb-3 flex items-center gap-2">
          <AlertTriangle size={16} />
          异常检测
          {anomalies.length > 0 && (
            <span className="ml-auto px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
              {anomalies.length}
            </span>
          )}
        </h2>
        
        {anomalies.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-4">
            <Info size={32} className="mx-auto mb-2 opacity-50" />
            未检测到异常
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
            {anomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className="p-3 rounded border-l-4 bg-primary-900/30"
                style={{ borderLeftColor: getAnomalyColor(anomaly.type) }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{getAnomalyIcon(anomaly.type)}</span>
                  <span className="font-medium text-sm" style={{ color: getAnomalyColor(anomaly.type) }}>
                    {getAnomalyTitle(anomaly.type)}
                  </span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
                    anomaly.severity === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {anomaly.severity === 'error' ? '严重' : '警告'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  步骤: {anomaly.step}
                </div>
                <p className="text-xs text-gray-300 mt-2">{anomaly.message}</p>
                <p className="text-xs text-gray-500 mt-1 text-gray-400">
                  💡 {anomaly.suggestion}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-primary-800/30 pt-4">
        <h2 className="text-primary-400 font-bold text-sm mb-3 flex items-center gap-2">
          <TrendingUp size={16} />
          训练统计
        </h2>
        
        {logEntries.length > 0 && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-primary-900/30 p-2 rounded">
              <div className="text-gray-500">总步数</div>
              <div className="text-lg font-mono text-primary-300">{logEntries.length}</div>
            </div>
            <div className="bg-primary-900/30 p-2 rounded">
              <div className="text-gray-500">最终损失</div>
              <div className="text-lg font-mono text-green-400">
                {logEntries[logEntries.length - 1]?.loss.toFixed(4)}
              </div>
            </div>
            <div className="bg-primary-900/30 p-2 rounded">
              <div className="text-gray-500">最小损失</div>
              <div className="text-lg font-mono text-blue-400">
                {Math.min(...logEntries.map(e => e.loss)).toFixed(4)}
              </div>
            </div>
            <div className="bg-primary-900/30 p-2 rounded">
              <div className="text-gray-500">学习率</div>
              <div className="text-lg font-mono text-yellow-400">
                {logEntries[logEntries.length - 1]?.learningRate.toExponential(2)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
