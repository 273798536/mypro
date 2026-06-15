import {
  Upload,
  CheckCircle,
  Undo2,
  GitMerge,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { HistoryRecord, ACTION_LABELS } from '../types';
import { formatDateTime } from '../utils/geo';

interface TimelineItemProps {
  record: HistoryRecord;
  index: number;
}

const ACTION_ICONS = {
  import: Upload,
  confirm: CheckCircle,
  withdraw: Undo2,
  merge: GitMerge,
  note: FileText,
  status: RefreshCw,
};

const ACTION_COLORS: Record<string, string> = {
  import: 'bg-city-blue-500',
  confirm: 'bg-emerald-500',
  withdraw: 'bg-gray-500',
  merge: 'bg-purple-500',
  note: 'bg-amber-500',
  status: 'bg-blue-500',
};

export function TimelineItem({ record, index }: TimelineItemProps) {
  const Icon = ACTION_ICONS[record.action];

  return (
    <div
      className="relative pl-10 pb-6 animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className={`timeline-dot ${ACTION_COLORS[record.action]}`} style={{ top: '4px' }} />

      <div className="bg-white rounded border border-gray-200 p-4 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded ${ACTION_COLORS[record.action]} bg-opacity-10 flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${ACTION_COLORS[record.action].replace('bg-', 'text-')}`} />
            </div>
            <div>
              <span className="font-medium text-gray-800">
                {ACTION_LABELS[record.action]}
              </span>
              <div className="text-xs text-gray-500">{record.operator}</div>
            </div>
          </div>
          <div className="text-xs text-gray-400">{formatDateTime(record.timestamp)}</div>
        </div>

        <div className="text-sm">
          {record.action === 'import' && record.after && (
            <div className="text-gray-600">
              导入批次 <span className="font-mono-data text-city-blue-600">{record.after.batch}</span>，
              共 <span className="font-semibold text-city-blue-600">{record.after.count}</span> 条点位数据，
              来源：{record.after.source}
            </div>
          )}

          {record.action === 'merge' && record.after && (
            <div className="text-gray-600">
              归并为 <span className="font-serif-cn font-medium text-purple-600">{record.after.canonicalName}</span>，
              包含 {record.after.rawNames?.length || 0} 条原始数据：
              <div className="flex flex-wrap gap-1 mt-2">
                {record.after.rawNames?.map((name: string, i: number) => (
                  <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded line-through">
                    {name}
                  </span>
                ))}
              </div>
              {record.after.warning && (
                <div className="mt-2 text-orange-600 bg-orange-50 px-3 py-1.5 rounded text-xs">
                  ⚠️ {record.after.warning}
                </div>
              )}
            </div>
          )}

          {(record.action === 'confirm' || record.action === 'status' || record.action === 'withdraw') && (
            <div className="text-gray-600">
              状态变更：
              <span className={`px-1.5 py-0.5 rounded ${
                record.before?.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                record.before?.status === 'onsite' ? 'bg-amber-100 text-amber-700' :
                record.before?.status === 'conflict' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {record.before?.status === 'pending' ? '待复核' :
                 record.before?.status === 'confirmed' ? '已处理' :
                 record.before?.status === 'onsite' ? '待现场看' :
                 record.before?.status === 'conflict' ? '冲突记录' : '-'}
              </span>
              <span className="mx-2 text-gray-400">→</span>
              <span className={`px-1.5 py-0.5 rounded ${
                record.after?.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                record.after?.status === 'onsite' ? 'bg-amber-100 text-amber-700' :
                record.after?.status === 'conflict' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {record.after?.status === 'pending' ? '待复核' :
                 record.after?.status === 'confirmed' ? '已处理' :
                 record.after?.status === 'onsite' ? '待现场看' :
                 record.after?.status === 'conflict' ? '冲突记录' : '-'}
              </span>
            </div>
          )}

          {record.action === 'note' && record.after?.notes && (
            <div className="text-gray-600">
              <div className="flex items-center gap-2 mb-1">
                {record.after.notes[record.after.notes.length - 1]?.isSupplementary && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                    后补备注
                  </span>
                )}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded p-3 mt-2">
                {record.after.notes[record.after.notes.length - 1]?.content}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>目标类型: {record.targetType === 'rawPoint' ? '原始点位' : '归并点位'}</span>
            <span className="font-mono-data">ID: {record.targetId.slice(0, 16)}...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
