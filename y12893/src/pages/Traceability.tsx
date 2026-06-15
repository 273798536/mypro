import { useEffect, useState } from 'react';
import {
  GitBranch,
  Database,
  ArrowRight,
  Clock,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  MapPin
} from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import {
  DATA_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  QUALITY_ISSUE_LABELS
} from '@/types';
import type { DataRecord } from '@/types';
import { cn } from '@/lib/utils';

export default function Traceability() {
  const { records, loadRecords, loadTrace, processingTrace, selectRecord, selectedRecord, loadStats } = useDataStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadRecords();
    loadStats();
  }, [loadRecords, loadStats]);

  const recordsWithIssues = records.filter(r => r.qualityIssues.length > 0 || r.correctionHistory.length > 0);

  const handleRecordSelect = async (record: DataRecord) => {
    selectRecord(record);
    await loadTrace(record.id);
    if (expandedId === record.id) {
      setExpandedId(null);
    } else {
      setExpandedId(record.id);
    }
  };

  const getRecordName = (record: DataRecord) => {
    if (record.type === 'ship_track') return record.vesselName;
    if (record.type === 'aquaculture_log') return record.farmName;
    return record.stationId;
  };

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">数据溯源中心</h1>
        <p className="text-white/70">
          从结果一路回到来源和处理记录，验收会拿一条深度为负记录倒查，所有操作留痕
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#E63946]" />
              需溯源记录
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              点击记录查看完整处理链路
            </p>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {recordsWithIssues.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>所有记录质量良好</p>
                </div>
              ) : (
                recordsWithIssues.map(record => (
                  <div
                    key={record.id}
                    onClick={() => handleRecordSelect(record)}
                    className={cn(
                      'p-3 rounded-xl cursor-pointer transition-all border-2',
                      expandedId === record.id
                        ? 'border-[#3E92CC] bg-[#3E92CC]/5'
                        : 'border-transparent bg-gray-50 hover:bg-gray-100'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${STATUS_COLORS[record.status]}20`,
                          color: STATUS_COLORS[record.status]
                        }}
                      >
                        {STATUS_LABELS[record.status]}
                      </span>
                      {expandedId === record.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <p className="font-medium text-gray-800 text-sm">{getRecordName(record)}</p>
                    <p className="text-xs text-gray-500 mt-1">{DATA_TYPE_LABELS[record.type]}</p>
                    {record.qualityIssues.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {record.qualityIssues.map(issue => (
                          <span
                            key={issue}
                            className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#E63946]/10 text-[#E63946] font-medium"
                          >
                            {QUALITY_ISSUE_LABELS[issue]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {!selectedRecord ? (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-12 shadow-xl text-center">
              <GitBranch className="w-20 h-20 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">选择一条记录</h3>
              <p className="text-gray-500">查看从数据采集到最终结果的完整处理链路</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#0A2463]" />
                  当前记录信息
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">数据类型</p>
                    <p className="font-semibold text-gray-800">{DATA_TYPE_LABELS[selectedRecord.type]}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">名称</p>
                    <p className="font-semibold text-gray-800">{getRecordName(selectedRecord)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">位置</p>
                    <p className="font-mono text-sm text-gray-800">
                      {selectedRecord.location.lat.toFixed(4)}°N, {selectedRecord.location.lng.toFixed(4)}°E
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">深度</p>
                    <p className={cn(
                      'font-semibold',
                      selectedRecord.location.depth !== undefined && selectedRecord.location.depth < 0
                        ? 'text-[#E63946]'
                        : 'text-gray-800'
                    )}>
                      {selectedRecord.location.depth?.toFixed(2)} m
                      {selectedRecord.location.depth !== undefined && selectedRecord.location.depth < 0 && ' ⚠️'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 col-span-2">
                    <p className="text-xs text-gray-500 mb-1">数据来源</p>
                    <p className="font-semibold text-gray-800">{selectedRecord.source}</p>
                    <p className="text-xs text-gray-400 mt-1">批次: {selectedRecord.importBatch}</p>
                  </div>
                </div>

                {selectedRecord.resultNote && (
                  <div className="mt-4 p-4 bg-[#0A2463]/5 rounded-xl border border-[#0A2463]/10">
                    <p className="text-xs font-semibold text-[#0A2463] mb-1">结果说明</p>
                    <p className="text-sm text-gray-700">{selectedRecord.resultNote}</p>
                  </div>
                )}
              </div>

              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-[#3E92CC]" />
                  处理链路
                </h2>

                {!processingTrace || processingTrace.steps.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>暂无处理记录</p>
                  </div>
                ) : (
                  <div className="relative">
                    {processingTrace.steps.map((step, idx) => (
                      <div key={step.id} className="flex gap-4 relative">
                        {idx < processingTrace.steps.length - 1 && (
                          <div className="absolute left-[22px] top-[44px] w-0.5 h-full bg-gradient-to-b from-[#3E92CC] to-[#3E92CC]/20" />
                        )}

                        <div className="relative z-10">
                          <div className={cn(
                            'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                            idx === 0 ? 'bg-[#2A9D8F]' :
                            idx === processingTrace.steps.length - 1 ? 'bg-[#0A2463]' : 'bg-[#3E92CC]'
                          )}>
                            {idx === 0 ? (
                              <Database className="w-5 h-5 text-white" />
                            ) : idx === processingTrace.steps.length - 1 ? (
                              <CheckCircle className="w-5 h-5 text-white" />
                            ) : (
                              <GitBranch className="w-5 h-5 text-white" />
                            )}
                          </div>
                        </div>

                        <div className="flex-1 pb-8">
                          <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold text-gray-800">{step.operation}</h4>
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(step.timestamp).toLocaleString('zh-CN')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                              <User className="w-3 h-3" />
                              <span>{step.operator}</span>
                              <span className="mx-1">·</span>
                              <FileText className="w-3 h-3" />
                              <span>{step.sourceData}</span>
                            </div>
                            {Object.keys(step.details).length > 0 && (
                              <div className="bg-white rounded-lg p-3 border border-gray-100">
                                <p className="text-xs text-gray-500 mb-2">处理详情</p>
                                <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap">
                                  {JSON.stringify(step.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedRecord.correctionHistory.length > 0 && (
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-[#E9C46A]" />
                    修正前后对比
                  </h2>
                  <div className="space-y-4">
                    {selectedRecord.correctionHistory.map((corr, idx) => (
                      <div key={corr.id} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-semibold text-gray-800">第 {idx + 1} 次修正</p>
                            <p className="text-xs text-gray-500">
                              {corr.operator} · {new Date(corr.timestamp).toLocaleString('zh-CN')}
                            </p>
                          </div>
                          {corr.statusChange && (
                            <span className="text-xs bg-[#3E92CC]/10 text-[#3E92CC] px-2 py-1 rounded-full font-medium">
                              {STATUS_LABELS[corr.statusChange.from]} → {STATUS_LABELS[corr.statusChange.to]}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-3 bg-white rounded-lg p-3 border border-gray-100">
                          <strong>修正原因：</strong>{corr.reason}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-[#E63946]/5 rounded-lg p-3 border border-[#E63946]/20">
                            <p className="text-xs font-semibold text-[#E63946] mb-2">修正前</p>
                            <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap">
                              {JSON.stringify(corr.before, null, 2)}
                            </pre>
                          </div>
                          <div className="bg-[#2A9D8F]/5 rounded-lg p-3 border border-[#2A9D8F]/20">
                            <p className="text-xs font-semibold text-[#2A9D8F] mb-2">修正后</p>
                            <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap">
                              {JSON.stringify(corr.after, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
