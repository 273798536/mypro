import { useState, useMemo } from 'react';
import { Navbar } from '../components/Navbar';
import { GitBranch, Upload, Check, X, AlertTriangle, FileJson } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { mockAngleDataA, mockAngleDataB, mockLoadDataA, mockLoadDataB } from '../data/mockData';
import type { ConflictRecord } from '../types';

export const MergePage = () => {
  const { conflicts, resolveConflict, setAngleData, setLoadData } = useAppStore();
  const [selectedAngleSource, setSelectedAngleSource] = useState<'A' | 'B'>('A');
  const [selectedLoadSource, setSelectedLoadSource] = useState<'A' | 'B'>('A');

  const unresolvedConflicts = useMemo(
    () => conflicts.filter((c) => !c.resolved),
    [conflicts]
  );

  const resolvedConflicts = useMemo(
    () => conflicts.filter((c) => c.resolved),
    [conflicts]
  );

  const handleImportData = () => {
    const angleData = selectedAngleSource === 'A' ? mockAngleDataA : mockAngleDataB;
    const loadData = selectedLoadSource === 'A' ? mockLoadDataA : mockLoadDataB;
    setAngleData(angleData);
    setLoadData(loadData);
  };

  const getConflictTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      angle: '角度冲突',
      load: '负载冲突',
      joint: '关节冲突',
    };
    return labels[type] || type;
  };

  const ConflictCard = ({ conflict }: { conflict: ConflictRecord }) => (
    <div
      className={`p-4 rounded-lg border transition-all duration-200 ${
        conflict.resolved
          ? 'bg-success-500/10 border-success-500/50'
          : 'bg-danger-500/10 border-danger-500'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${
                conflict.resolved
                  ? 'bg-success-500/20 text-success-400'
                  : 'bg-danger-500/20 text-danger-400'
              }`}
            >
              {getConflictTypeLabel(conflict.type)}
            </span>
            <span className="text-xs text-industrial-400 font-mono">
              行 {conflict.rowIndex} | {conflict.field}
            </span>
          </div>
          <p className="text-sm text-industrial-200 mb-3">{conflict.description}</p>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-industrial-400">来源A:</span>
              <span className="text-sm font-mono text-primary-400">
                {String(conflict.valueA)}
              </span>
            </div>
            <div className="w-px h-4 bg-industrial-500"></div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-industrial-400">来源B:</span>
              <span className="text-sm font-mono text-warning-400">
                {String(conflict.valueB)}
              </span>
            </div>
          </div>
        </div>

        {!conflict.resolved ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => resolveConflict(conflict.id, 'A')}
              className="p-2 bg-primary-500 hover:bg-primary-600 text-white rounded transition-colors"
              title="采用来源A"
            >
              <Check className="w-4 h-4" />
              <span className="sr-only">采用A</span>
            </button>
            <button
              onClick={() => resolveConflict(conflict.id, 'B')}
              className="p-2 bg-warning-500 hover:bg-warning-600 text-white rounded transition-colors"
              title="采用来源B"
            >
              <Check className="w-4 h-4" />
              <span className="sr-only">采用B</span>
            </button>
            <button
              onClick={() => resolveConflict(conflict.id, 'custom', '')}
              className="p-2 bg-industrial-500 hover:bg-industrial-400 text-white rounded transition-colors"
              title="自定义"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">自定义</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-success-400">
            <Check className="w-5 h-5" />
            <span className="text-xs">已解决</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-industrial-600">
      <Navbar />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <GitBranch className="w-6 h-6 text-primary-400" />
              <h1 className="text-xl font-bold text-white font-mono">数据合并</h1>
            </div>
            <p className="text-industrial-300 text-sm">
              合并来自不同来源的关节角度数据和负载质量数据，系统会自动检测并展示冲突
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-industrial-700 rounded-lg p-5 border border-industrial-500">
              <div className="flex items-center gap-2 mb-4">
                <FileJson className="w-5 h-5 text-primary-400" />
                <h2 className="text-base font-semibold text-white">选择角度数据源</h2>
              </div>
              <div className="space-y-3">
                <label
                  className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedAngleSource === 'A'
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-industrial-500 hover:border-industrial-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="angleSource"
                      value="A"
                      checked={selectedAngleSource === 'A'}
                      onChange={() => setSelectedAngleSource('A')}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedAngleSource === 'A'
                          ? 'border-primary-500'
                          : 'border-industrial-400'
                      }`}
                    >
                      {selectedAngleSource === 'A' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">张工 - 运动规划组</p>
                      <p className="text-xs text-industrial-400">导入时间: 2024-01-15 10:30</p>
                    </div>
                  </div>
                  <span className="text-xs text-primary-400 font-mono">来源 A</span>
                </label>

                <label
                  className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedAngleSource === 'B'
                      ? 'border-warning-500 bg-warning-500/10'
                      : 'border-industrial-500 hover:border-industrial-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="angleSource"
                      value="B"
                      checked={selectedAngleSource === 'B'}
                      onChange={() => setSelectedAngleSource('B')}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedAngleSource === 'B'
                          ? 'border-warning-500'
                          : 'border-industrial-400'
                      }`}
                    >
                      {selectedAngleSource === 'B' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-warning-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">李工 - 轨迹优化组</p>
                      <p className="text-xs text-industrial-400">导入时间: 2024-01-15 11:15</p>
                    </div>
                  </div>
                  <span className="text-xs text-warning-400 font-mono">来源 B</span>
                </label>
              </div>
            </div>

            <div className="bg-industrial-700 rounded-lg p-5 border border-industrial-500">
              <div className="flex items-center gap-2 mb-4">
                <FileJson className="w-5 h-5 text-warning-400" />
                <h2 className="text-base font-semibold text-white">选择负载数据源</h2>
              </div>
              <div className="space-y-3">
                <label
                  className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedLoadSource === 'A'
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-industrial-500 hover:border-industrial-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="loadSource"
                      value="A"
                      checked={selectedLoadSource === 'A'}
                      onChange={() => setSelectedLoadSource('A')}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedLoadSource === 'A'
                          ? 'border-primary-500'
                          : 'border-industrial-400'
                      }`}
                    >
                      {selectedLoadSource === 'A' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">王工 - 机械设计组</p>
                      <p className="text-xs text-industrial-400">导入时间: 2024-01-15 09:00</p>
                    </div>
                  </div>
                  <span className="text-xs text-primary-400 font-mono">来源 A</span>
                </label>

                <label
                  className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedLoadSource === 'B'
                      ? 'border-warning-500 bg-warning-500/10'
                      : 'border-industrial-500 hover:border-industrial-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="loadSource"
                      value="B"
                      checked={selectedLoadSource === 'B'}
                      onChange={() => setSelectedLoadSource('B')}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedLoadSource === 'B'
                          ? 'border-warning-500'
                          : 'border-industrial-400'
                      }`}
                    >
                      {selectedLoadSource === 'B' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-warning-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">赵工 - 动力学组</p>
                      <p className="text-xs text-industrial-400">导入时间: 2024-01-15 09:30</p>
                    </div>
                  </div>
                  <span className="text-xs text-warning-400 font-mono">来源 B</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-center mb-8">
            <button
              onClick={handleImportData}
              className="flex items-center gap-2 px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-all duration-200 glow-primary"
            >
              <Upload className="w-5 h-5" />
              导入并检测冲突
            </button>
          </div>

          {unresolvedConflicts.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-danger-500" />
                <h2 className="text-lg font-semibold text-white font-mono">
                  待解决冲突 ({unresolvedConflicts.length})
                </h2>
              </div>
              <div className="space-y-3">
                {unresolvedConflicts.map((conflict) => (
                  <ConflictCard key={conflict.id} conflict={conflict} />
                ))}
              </div>
            </div>
          )}

          {resolvedConflicts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Check className="w-5 h-5 text-success-500" />
                <h2 className="text-lg font-semibold text-white font-mono">
                  已解决冲突 ({resolvedConflicts.length})
                </h2>
              </div>
              <div className="space-y-3">
                {resolvedConflicts.map((conflict) => (
                  <ConflictCard key={conflict.id} conflict={conflict} />
                ))}
              </div>
            </div>
          )}

          {conflicts.length === 0 && (
            <div className="text-center py-16 bg-industrial-700 rounded-lg border border-industrial-500">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-industrial-300 text-lg">暂无冲突数据</p>
              <p className="text-industrial-400 text-sm mt-2">
                请先导入数据，系统将自动检测冲突
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
