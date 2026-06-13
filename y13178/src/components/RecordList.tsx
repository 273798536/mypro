import { useMemo, useState } from 'react';
import { Filter, AlertTriangle, Gauge } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { recordTypeLabels, recordTypeBgColors, recordTypeTextColors, formatDate } from '@/utils/format';
import type { RecordType, SpeckleRecord } from '@/types';

interface RecordListProps {
  onSelect?: (record: SpeckleRecord) => void;
}

const typeFilters: Array<{ value: RecordType | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'old_note', label: '维修备注旧版' },
  { value: 'normal', label: '正常记录' },
  { value: 'verbal', label: '口头备注' },
];

export default function RecordList({ onSelect }: RecordListProps) {
  const records = useAppStore((s) => s.records);
  const selectedRecordId = useAppStore((s) => s.selectedRecordId);
  const selectRecord = useAppStore((s) => s.selectRecord);
  const [typeFilter, setTypeFilter] = useState<RecordType | 'all'>('all');
  const [showThresholdOnly, setShowThresholdOnly] = useState(false);

  const filteredRecords = useMemo(() => {
    let result = records.slice().sort((a, b) => a.date.localeCompare(b.date));

    if (typeFilter !== 'all') {
      result = result.filter((r) => r.type === typeFilter);
    }

    if (showThresholdOnly) {
      result = result.filter((r) => r.isThresholdChanged);
    }

    return result;
  }, [records, typeFilter, showThresholdOnly]);

  const handleClick = (record: SpeckleRecord) => {
    selectRecord(record.id);
    onSelect?.(record);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/30 border border-slate-800 rounded-lg overflow-hidden">
      {/* 头部筛选 */}
      <div className="p-3 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <Filter size={14} />
            记录筛选
          </h3>
          <span className="text-xs text-slate-500">
            共 {filteredRecords.length} 条
          </span>
        </div>

        {/* 类型筛选 */}
        <div className="flex flex-wrap gap-1.5">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                typeFilter === f.value
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 阈值变动筛选 */}
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showThresholdOnly}
            onChange={(e) => setShowThresholdOnly(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/20"
          />
          <Gauge size={12} />
          只看阈值变动记录
        </label>
      </div>

      {/* 记录列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
            暂无匹配记录
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {filteredRecords.map((record) => (
              <button
                key={record.id}
                onClick={() => handleClick(record)}
                className={`w-full text-left p-3 transition-colors ${
                  selectedRecordId === record.id
                    ? 'bg-cyan-500/10 border-l-2 border-l-cyan-500'
                    : 'hover:bg-slate-800/50 border-l-2 border-l-transparent'
                } ${record.isThresholdChanged ? 'bg-red-500/5' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-xs text-slate-400 font-mono">
                    {formatDate(record.date)}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded border ${
                      recordTypeBgColors[record.type]
                    } ${recordTypeTextColors[record.type]}`}
                  >
                    {recordTypeLabels[record.type]}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-1.5">
                  <span
                    className={`text-lg font-bold font-mono ${
                      record.isJumpPoint ? 'text-red-400' : 'text-slate-200'
                    }`}
                  >
                    {record.value}
                    <span className="text-xs text-slate-500 ml-0.5">
                      {record.unitChanged && record.unitAfter === 'nm'
                        ? ' nm'
                        : ' μm'}
                    </span>
                  </span>
                  {record.isJumpPoint && (
                    <span className="text-xs text-red-400 flex items-center gap-0.5">
                      <AlertTriangle size={10} />
                      跳变
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                  {record.content}
                </p>

                {/* 影响权重条 */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">权重</span>
                  <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cyan-500/60"
                      style={{ width: `${(record.impactWeight / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono w-4 text-right">
                    {record.impactWeight}
                  </span>
                </div>

                {/* 阈值变动标识 */}
                {record.isThresholdChanged && (
                  <div className="mt-2 text-[10px] text-red-400 bg-red-500/10 rounded px-2 py-1 border border-red-500/20">
                    ⚠ 安全阈值已变动：{record.thresholdBefore} → {record.thresholdAfter} μm
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
