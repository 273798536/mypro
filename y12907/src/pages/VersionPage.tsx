import { useState, useMemo } from 'react';
import {
  GitBranch,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Database
} from 'lucide-react';
import dayjs from 'dayjs';

import { useAppStore } from '../store/useAppStore';
import { VersionTimeline } from '../components/charts/VersionTimeline';
import { Alert } from '../components/ui/Alert';
import { versionManager, compareVersions } from '../services/versionManager';

// 版本追踪页
export const VersionPage: React.FC = () => {
  const { samples } = useAppStore();
  const [selectedVersion1, setSelectedVersion1] = useState<string | null>(null);
  const [selectedVersion2, setSelectedVersion2] = useState<string | null>(null);
  const [showConflicts, setShowConflicts] = useState(false);

  const versions = versionManager.getAllVersions();
  const timelineData = versionManager.getTimelineData();
  const versionRisks = versionManager.detectVersionRisks();

  // 版本对比
  const versionComparison = useMemo(() => {
    if (!selectedVersion1 || !selectedVersion2) return null;
    return compareVersions(selectedVersion1, selectedVersion2);
  }, [selectedVersion1, selectedVersion2]);

  // 标签冲突
  const labelConflicts = useMemo(() => {
    if (!selectedVersion1 || !selectedVersion2 || !showConflicts) return [];
    return versionManager.checkLabelConflictsByVersion(selectedVersion1, selectedVersion2);
  }, [selectedVersion1, selectedVersion2, showConflicts]);

  const handleSwapVersions = () => {
    const temp = selectedVersion1;
    setSelectedVersion1(selectedVersion2);
    setSelectedVersion2(temp);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-serif-cn text-2xl font-bold text-navy-900 mb-2">
          版本追踪
        </h1>
        <p className="text-gray-600">
          追踪提示词版本变化，检测因版本不一致导致的标签冲突
        </p>
      </div>

      {/* 版本风险警告 */}
      {versionRisks.length > 0 && (
        <div className="mb-6 space-y-3">
          {versionRisks.map((risk, index) => (
            <Alert
              key={index}
              type={risk.severity === 'error' ? 'error' : 'warning'}
              title={risk.type === 'late_arrival' ? '版本晚到风险' : '版本间隔过长'}
              description={risk.message}
            />
          ))}
        </div>
      )}

      {/* 版本时间轴 */}
      <div className="card p-6 mb-6">
        <h3 className="font-serif-cn text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-navy-600" />
          版本时间轴（精确到小时）
        </h3>
        <VersionTimeline
          versions={versions}
          highlightVersionId={selectedVersion1 || selectedVersion2}
        />
        <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>正常版本</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>存在晚到风险</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-navy-900" />
            <span>当前选中</span>
          </div>
        </div>
      </div>

      {/* 版本对比 */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* 版本1选择 */}
        <div className="card p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            选择旧版本
          </label>
          <div className="space-y-2 max-h-60 overflow-auto">
            {versions.map((version) => (
              <div
                key={version.versionId}
                onClick={() => setSelectedVersion1(version.versionId)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedVersion1 === version.versionId
                    ? 'border-navy-500 bg-navy-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono-data text-sm font-semibold text-navy-900">
                    {version.versionNumber}
                  </span>
                  <span className="text-xs text-gray-500">
                    {dayjs(version.releasedAt).format('MM-DD HH:mm')}
                  </span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-1">{version.remark}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 版本2选择 */}
        <div className="card p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            选择新版本
          </label>
          <div className="space-y-2 max-h-60 overflow-auto">
            {versions.map((version) => (
              <div
                key={version.versionId}
                onClick={() => setSelectedVersion2(version.versionId)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedVersion2 === version.versionId
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono-data text-sm font-semibold text-navy-900">
                    {version.versionNumber}
                  </span>
                  <span className="text-xs text-gray-500">
                    {dayjs(version.releasedAt).format('MM-DD HH:mm')}
                  </span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-1">{version.remark}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 对比按钮和结果 */}
      {selectedVersion1 && selectedVersion2 && (
        <>
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={handleSwapVersions}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="交换版本"
            >
              <ArrowRight className="w-5 h-5 text-gray-500 rotate-180" />
            </button>
            <button
              onClick={() => setShowConflicts(!showConflicts)}
              className={`btn ${showConflicts ? 'btn-primary' : 'btn-secondary'} px-8`}
            >
              {showConflicts ? '隐藏冲突' : '检测标签冲突'}
            </button>
            <button
              onClick={() => {
                setSelectedVersion1(null);
                setSelectedVersion2(null);
                setShowConflicts(false);
              }}
              className="btn btn-secondary"
            >
              重置选择
            </button>
          </div>

          {/* 版本对比结果 */}
          {versionComparison && (
            <div className="card p-6 mb-6">
              <div className="grid grid-cols-2 gap-6">
                {/* 旧版本 */}
                <div className="p-4 bg-navy-50 rounded-lg">
                  <h4 className="font-semibold text-navy-900 mb-2">
                    {versionComparison.version1.versionNumber}
                  </h4>
                  <p className="text-xs text-gray-500 mb-2">
                    {dayjs(versionComparison.version1.releasedAt).format('YYYY-MM-DD HH:mm:ss')}
                  </p>
                  <p className="text-sm text-gray-700 mb-3">
                    {versionComparison.version1.content}
                  </p>
                  <div className="text-xs text-gray-600">
                    <p className="font-medium mb-1">变更内容：</p>
                    <ul className="list-disc list-inside space-y-1">
                      {versionComparison.version1.changes.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 中间箭头和时间差 */}
                <div className="p-4 bg-amber-50 rounded-lg">
                  <h4 className="font-semibold text-navy-900 mb-2">
                    {versionComparison.version2.versionNumber}
                  </h4>
                  <p className="text-xs text-gray-500 mb-2">
                    {dayjs(versionComparison.version2.releasedAt).format('YYYY-MM-DD HH:mm:ss')}
                  </p>
                  <div className={`mb-3 p-2 rounded ${
                    versionComparison.isLateArrival ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    <p className="text-sm font-medium">
                      时间间隔：{versionComparison.timeDiff.toFixed(1)} 小时
                      {versionComparison.isLateArrival && ' ⚠️ 晚到风险'}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">
                    {versionComparison.version2.content}
                  </p>
                  <div className="text-xs text-gray-600">
                    <p className="font-medium mb-1">变更内容：</p>
                    <ul className="list-disc list-inside space-y-1">
                      {versionComparison.version2.changes.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 所有变更 */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h5 className="font-medium text-gray-700 mb-3">版本间变更汇总</h5>
                <div className="flex flex-wrap gap-2">
                  {versionComparison.changes.map((change, i) => (
                    <span key={i} className="badge bg-gray-100 text-gray-800">
                      {change}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 标签冲突列表 */}
          {showConflicts && (
            <div className="card p-6">
              <h3 className="font-serif-cn text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                标签冲突检测结果
                <span className="ml-2 text-sm font-normal text-gray-500">
                  共 {labelConflicts.length} 条冲突
                </span>
              </h3>

              {labelConflicts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p>未检测到标签冲突</p>
                  <p className="text-sm mt-1">两个版本的安全标签一致</p>
                </div>
              ) : (
                <div className="overflow-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          样本ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          内容摘要
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          旧标签
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          变化
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          新标签
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          原因说明
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {labelConflicts.map((conflict) => {
                        const sample = samples.find(s => s.sampleId === conflict.sampleId);
                        return (
                          <tr key={conflict.conflictId} className="table-row-alt conflict-highlight">
                            <td className="px-4 py-3 font-mono-data text-xs text-navy-900">
                              {conflict.sampleId}
                            </td>
                            <td className="px-4 py-3 max-w-xs truncate">
                              {sample?.content?.substring(0, 30)}...
                            </td>
                            <td className="px-4 py-3">
                              <span className="badge bg-navy-100 text-navy-800">
                                {conflict.previousLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <ArrowRight className="w-4 h-4 text-amber-500 mx-auto" />
                            </td>
                            <td className="px-4 py-3">
                              <span className="badge bg-amber-100 text-amber-800">
                                {conflict.currentLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                              {conflict.versionDiff}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {labelConflicts.length > 0 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>说明：</strong>
                    以上冲突可能是由于提示词版本变更导致。建议人工复核这些样本的安全标签，
                    确定哪个版本的标注更准确。必要时可在分析页面重新运行归因分析。
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 未选择版本时的提示 */}
      {(!selectedVersion1 || !selectedVersion2) && (
        <div className="card p-8 text-center">
          <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-serif-cn text-xl font-semibold text-gray-700 mb-2">
            选择两个版本进行对比
          </h3>
          <p className="text-gray-500">
            选择旧版本和新版本，系统将检测因提示词版本变更导致的标签冲突
          </p>
        </div>
      )}

      {/* 版本历史列表 */}
      <div className="card p-6 mt-6">
        <h3 className="font-serif-cn text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-navy-600" />
          所有版本历史
        </h3>
        <div className="space-y-3">
          {timelineData.map((item, index) => (
            <div
              key={item.version.versionId}
              className={`p-4 rounded-lg border ${
                item.hasRisk ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center flex-shrink-0">
                    <span className="font-mono-data text-xs font-bold text-navy-700">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono-data text-sm font-semibold text-navy-900">
                        {item.version.versionNumber}
                      </span>
                      {item.hasRisk && (
                        <span className="badge bg-red-100 text-red-800 text-xs">
                          晚到风险
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      {dayjs(item.version.releasedAt).format('YYYY-MM-DD HH:mm:ss')}
                      {item.sampleCount > 0 && ` · 关联 ${item.sampleCount} 条样本`}
                    </p>
                    <p className="text-sm text-gray-700 mb-2">{item.version.remark}</p>
                    <div className="flex flex-wrap gap-1">
                      {item.version.changes.map((c, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
