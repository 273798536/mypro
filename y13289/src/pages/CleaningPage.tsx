import { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, Merge, RefreshCw, Check, Eye, Info } from 'lucide-react';
import { api } from '@/utils/api';
import { useStore } from '@/store/useStore';
import RecordDetail from '@/components/RecordDetail';
import type { DeliveryRecord } from '@shared/types';
import { getStatusLabel, getIssueTypeLabel, getSeverityColor } from '@/utils/helpers';

export default function CleaningPage() {
  const [records, setRecords] = useState<DeliveryRecord[]>([]);
  const [similarGroups, setSimilarGroups] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<DeliveryRecord | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);
  const [mergeReason, setMergeReason] = useState('');
  const [showMergeModal, setShowMergeModal] = useState(false);

  const setLoading = useStore((state) => state.setLoading);
  const setError = useStore((state) => state.setError);
  const globalRecords = useStore((state) => state.records);
  const setGlobalRecords = useStore((state) => state.setRecords);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recordsData, similarData] = await Promise.all([
        api.records.list(),
        api.merge.findSimilar(),
      ]);
      setRecords(recordsData);
      setGlobalRecords(recordsData);
      setSimilarGroups(similarData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const recordsWithIssues = records.filter((r) => r.issues.some((i) => !i.resolved));

  const handleMerge = async (group: any) => {
    if (!mergeTarget || !mergeReason.trim()) {
      setError('请选择保留的记录并填写归并原因');
      return;
    }

    const sourceIds = group.records
      .filter((r: DeliveryRecord) => r.id !== mergeTarget)
      .map((r: DeliveryRecord) => r.id);

    setLoading(true);
    try {
      await api.merge.merge(mergeTarget, sourceIds, mergeReason);
      setShowMergeModal(false);
      setMergeTarget(null);
      setMergeReason('');
      loadData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateCoordinate = async (recordId: string) => {
    setLoading(true);
    try {
      const result = await api.validate.coordinates(recordId);
      if (!result.valid) {
        setError(`坐标校验失败：${result.suggestion}`);
      } else {
        setError(null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-gray-800 mb-2">数据清洗</h2>
          <p className="text-gray-600">
            检测数据问题，保留原始痕迹，处理坐标偏移和地点归并
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          刷新数据
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="text-2xl font-semibold text-gray-800">{records.length}</div>
          <div className="text-sm text-gray-500 mt-1">总记录数</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="text-2xl font-semibold text-warning-600">{recordsWithIssues.length}</div>
          <div className="text-sm text-gray-500 mt-1">待处理问题</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="text-2xl font-semibold text-blue-600">{similarGroups.length}</div>
          <div className="text-sm text-gray-500 mt-1">待归并地点</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="text-2xl font-semibold text-green-600">
            {records.filter((r) => r.status === 'cleaned').length}
          </div>
          <div className="text-sm text-gray-500 mt-1">已清洗完成</div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-warning-500" />
            <h3 className="font-semibold text-gray-800">数据问题列表</h3>
            <span className="px-2 py-0.5 bg-warning-100 text-warning-700 text-xs rounded-full">
              {recordsWithIssues.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3">
            {recordsWithIssues.map((record, idx) => {
              const statusInfo = getStatusLabel(record.status);
              const unresolvedIssues = record.issues.filter((i) => !i.resolved);
              return (
                <div
                  key={record.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-800">{record.recordId}</span>
                      <span className={`px-2 py-0.5 text-xs border rounded ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleValidateCoordinate(record.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="校验坐标"
                      >
                        <MapPin className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">{record.marketName}</span>
                      <span className="mx-2">·</span>
                      <span>{record.location}</span>
                    </div>
                    <div className="space-y-2">
                      {unresolvedIssues.map((issue) => (
                        <div
                          key={issue.id}
                          className={`border rounded-md p-3 ${getSeverityColor(issue.severity)} animate-border-pulse`}
                        >
                          <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium">
                                  {getIssueTypeLabel(issue.type)}
                                </span>
                                <span className="text-xs opacity-75">
                                  {issue.severity === 'error' ? '严重' : '警告'}
                                </span>
                              </div>
                              <p className="text-sm">{issue.description}</p>
                              <p className="text-xs mt-2 opacity-80">
                                <strong>下一步：</strong>{issue.suggestion}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            {recordsWithIssues.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Check className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                <p>暂无待处理的数据问题</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <Merge className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-800">地点归并建议</h3>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {similarGroups.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4">
            {similarGroups.map((group, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                  <p className="text-sm text-blue-800">{group.suggestion}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    相似度：{Math.round(group.similarity * 100)}%
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  {group.records.map((record: DeliveryRecord, rIdx: number) => (
                    <div
                      key={record.id}
                      className={`p-3 border rounded-md cursor-pointer transition-all ${
                        mergeTarget === record.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300'
                      }`}
                      onClick={() => showMergeModal && setMergeTarget(record.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {showMergeModal && (
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                mergeTarget === record.id ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                              }`}>
                                {mergeTarget === record.id && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </div>
                            )}
                            <span className="font-medium text-gray-800">{record.marketName}</span>
                            <span className="text-xs text-gray-500">({record.recordId})</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{record.location}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            坐标：{record.coordinates.lat}, {record.coordinates.lng}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecord(record);
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
                  {!showMergeModal ? (
                    <button
                      onClick={() => setShowMergeModal(true)}
                      className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Merge className="w-4 h-4" />
                      开始归并
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setShowMergeModal(false);
                          setMergeTarget(null);
                          setMergeReason('');
                        }}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors text-sm"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleMerge(group)}
                        disabled={!mergeTarget}
                        className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check className="w-4 h-4" />
                        确认归并
                      </button>
                    </>
                  )}
                </div>
                {showMergeModal && (
                  <div className="px-4 py-3 border-t border-gray-200 bg-warning-50">
                    <p className="text-sm font-medium text-warning-800 mb-2">请选择保留的记录（点击上方记录选择），并填写归并原因：</p>
                    <textarea
                      value={mergeReason}
                      onChange={(e) => setMergeReason(e.target.value)}
                      placeholder="例如：两处为同一菜场的不同写法..."
                      className="w-full px-3 py-2 border border-warning-300 rounded-md focus:outline-none focus:ring-2 focus:ring-warning-500 text-sm"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            ))}
            {similarGroups.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Check className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                <p>未发现疑似重复的地点</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedRecord && (
        <RecordDetail
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}
