import { useStore } from '@/store/useStore';
import { CHANNELS, CABINETS, SENSOR_TYPES } from '@/types';
import { X, Filter } from 'lucide-react';

export default function FilterPanel() {
  const filterCriteria = useStore((s) => s.filterCriteria);
  const setFilterCriteria = useStore((s) => s.setFilterCriteria);
  const applyFilters = useStore((s) => s.applyFilters);

  const activeTags: Array<{ key: string; label: string; clear: () => void }> = [];
  if (filterCriteria.channel) {
    activeTags.push({ key: 'channel', label: filterCriteria.channel, clear: () => setFilterCriteria({ channel: undefined }) });
  }
  if (filterCriteria.cabinet) {
    activeTags.push({ key: 'cabinet', label: filterCriteria.cabinet, clear: () => setFilterCriteria({ cabinet: undefined }) });
  }
  if (filterCriteria.sensorType) {
    const l = SENSOR_TYPES.find((t) => t.value === filterCriteria.sensorType)?.label ?? filterCriteria.sensorType;
    activeTags.push({ key: 'sensorType', label: `传感器: ${l}`, clear: () => setFilterCriteria({ sensorType: undefined }) });
  }

  return (
    <div className="h-full bg-[#111827] p-4 flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center gap-2 text-white text-sm font-semibold">
        <Filter size={16} className="text-[#00E5A0]" />
        筛选条件
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">开始时间</label>
          <input
            type="datetime-local"
            value={filterCriteria.timeRangeStart.slice(0, 16)}
            onChange={(e) => setFilterCriteria({ timeRangeStart: e.target.value + ':00' })}
            className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1.5 focus:border-[#00E5A0] focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">结束时间</label>
          <input
            type="datetime-local"
            value={filterCriteria.timeRangeEnd.slice(0, 16)}
            onChange={(e) => setFilterCriteria({ timeRangeEnd: e.target.value + ':59' })}
            className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1.5 focus:border-[#00E5A0] focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">通道</label>
          <select
            value={filterCriteria.channel ?? ''}
            onChange={(e) => setFilterCriteria({ channel: e.target.value || undefined })}
            className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1.5 focus:border-[#00E5A0] focus:outline-none transition-colors"
          >
            <option value="">全部通道</option>
            {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">机柜</label>
          <select
            value={filterCriteria.cabinet ?? ''}
            onChange={(e) => setFilterCriteria({ cabinet: e.target.value || undefined })}
            className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1.5 focus:border-[#00E5A0] focus:outline-none transition-colors"
          >
            <option value="">全部机柜</option>
            {CABINETS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">传感器类型</label>
          <select
            value={filterCriteria.sensorType ?? ''}
            onChange={(e) => setFilterCriteria({ sensorType: e.target.value || undefined })}
            className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1.5 focus:border-[#00E5A0] focus:outline-none transition-colors"
          >
            <option value="">全部类型</option>
            {SENSOR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <button
        onClick={applyFilters}
        className="w-full py-2 bg-[#00E5A0] text-gray-900 font-semibold rounded text-sm hover:bg-[#00c88a] transition-colors"
      >
        应用筛选
      </button>

      {activeTags.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">当前筛选口径</div>
          <div className="flex flex-wrap gap-1">
            {activeTags.map((tag) => (
              <span
                key={tag.key}
                className="inline-flex items-center gap-1 bg-cyan-900/40 text-cyan-300 text-xs px-2 py-0.5 rounded"
              >
                {tag.label}
                <button onClick={tag.clear} className="hover:text-white">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
