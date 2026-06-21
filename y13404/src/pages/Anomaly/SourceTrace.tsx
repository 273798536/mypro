import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Image,
  StickyNote,
  ExternalLink,
  Clock,
  ChevronRight,
  Link as LinkIcon,
} from 'lucide-react';
import { getMockBoundaryRecords, getMockSourceMaterials } from '@/utils/mockData';
import { getBoundaryTypeLabel, getBoundaryTypeColor } from '@/utils/boundaryEngine';
import { cn } from '@/lib/utils';
import type { SourceMaterialType } from '@/types';

const sourceIconMap: Record<SourceMaterialType, React.FC<any>> = {
  csv: FileText,
  excel: FileSpreadsheet,
  screenshot: Image,
  note: StickyNote,
};

const sourceColorMap: Record<SourceMaterialType, string> = {
  csv: 'from-emerald-500 to-teal-600',
  excel: 'from-green-500 to-emerald-600',
  screenshot: 'from-purple-500 to-pink-600',
  note: 'from-amber-500 to-orange-600',
};

const SourceTrace: React.FC = () => {
  const sourceMaterials = getMockSourceMaterials();
  const boundaryRecords = getMockBoundaryRecords();
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBoundaryRecordsForSource = (sourceId: string) => {
    return boundaryRecords.filter((r) => r.sourceMaterial.id === sourceId);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">原始材料追溯</h3>
              <p className="text-xs text-slate-500">每条异常记录均可追溯至原始材料</p>
            </div>
          </div>
          <span className="text-xs text-slate-400">共 {sourceMaterials.length} 份材料</span>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {sourceMaterials.map((source, index) => {
          const Icon = sourceIconMap[source.type];
          const relatedRecords = getBoundaryRecordsForSource(source.id);
          const isExpanded = selectedRecord === source.id;

          return (
            <div key={source.id} className="overflow-hidden">
              <div
                onClick={() => setSelectedRecord(isExpanded ? null : source.id)}
                className="p-5 hover:bg-slate-50 cursor-pointer transition-colors"
                style={{ animation: `fadeInUp 0.4s ease-out ${index * 0.1}s both` }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br',
                      sourceColorMap[source.type]
                    )}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-800 text-sm truncate">{source.name}</h4>
                      <span className="text-xs text-slate-400 uppercase">{source.type}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(source.uploadTime)}</span>
                      </div>
                      {relatedRecords.length > 0 && (
                        <span className="text-amber-600">
                          关联 {relatedRecords.length} 条边界记录
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <a
                      href={source.url}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      查看
                    </a>
                    <ChevronRight
                      className={cn(
                        'w-5 h-5 text-slate-300 transition-transform duration-200',
                        isExpanded && 'rotate-90'
                      )}
                    />
                  </div>
                </div>
              </div>

              {isExpanded && relatedRecords.length > 0 && (
                <div className="px-5 pb-5 bg-slate-50/50">
                  <div className="ml-14 space-y-3">
                    {relatedRecords.map((record) => (
                      <div
                        key={record.id}
                        className="p-4 bg-white rounded-lg border border-slate-200 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: getBoundaryTypeColor(record.type) + '15',
                                color: getBoundaryTypeColor(record.type),
                              }}
                            >
                              {getBoundaryTypeLabel(record.type)}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">{record.id}</span>
                        </div>
                        <p className="text-sm text-slate-600">{record.explanation}</p>
                        {(record.valueBefore !== null || record.valueAfter !== null) && (
                          <div className="mt-3 flex items-center gap-4 text-xs">
                            {record.valueBefore !== null && (
                              <div>
                                <span className="text-slate-500">变化前: </span>
                                <span className="text-red-500 font-medium line-through">
                                  {record.valueBefore}
                                </span>
                              </div>
                            )}
                            {record.valueAfter !== null && (
                              <div>
                                <span className="text-slate-500">变化后: </span>
                                <span className="text-emerald-600 font-medium">
                                  {record.valueAfter}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="text-slate-500">阈值: </span>
                              <span className="font-medium">{record.threshold}</span>
                            </div>
                          </div>
                        )}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-400">
                            追溯路径: {source.name} → {getBoundaryTypeLabel(record.type)}异常
                          </span>
                          <span className="text-xs text-indigo-500">可重跑验证</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-amber-50 border-t border-amber-100">
        <p className="text-xs text-amber-700">
          💡 <strong>提示：</strong>汇总页截图之外，点击"查看"可直接跳转至原始材料，确保每一条异常都有完整的证据链支持。
        </p>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default SourceTrace;
