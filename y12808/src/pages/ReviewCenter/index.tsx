import { useState } from 'react';
import {
  ClipboardCheck,
  History,
  Repeat,
  AlertTriangle,
  CheckCircle,
  User,
  Clock,
  ArrowRight,
  FileText,
  Filter
} from 'lucide-react';
import { useSampleStore } from '@/store/sampleStore';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';

type TabType = 'corrections' | 'duplicates' | 'batches';

export default function ReviewCenter() {
  const { correctionRecords, importBatches, samples, sourceTraces, userRole } = useSampleStore();
  const [activeTab, setActiveTab] = useState<TabType>('corrections');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const duplicateBatches = importBatches.filter((b) => b.isReimport);
  const totalCorrections = correctionRecords.length;
  const totalDuplicates = duplicateBatches.reduce((sum, b) => sum + b.duplicateCount, 0);

  const tabs = [
    { key: 'corrections', label: '人工修正记录', icon: History, count: totalCorrections },
    { key: 'duplicates', label: '重复导入审计', icon: Repeat, count: totalDuplicates },
    { key: 'batches', label: '导入批次记录', icon: FileText, count: importBatches.length }
  ];

  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSampleBarcode = (sampleId: string) => {
    const sample = samples.find((s) => s.id === sampleId);
    return sample?.barcode || sampleId;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
            <ClipboardCheck size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">复核中心</h2>
            <p className="text-amber-100">月底或课前查看 · 人工修正与重复导入审计</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/15 backdrop-blur rounded-xl p-4">
            <p className="text-amber-100 text-sm">修正记录</p>
            <p className="text-3xl font-bold mt-1">{totalCorrections}</p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-4">
            <p className="text-amber-100 text-sm">重复导入</p>
            <p className="text-3xl font-bold mt-1">{totalDuplicates}</p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-4">
            <p className="text-amber-100 text-sm">导入批次</p>
            <p className="text-3xl font-bold mt-1">{importBatches.length}</p>
          </div>
        </div>
      </div>

      {userRole === UserRole.STUDENT && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700">学生视图</p>
            <p className="text-sm text-amber-600">
              您当前以学生身份查看，部分详细操作可能受限。完整的修改和导出功能请切换到教师模式。
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={cn(
                  'flex-1 px-6 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors',
                  isActive
                    ? 'border-amber-500 text-amber-600 bg-amber-50/30'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                )}
              >
                <Icon size={18} />
                {tab.label}
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs',
                    isActive ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'corrections' && (
            <div className="space-y-3">
              {correctionRecords.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <History size={48} className="mx-auto mb-3 opacity-30" />
                  <p>暂无修正记录</p>
                </div>
              ) : (
                correctionRecords
                  .sort(
                    (a, b) =>
                      new Date(b.operateTime).getTime() - new Date(a.operateTime).getTime()
                  )
                  .map((record) => (
                    <div
                      key={record.id}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-amber-200 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <History size={20} className="text-amber-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-slate-800">
                                {getSampleBarcode(record.sampleId)}
                              </span>
                              <span className="text-sm text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                {record.fieldName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-sm">
                              <span className="text-slate-500 line-through">
                                {record.oldValue}
                              </span>
                              <ArrowRight size={14} className="text-slate-400" />
                              <span className="text-emerald-600 font-medium">
                                {record.newValue}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                              原因：{record.reason}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <User size={12} />
                            {record.operator}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                            <Clock size={12} />
                            {formatTime(record.operateTime)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}

          {activeTab === 'duplicates' && (
            <div className="space-y-4">
              {duplicateBatches.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Repeat size={48} className="mx-auto mb-3 opacity-30" />
                  <p>暂无重复导入记录</p>
                </div>
              ) : (
                duplicateBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className="p-5 bg-amber-50/50 rounded-xl border border-amber-200"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Repeat size={20} className="text-amber-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-800">{batch.fileName}</h4>
                          <p className="text-sm text-slate-500">
                            重复 {batch.duplicateCount} 条，占比{' '}
                            {((batch.duplicateCount / batch.totalCount) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-slate-500">{formatTime(batch.importTime)}</p>
                        <p className="text-slate-400 text-xs">{batch.operator}</p>
                      </div>
                    </div>

                    <div className="bg-white/60 rounded-lg p-3">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">处理策略：</span>
                        采用"合并补充"方式，保留原有数据，补充新字段，不覆盖。
                      </p>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
                      <CheckCircle size={14} />
                      已完成合并，无冲突
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'batches' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">
                      文件名
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">
                      总记录数
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">
                      有效记录
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">
                      重复数
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">
                      操作人
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">
                      导入时间
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">
                      类型
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importBatches
                    .sort(
                      (a, b) =>
                        new Date(b.importTime).getTime() - new Date(a.importTime).getTime()
                    )
                    .map((batch) => (
                      <tr
                        key={batch.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() =>
                          setSelectedBatchId(
                            selectedBatchId === batch.id ? null : batch.id
                          )
                        }
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText
                              size={16}
                              className={cn(
                                batch.isReimport ? 'text-amber-500' : 'text-cyan-500'
                              )}
                            />
                            <span className="font-medium text-slate-700">
                              {batch.fileName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{batch.totalCount}</td>
                        <td className="px-4 py-3 text-emerald-600 font-medium">
                          {batch.cleanedCount}
                        </td>
                        <td className="px-4 py-3">
                          {batch.duplicateCount > 0 ? (
                            <span className="text-amber-600 font-medium">
                              {batch.duplicateCount}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{batch.operator}</td>
                        <td className="px-4 py-3 text-slate-500 text-sm">
                          {formatTime(batch.importTime)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'px-2 py-0.5 text-xs rounded-full',
                              batch.isReimport
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-cyan-100 text-cyan-700'
                            )}
                          >
                            {batch.isReimport ? '重复导入' : '首次导入'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
