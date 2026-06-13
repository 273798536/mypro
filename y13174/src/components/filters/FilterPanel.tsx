import { useDeflectionStore } from '@/store/useDeflectionStore';
import { Filter, RotateCcw } from 'lucide-react';
import { STATUS_LABELS, DETECTION_TYPE_LABELS } from '@/types';
import type { FilterCriteria, RecordStatus, DetectionType } from '@/types';

export default function FilterPanel() {
  const filterCriteria = useDeflectionStore((s) => s.filterCriteria);
  const setFilterCriteria = useDeflectionStore((s) => s.setFilterCriteria);

  const handleChange = (key: keyof FilterCriteria, value: string) => {
    setFilterCriteria({ [key]: value } as Partial<FilterCriteria>);
  };

  const handleReset = () => {
    setFilterCriteria({
      dateFrom: '',
      dateTo: '',
      beamNumber: '',
      detectionType: '',
      status: '',
    });
  };

  const inputClass = "w-full bg-[#0f2440] border-2 border-[#2d5a8e] text-white text-sm px-3 py-2 focus:outline-none focus:border-[#5a9fd4] transition-colors";
  const labelClass = "block text-[#8ba7c7] text-xs font-medium mb-1.5";

  return (
    <div className="bg-[#1e3a5f] border-2 border-[#2d5a8e] p-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#2d5a8e]">
        <Filter className="w-4 h-4 text-[#5a9fd4]" />
        <h3 className="text-white font-semibold text-sm">筛选条件</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className={labelClass}>开始日期</label>
          <input
            type="date"
            value={filterCriteria.dateFrom}
            onChange={(e) => handleChange('dateFrom', e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>结束日期</label>
          <input
            type="date"
            value={filterCriteria.dateTo}
            onChange={(e) => handleChange('dateTo', e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>梁号</label>
          <input
            type="text"
            value={filterCriteria.beamNumber}
            onChange={(e) => handleChange('beamNumber', e.target.value)}
            placeholder="输入梁号"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>检测类型</label>
          <select
            value={filterCriteria.detectionType}
            onChange={(e) => handleChange('detectionType', e.target.value)}
            className={inputClass}
          >
            <option value="">全部类型</option>
            {Object.entries(DETECTION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>状态</label>
          <select
            value={filterCriteria.status}
            onChange={(e) => handleChange('status', e.target.value as RecordStatus | '')}
            className={inputClass}
          >
            <option value="">全部状态</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-2 bg-[#2d5a8e]/30 hover:bg-[#2d5a8e]/50 text-[#8ba7c7] hover:text-white text-sm py-2 border-2 border-[#2d5a8e] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          重置筛选
        </button>
      </div>
    </div>
  );
}
