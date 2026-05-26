import { useState } from 'react';
import { ClipboardList, CheckCircle, AlertTriangle, Clock, Download } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import { CorrectionEntry } from '../types';

export function ExperimentReport() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const corrections = useSimulationStore(state => state.corrections);
  const experimentRecords = useSimulationStore(state => state.experimentRecords);
  const currentTime = useSimulationStore(state => state.currentTime);
  const currentStatus = useSimulationStore(state => state.currentStatus);
  const saveExperiment = useSimulationStore(state => state.saveExperiment);
  const clearCorrections = useSimulationStore(state => state.clearCorrections);

  const autoCorrected = corrections.filter(c => c.autoFixed);
  const needReview = corrections.filter(c => !c.autoFixed);

  const getStatusIcon = (type: CorrectionEntry['type']) => {
    switch (type) {
      case 'angle_overflow':
        return <AlertTriangle className="w-3 h-3 text-amber-400" />;
      case 'numerical_explosion':
        return <AlertTriangle className="w-3 h-3 text-red-400" />;
      case 'phase_mismatch':
        return <Clock className="w-3 h-3 text-purple-400" />;
    }
  };

  const getStatusColor = (autoFixed: boolean) => {
    return autoFixed ? 'text-emerald-400' : 'text-amber-400';
  };

  const exportRecords = () => {
    const data = JSON.stringify(experimentRecords, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `experiment_records_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/90">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-400">
            <ClipboardList className="w-5 h-5" />
            <h2 className="text-lg font-semibold tracking-wide">实验报告</h2>
          </div>
          <button
            onClick={() => saveExperiment('手动保存')}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded-lg transition-colors"
          >
            保存快照
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-slate-800/50 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-slate-200">{corrections.length}</div>
              <div className="text-xs text-slate-500">总修正</div>
            </div>
            <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-emerald-400">{autoCorrected.length}</div>
              <div className="text-xs text-emerald-300/70">已修正</div>
            </div>
            <div className="bg-amber-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-400">{needReview.length}</div>
              <div className="text-xs text-amber-300/70">待确认</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">当前状态:</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                currentStatus === 'normal'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : currentStatus === 'corrected'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {currentStatus === 'normal'
                ? '正常'
                : currentStatus === 'corrected'
                ? '已修正'
                : '需人工确认'}
            </span>
          </div>
        </div>

        {corrections.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300">修正记录</h3>
              <button
                onClick={clearCorrections}
                className="text-xs text-slate-500 hover:text-slate-400"
              >
                清除
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {corrections.slice().reverse().map((correction, index) => (
                <div
                  key={index}
                  className="bg-slate-700/30 rounded-lg p-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(correction.type)}
                    <span className={getStatusColor(correction.autoFixed)}>
                      t={correction.time.toFixed(3)}s
                    </span>
                    <span className="text-slate-500">|</span>
                    <span className={correction.autoFixed ? 'text-emerald-400' : 'text-amber-400'}>
                      {correction.autoFixed ? '自动修正' : '需确认'}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-1">{correction.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {experimentRecords.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300">历史快照</h3>
              <button
                onClick={exportRecords}
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
              >
                <Download className="w-3 h-3" />
                导出JSON
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {experimentRecords.slice().reverse().map((record) => (
                <div
                  key={record.id}
                  className="bg-slate-700/30 rounded-lg p-2 text-xs cursor-pointer hover:bg-slate-700/50 transition-colors"
                  onClick={() =>
                    setExpandedId(expandedId === record.id ? null : record.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">
                      {new Date(record.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        record.status === 'normal'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : record.status === 'corrected'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {record.status === 'normal'
                        ? '正常'
                        : record.status === 'corrected'
                        ? '已修正'
                        : '待确认'}
                    </span>
                  </div>
                  {expandedId === record.id && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50">
                      <p className="text-slate-500">摆数: {record.pendulums.length}</p>
                      <p className="text-slate-500">耦合系数: {record.params.couplingCoeff}</p>
                      <p className="text-slate-500">修正次数: {record.corrections.length}</p>
                      {record.note && (
                        <p className="text-cyan-400 mt-1">备注: {record.note}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {corrections.length === 0 && experimentRecords.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无修正记录</p>
            <p className="text-xs mt-1">开始实验后将自动记录异常修正</p>
          </div>
        )}
      </div>
    </div>
  );
}
