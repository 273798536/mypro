import { useAnomalyStore } from '@/stores/useAnomalyStore';
import { useHallStore } from '@/stores/useHallStore';
import { AlertTriangle, Lock, Activity, CheckCircle2, Clock, ChevronRight, X } from 'lucide-react';
import type { AnomalyType, AnomalyStatus } from '@/types';

const tabConfig: { type: AnomalyType; label: string; icon: typeof AlertTriangle; color: string }[] = [
  { type: 'material_missing', label: '材料缺参', icon: AlertTriangle, color: 'text-red-400' },
  { type: 'seat_occlusion', label: '座位遮挡', icon: Lock, color: 'text-amber-400' },
  { type: 'frequency_error', label: '频段切错', icon: Activity, color: 'text-purple-400' },
];

const statusConfig: { value: AnomalyStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待确认' },
  { value: 'confirmed', label: '已确认' },
  { value: 'resolved', label: '已修复' },
];

export default function AnomalyPanel() {
  const activeTab = useAnomalyStore((s) => s.activeTab);
  const setActiveTab = useAnomalyStore((s) => s.setActiveTab);
  const filterStatus = useAnomalyStore((s) => s.filterStatus);
  const setFilterStatus = useAnomalyStore((s) => s.setFilterStatus);
  const selectedAnomalyId = useAnomalyStore((s) => s.selectedAnomalyId);
  const selectAnomaly = useAnomalyStore((s) => s.selectAnomaly);
  const confirmAnomaly = useAnomalyStore((s) => s.confirmAnomaly);
  const resolveAnomaly = useAnomalyStore((s) => s.resolveAnomaly);
  const getFilteredAnomalies = useAnomalyStore((s) => s.getFilteredAnomalies);
  const getCountsByType = useAnomalyStore((s) => s.getCountsByType);
  const selectSeat = useHallStore((s) => s.selectSeat);
  const isOpen = true;

  const filtered = getFilteredAnomalies();
  const counts = getCountsByType();

  if (!isOpen) return null;

  return (
    <div className="w-[280px] h-full bg-[#0d1b2a] border-r border-gray-800 flex flex-col shrink-0">
      <div className="px-3 pt-3 pb-2 border-b border-gray-800">
        <h2 className="text-sm font-bold text-gray-200 mb-2">异常 / 待确认清单</h2>
        <div className="flex gap-1">
          {tabConfig.map(({ type, label, icon: Icon, color }) => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                activeTab === type
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
              }`}
            >
              <Icon size={12} className={activeTab === type ? color : ''} />
              {label}
              <span className={`ml-0.5 px-1 rounded text-[9px] ${
                counts[type] > 0 ? 'bg-red-500/20 text-red-300' : 'bg-gray-700 text-gray-500'
              }`}>
                {counts[type]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-2 border-b border-gray-800 flex gap-1">
        {statusConfig.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilterStatus(value)}
            className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
              filterStatus === value
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-gray-500 hover:text-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-8 text-center text-gray-600 text-xs">
            当前筛选无异常项
          </div>
        ) : (
          filtered.map((item) => {
            const isSelected = item.id === selectedAnomalyId;
            return (
              <div
                key={item.id}
                onClick={() => {
                  selectAnomaly(item.id);
                  if (item.relatedEntityId.startsWith('seat-')) {
                    selectSeat(item.relatedEntityId);
                  }
                }}
                className={`px-3 py-2 border-b border-gray-800/50 cursor-pointer transition-colors ${
                  isSelected ? 'bg-amber-500/10 border-l-2 border-l-amber-500' : 'hover:bg-gray-800/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          item.severity === 'high'
                            ? 'bg-red-500'
                            : item.severity === 'medium'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <span className="text-[11px] text-gray-300 truncate">{item.description}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span
                        className={`inline-flex items-center gap-0.5 text-[9px] px-1 rounded ${
                          item.status === 'pending'
                            ? 'bg-amber-500/15 text-amber-400'
                            : item.status === 'confirmed'
                            ? 'bg-blue-500/15 text-blue-400'
                            : 'bg-emerald-500/15 text-emerald-400'
                        }`}
                      >
                        {item.status === 'pending' && <Clock size={8} />}
                        {item.status === 'confirmed' && <CheckCircle2 size={8} />}
                        {item.status === 'resolved' && <CheckCircle2 size={8} />}
                        {item.status === 'pending' ? '待确认' : item.status === 'confirmed' ? '已确认' : '已修复'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 shrink-0">
                    {item.status === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmAnomaly(item.id);
                        }}
                        className="text-[9px] text-blue-400 hover:text-blue-300 px-1 py-0.5 rounded hover:bg-blue-500/10"
                      >
                        确认
                      </button>
                    )}
                    {item.status !== 'resolved' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resolveAnomaly(item.id);
                        }}
                        className="text-[9px] text-emerald-400 hover:text-emerald-300 px-1 py-0.5 rounded hover:bg-emerald-500/10"
                      >
                        修复
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-3 py-2 border-t border-gray-800 text-[10px] text-gray-600">
        共 {filtered.length} 项 · {counts.material_missing + counts.seat_occlusion + counts.frequency_error} 项未解决
      </div>
    </div>
  );
}
