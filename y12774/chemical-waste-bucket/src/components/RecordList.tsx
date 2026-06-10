import { useState } from 'react';
import type { ExperimentRecord } from '../types';
import { isExperimentRecordUsable, validateAllReagents, getValidationErrors } from '../utils/validation';
import { AlertTriangle, CheckCircle, XCircle, Eye, Filter } from 'lucide-react';

interface Props {
  records: ExperimentRecord[];
  onViewRecord: (record: ExperimentRecord) => void;
}

type FilterType = 'all' | 'abnormal' | 'unusable' | 'normal';

export default function RecordList({ records, onViewRecord }: Props) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredRecords = records.filter(r => {
    switch (filter) {
      case 'abnormal':
        return r.hasAbnormalities;
      case 'unusable':
        return !isExperimentRecordUsable(r);
      case 'normal':
        return isExperimentRecordUsable(r) && !r.hasAbnormalities;
      default:
        return true;
    }
  }).sort((a, b) => b.experimentDate.localeCompare(a.experimentDate));

  const statusConfig: Record<ExperimentRecord['status'], { bg: string; text: string; label: string }> = {
    '草稿': { bg: 'bg-gray-100', text: 'text-gray-700', label: '草稿' },
    '已提交': { bg: 'bg-blue-100', text: 'text-blue-700', label: '已提交' },
    '复核通过': { bg: 'bg-green-100', text: 'text-green-700', label: '复核通过' },
    '复核不通过': { bg: 'bg-red-100', text: 'text-red-700', label: '复核不通过' },
  };

  const filters: { key: FilterType; label: string; icon: any }[] = [
    { key: 'all', label: '全部', icon: Filter },
    { key: 'abnormal', label: '有异常', icon: AlertTriangle },
    { key: 'unusable', label: '不可用', icon: XCircle },
    { key: 'normal', label: '正常', icon: CheckCircle },
  ];

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">实验记录列表</h2>
        <div className="flex gap-2">
          {filters.map(f => {
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  filter === f.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon size={14} />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          没有符合条件的记录
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map(record => {
            const isUnusable = !isExperimentRecordUsable(record);
            const errors = getValidationErrors(validateAllReagents(record.reagents));

            return (
              <div
                key={record.id}
                className={`border rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer ${
                  isUnusable
                    ? 'border-red-300 bg-red-50'
                    : record.hasAbnormalities
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => onViewRecord(record)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-800">{record.experimentName}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[record.status].bg} ${statusConfig[record.status].text}`}>
                        {statusConfig[record.status].label}
                      </span>
                      {isUnusable ? (
                        <span className="text-xs text-red-600 flex items-center gap-1">
                          <XCircle size={14} /> 不可用
                        </span>
                      ) : record.hasAbnormalities ? (
                        <span className="text-xs text-orange-600 flex items-center gap-1">
                          <AlertTriangle size={14} /> 有异常
                        </span>
                      ) : (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle size={14} /> 正常
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-4">
                      <span>{record.experimenter}</span>
                      <span>{record.experimentDate}</span>
                      <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">
                        {record.bucketNumber}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {record.wasteCategory}
                      </span>
                    </div>
                    {(record.hasAbnormalities || errors.length > 0) && (
                      <div className="mt-2 text-xs">
                        {record.abnormalitySummary.slice(0, 2).map((s, i) => (
                          <div key={i} className={isUnusable ? 'text-red-700' : 'text-orange-700'}>
                            · {s}
                          </div>
                        ))}
                        {record.abnormalitySummary.length > 2 && (
                          <div className={isUnusable ? 'text-red-500' : 'text-orange-500'}>
                            ...还有 {record.abnormalitySummary.length - 2} 个问题
                          </div>
                        )}
                      </div>
                    )}
                    {record.manualNotes.trim() && (
                      <div className="mt-2 text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded p-2">
                        <span className="text-amber-700">备注（原话）：</span>{record.manualNotes}
                      </div>
                    )}
                  </div>
                  <button
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    onClick={e => { e.stopPropagation(); onViewRecord(record); }}
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
