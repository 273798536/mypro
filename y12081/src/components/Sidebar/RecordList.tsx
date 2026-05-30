import { Ship, Calendar, Clock } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { RecordStatus } from '../../types';

const statusConfig: Record<RecordStatus, { label: string; color: string; bgColor: string; dotColor: string }> = {
  normal: { label: '正常', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', dotColor: 'bg-emerald-500' },
  warning: { label: '预警', color: 'text-amber-400', bgColor: 'bg-amber-500/20', dotColor: 'bg-amber-500' },
  danger: { label: '危险', color: 'text-red-400', bgColor: 'bg-red-500/20', dotColor: 'bg-red-500' },
};

export function RecordList() {
  const filteredRecords = useAppStore((state) => state.getFilteredRecords());
  const selectedRecordId = useAppStore((state) => state.selectedRecordId);
  const setSelectedRecord = useAppStore((state) => state.setSelectedRecord);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-200">装载记录</h3>
      
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {filteredRecords.map((record) => {
          const status = statusConfig[record.status];
          const isSelected = record.id === selectedRecordId;

          return (
            <button
              key={record.id}
              onClick={() => setSelectedRecord(record.id)}
              className={`w-full p-3 rounded-lg text-left transition-all ${
                isSelected
                  ? 'bg-blue-500/20 border border-blue-500/50'
                  : 'bg-slate-800/50 border border-transparent hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${status.dotColor}`} />
                    <span className="text-sm font-medium text-slate-200 truncate">{record.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Ship size={12} />
                      {record.vesselName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(record.timestamp)}
                    </span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.bgColor} ${status.color} shrink-0`}>
                  {status.label}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className="text-slate-500">
                  货物: <span className="text-slate-300">{record.cargo.length} 件</span>
                </span>
                <span className="text-slate-500">
                  压载舱: <span className="text-slate-300">{record.ballast.length} 个</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
