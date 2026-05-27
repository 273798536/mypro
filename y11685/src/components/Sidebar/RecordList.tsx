import { useMineStore } from '@/store/useMineStore';
import { AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  normal: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/20' },
  warning: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/20' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/20' },
};

const statusLabels: Record<string, string> = {
  normal: '正常',
  warning: '警告',
  error: '错误',
};

export function RecordList() {
  const filteredRecords = useMineStore((state) => state.getFilteredRecords());
  const selectedRecordId = useMineStore((state) => state.selectedRecordId);
  const setSelectedRecordId = useMineStore((state) => state.setSelectedRecordId);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-gray-200">演练记录</h3>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {filteredRecords.map((record) => {
          const config = statusConfig[record.status];
          const StatusIcon = config.icon;
          const isSelected = selectedRecordId === record.id;

          return (
            <button
              key={record.id}
              onClick={() => setSelectedRecordId(record.id)}
              className={cn(
                'w-full p-3 rounded-lg text-left transition-all duration-200',
                'border backdrop-blur-sm',
                isSelected
                  ? 'bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/10'
                  : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50 hover:border-gray-600'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {record.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{record.date}</p>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-full text-xs',
                    config.bg
                  )}
                >
                  <StatusIcon className={cn('w-3 h-3', config.color)} />
                  <span className={config.color}>{statusLabels[record.status]}</span>
                </div>
              </div>

              {record.alerts.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-red-400">
                    {record.alerts.length} 个告警
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
