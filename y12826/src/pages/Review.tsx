import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronRight,
  GitCompare,
  ArrowLeftRight,
  Image as ImageIcon,
  BarChart3,
} from 'lucide-react';
import { useAuditStore } from '@/store/useAuditStore';
import Card from '@/components/common/Card';
import StatusBadge from '@/components/common/StatusBadge';
import { formatPercent, formatNumber, contaminationTypeLabels } from '@/utils/formatters';
import { compareVersions } from '@/utils/versionDiff';

export default function Review() {
  const {
    currentBatchId,
    getAbnormalSamples,
    getSampleById,
    toggleSelectSample,
    selectedSampleIds,
    clearSelection,
    reRunSelected,
    getSampleVersions,
  } = useAuditStore();

  const [selectedForCompare, setSelectedForCompare] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState<'version' | 'photo'>('version');

  const abnormalSamples = currentBatchId ? getAbnormalSamples(currentBatchId) : [];
  const compareSample = selectedForCompare ? getSampleById(selectedForCompare) : null;
  const compareVersionsData = compareSample ? getSampleVersions(compareSample.id) : [];

  const handleReRunSelected = () => {
    reRunSelected();
  };

  const renderCompareView = () => {
    if (!compareSample || compareVersionsData.length < 2) {
      return (
        <div className="h-full flex items-center justify-center text-slate-500">
          <div className="text-center">
            <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">选择一个样本查看并排对比</p>
            <p className="text-xs text-slate-600 mt-1">
              点击样本列表中的「对比」按钮
            </p>
          </div>
        </div>
      );
    }

    const oldVersion = compareVersionsData[0];
    const newVersion = compareVersionsData[compareVersionsData.length - 1];
    const diff = compareVersions(oldVersion, newVersion);

    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCompareMode('version')}
              className={`px-3 py-1.5 text-sm rounded ${
                compareMode === 'version'
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-1.5" />
              数据对比
            </button>
            <button
              onClick={() => setCompareMode('photo')}
              className={`px-3 py-1.5 text-sm rounded ${
                compareMode === 'photo'
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-4 h-4 inline mr-1.5" />
              照片对比
            </button>
          </div>
          <button
            onClick={() => setSelectedForCompare(null)}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            关闭对比
          </button>
        </div>

        {compareMode === 'photo' ? (
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <div className="px-3 py-2 bg-slate-800 rounded-t text-sm text-slate-400 border-b border-slate-700">
                原始照片 · v1
              </div>
              <div className="flex-1 bg-slate-950 rounded-b flex items-center justify-center overflow-hidden">
                <img
                  src={compareSample.micrographUrl}
                  alt="原始"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="px-3 py-2 bg-teal-900/30 rounded-t text-sm text-teal-400 border-b border-teal-800/50">
                处理后 · v{compareSample.currentVersion}
              </div>
              <div className="flex-1 bg-slate-950 rounded-b flex items-center justify-center overflow-hidden">
                <img
                  src={compareSample.micrographModifiedUrl || compareSample.micrographUrl}
                  alt="处理后"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <div className="px-4 py-3 bg-slate-800 rounded-t border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">旧版本</span>
                  <StatusBadge status={oldVersion.status} size="sm" />
                </div>
                <p className="text-xs text-slate-500 mt-1">v{oldVersion.version}</p>
              </div>
              <div className="flex-1 bg-slate-900/50 rounded-b p-4 space-y-3 overflow-y-auto">
                {diff.metrics.map(m => (
                  <div key={`old-${m.metric}`}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">{m.metric}</span>
                      <span className="font-mono text-slate-200">
                        {m.oldValue.toFixed(2)} {m.unit}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-600 rounded-full"
                        style={{ width: `${Math.min(100, (m.oldValue / (m.newValue * 1.2)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-3 mt-3 border-t border-slate-800">
                  <p className="text-sm text-slate-400 mb-2">污染检测</p>
                  <p className="text-sm">
                    {oldVersion.contamination.detected ? (
                      <span className="text-amber-400">
                        {contaminationTypeLabels[oldVersion.contamination.type]}
                      </span>
                    ) : (
                      <span className="text-teal-400">未检测到</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    置信度 {(oldVersion.contamination.confidence * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="px-4 py-3 bg-teal-900/20 rounded-t border-b border-teal-800/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-teal-400">新版本</span>
                  <StatusBadge status={newVersion.status} size="sm" />
                </div>
                <p className="text-xs text-slate-500 mt-1">v{newVersion.version}</p>
              </div>
              <div className="flex-1 bg-slate-900/50 rounded-b p-4 space-y-3 overflow-y-auto">
                {diff.metrics.map(m => (
                  <div key={`new-${m.metric}`}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">{m.metric}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-200">
                          {m.newValue.toFixed(2)} {m.unit}
                        </span>
                        <span
                          className={`text-xs font-mono ${
                            m.change > 0 ? 'text-teal-400' : m.change < 0 ? 'text-red-400' : 'text-slate-500'
                          }`}
                        >
                          {m.change > 0 ? '↑' : m.change < 0 ? '↓' : '→'}
                          {Math.abs(m.changePercent).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          m.changePercent > 5 ? 'bg-teal-500' : m.changePercent < -5 ? 'bg-red-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, (m.newValue / (m.newValue * 1.2)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-3 mt-3 border-t border-slate-800">
                  <p className="text-sm text-slate-400 mb-2">污染检测</p>
                  <p className="text-sm">
                    {newVersion.contamination.detected ? (
                      <span className="text-amber-400">
                        {contaminationTypeLabels[newVersion.contamination.type]}
                      </span>
                    ) : (
                      <span className="text-teal-400">未检测到</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    置信度 {(newVersion.contamination.confidence * 100).toFixed(1)}%
                  </p>
                  {diff.contaminationChanged && (
                    <p className="text-xs text-amber-500 mt-2">⚠ 检测结果发生变化</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="font-display text-2xl text-slate-100">异常复核</h1>
          <p className="text-sm text-slate-500 mt-1">
            共 {abnormalSamples.length} 个异常样本需复核 ·{' '}
            {selectedSampleIds.length > 0 && `已选 ${selectedSampleIds.length} 个`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedSampleIds.length > 0 && (
            <>
              <button
                onClick={handleReRunSelected}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded text-sm font-medium"
              >
                批量重复运行 ({selectedSampleIds.length})
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-2 text-slate-400 hover:text-slate-200 text-sm"
              >
                取消选择
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        <Card
          title="异常样本列表"
          subtitle="按风险等级排序"
          className="flex flex-col min-h-0"
        >
          <div className="flex-1 overflow-y-auto -mx-5 -mb-5 px-5 pb-5 space-y-2">
            {abnormalSamples.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无异常样本</p>
              </div>
            ) : (
              abnormalSamples
                .sort((a, b) => b.contamination.confidence - a.contamination.confidence)
                .map(sample => {
                  const isSelected = selectedSampleIds.includes(sample.id);
                  const isCompare = selectedForCompare === sample.id;
                  return (
                    <div
                      key={sample.id}
                      className={`p-4 rounded border transition-all cursor-pointer ${
                        isCompare
                          ? 'bg-teal-900/30 border-teal-700'
                          : isSelected
                          ? 'bg-slate-800 border-slate-600'
                          : 'bg-slate-800/50 border-slate-800 hover:border-slate-700'
                      }`}
                      onClick={() => toggleSelectSample(sample.id)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-700 text-teal-600 focus:ring-teal-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <Link
                              to={`/sample/${sample.id}`}
                              className="text-sm font-medium text-slate-200 hover:text-teal-300 truncate"
                              onClick={e => e.stopPropagation()}
                            >
                              {sample.name}
                            </Link>
                            <StatusBadge status={sample.status} size="sm" />
                          </div>
                          <p className="text-xs text-slate-500 mt-1 truncate">
                            {sample.sourceMaterial}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">
                                {contaminationTypeLabels[sample.contamination.type] || '未知'}
                              </span>
                              <span className="text-xs text-amber-400 font-mono">
                                {formatPercent(sample.contamination.confidence)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedForCompare(sample.id);
                                }}
                                className={`p-1.5 rounded text-xs transition-colors ${
                                  isCompare
                                    ? 'bg-teal-700 text-white'
                                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
                                }`}
                                title="对比"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                              </button>
                              <Link
                                to={`/sample/${sample.id}`}
                                onClick={e => e.stopPropagation()}
                                className="p-1.5 bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200 rounded transition-colors"
                                title="查看详情"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </Card>

        <Card
          title="并排对比视图"
          subtitle="旧版本 vs 新版本"
          className="flex flex-col min-h-0"
        >
          <div className="flex-1 min-h-0">{renderCompareView()}</div>
        </Card>
      </div>
    </div>
  );
}
