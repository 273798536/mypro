import { useMemo } from 'react';
import { Activity, Gauge, Waves, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';

export function ResultPanel() {
  const { currentRecord, isAnalyzing } = useAnalysisStore();

  const stats = useMemo(() => {
    if (!currentRecord) return null;

    const { results, parameters } = currentRecord;
    const velocityKmh = results.velocity * 3.6;

    return {
      observedFrequency: results.observedFrequency.toFixed(2),
      frequencyShift: results.frequencyShift.toFixed(2),
      velocityMs: results.velocity.toFixed(2),
      velocityKmh: velocityKmh.toFixed(2),
      confidence: results.confidence.toFixed(1),
      shiftDirection: results.frequencyShift >= 0 ? '+' : '',
      baseFrequency: parameters.baseFrequency
    };
  }, [currentRecord]);

  const hasError = currentRecord?.anomalies.some(a => a.severity === 'error');
  const hasWarning = currentRecord?.anomalies.some(a => a.severity === 'warning');

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-success-400';
    if (confidence >= 50) return 'text-warning-400';
    return 'text-error-400';
  };

  if (!currentRecord) {
    return (
      <div className="bg-dark-800/50 rounded-xl border border-dark-700 h-full flex items-center justify-center">
        <div className="text-center p-8">
          <Activity className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400">上传音频文件后开始分析</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden">
      <div className="px-4 py-3 bg-dark-800 border-b border-dark-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary-400" />
          <span className="font-medium text-white">计算结果</span>
        </div>
        <div className="flex items-center gap-2">
          {isAnalyzing ? (
            <span className="text-xs text-primary-400 animate-pulse flex items-center gap-1">
              <Clock className="w-3 h-3 animate-spin" />
              计算中...
            </span>
          ) : hasError ? (
            <span className="text-xs text-error-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              存在错误
            </span>
          ) : hasWarning ? (
            <span className="text-xs text-warning-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              存在警告
            </span>
          ) : (
            <span className="text-xs text-success-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              正常
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-dark-900/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs text-dark-400 mb-1">
              <Waves className="w-3 h-3" />
              观测频率
            </div>
            <div className="font-mono text-lg text-white">
              {stats?.observedFrequency || '--'}
              <span className="text-sm text-dark-400 ml-1">Hz</span>
            </div>
          </div>

          <div className="bg-dark-900/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs text-dark-400 mb-1">
              <Waves className="w-3 h-3" />
              频率偏移
            </div>
            <div className={`font-mono text-lg ${
              (currentRecord?.results.frequencyShift || 0) >= 0 
                ? 'text-primary-400' 
                : 'text-warning-400'
            }`}>
              {stats?.shiftDirection}{stats?.frequencyShift || '--'}
              <span className="text-sm text-dark-400 ml-1">Hz</span>
            </div>
          </div>
        </div>

        <div className="bg-primary-500/10 rounded-lg p-4 border border-primary-500/30">
          <div className="flex items-center gap-1.5 text-xs text-primary-300 mb-2">
            <Gauge className="w-3 h-3" />
            计算速度
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-3xl font-bold text-white">
              {stats?.velocityMs || '--'}
            </span>
            <span className="text-dark-300">m/s</span>
            <span className="font-mono text-lg text-dark-300">
              = {stats?.velocityKmh || '--'} km/h
            </span>
          </div>
        </div>

        <div className="bg-dark-900/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-dark-400">置信度</span>
            <span className={`font-mono text-sm ${getConfidenceColor(currentRecord?.results.confidence || 0)}`}>
              {stats?.confidence || '--'}%
            </span>
          </div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (currentRecord?.results.confidence || 0) >= 80
                  ? 'bg-success-500'
                  : (currentRecord?.results.confidence || 0) >= 50
                  ? 'bg-warning-500'
                  : 'bg-error-500'
              }`}
              style={{ width: `${currentRecord?.results.confidence || 0}%` }}
            />
          </div>
        </div>

        <div className="text-xs text-dark-500 space-y-1">
          <div className="flex justify-between">
            <span>基准频率</span>
            <span className="font-mono">{stats?.baseFrequency} Hz</span>
          </div>
          <div className="flex justify-between">
            <span>移动方向</span>
            <span>{currentRecord.parameters.direction === 'approaching' ? '靠近观察者' : '远离观察者'}</span>
          </div>
          <div className="flex justify-between">
            <span>检测到峰值</span>
            <span className="font-mono">{currentRecord.results.peaks.filter(p => !p.isNoise).length} 个</span>
          </div>
        </div>
      </div>
    </div>
  );
}
