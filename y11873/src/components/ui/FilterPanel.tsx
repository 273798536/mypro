import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useStore } from '@/store/useStore';

const supplyTypeColors: Record<string, string> = {
  '沙袋': '#8B7355',
  '救生衣': '#FF6B35',
  '帐篷': '#4ECDC4',
  '食品': '#00D68F',
  '饮用水': '#5B9BD5',
  '医疗物资': '#E91E63',
  '发电机': '#FFC107',
  '照明设备': '#9C27B0',
};

const warehouseStatusConfig = {
  normal: { label: '正常', color: '#00d68f', bg: 'bg-[#00d68f]/15', text: 'text-[#00d68f]' },
  isolated: { label: '孤立', color: '#ff6b35', bg: 'bg-[#ff6b35]/15', text: 'text-[#ff6b35]' },
  overloaded: { label: '过载', color: '#ef4444', bg: 'bg-[#ef4444]/15', text: 'text-[#ef4444]' },
};

const roadStatusConfig = {
  open: { label: '畅通', color: '#5b9bd5', bg: 'bg-[#5b9bd5]/15', text: 'text-[#5b9bd5]' },
  interrupted: { label: '中断', color: '#ff6b35', bg: 'bg-[#ff6b35]/15', text: 'text-[#ff6b35]' },
  slope_limited: { label: '限行', color: '#ffc107', bg: 'bg-[#ffc107]/15', text: 'text-[#ffc107]' },
};

function ToggleSwitch({
  enabled,
  onToggle,
  color,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  color: string;
  label: string;
}) {
  return (
    <button
      className="flex items-center justify-between w-full py-1.5 group"
      onClick={onToggle}
    >
      <span className="text-sm text-[#e8eaed] group-hover:text-white transition-colors">{label}</span>
      <div className="relative w-9 h-5 rounded-full transition-colors" style={{ backgroundColor: enabled ? color : '#2e3548' }}>
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
          style={{ transform: enabled ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </div>
    </button>
  );
}

export default function FilterPanel() {
  const { warehouses, filters, leftPanelOpen, setFilters, toggleLeftPanel } = useStore();

  const supplyTypes = useMemo(() => {
    const typeMap = new Map<string, number>();
    warehouses.forEach((w) =>
      w.supplies.forEach((s) => {
        typeMap.set(s.type, (typeMap.get(s.type) || 0) + 1);
      })
    );
    return Array.from(typeMap.entries()).map(([type, count]) => ({
      type,
      count,
      color: supplyTypeColors[type] || '#8b8fa3',
    }));
  }, [warehouses]);

  const toggleSupplyType = (type: string) => {
    const current = filters.supplyTypes;
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setFilters({ ...filters, supplyTypes: next });
  };

  const toggleWarehouseStatus = (status: 'normal' | 'isolated' | 'overloaded') => {
    const current = filters.warehouseStatuses;
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    setFilters({ ...filters, warehouseStatuses: next });
  };

  const toggleRoadStatus = (status: 'open' | 'interrupted' | 'slope_limited') => {
    const current = filters.roadStatuses;
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    setFilters({ ...filters, roadStatuses: next });
  };

  const resetFilters = () => {
    setFilters({
      supplyTypes: [],
      warehouseStatuses: ['normal', 'isolated', 'overloaded'],
      roadStatuses: ['open', 'interrupted', 'slope_limited'],
    });
  };

  if (!leftPanelOpen) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 px-2 bg-[#242938]/80 backdrop-blur-md border-r border-[#2e3548]">
        <button
          className="p-2 rounded-lg hover:bg-white/5 text-[#8b8fa3] hover:text-[#e8eaed] transition-colors"
          onClick={toggleLeftPanel}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="w-8 h-px bg-[#2e3548]" />
        <div className="flex flex-col gap-2" title="物资类型">
          <div className="w-5 h-5 rounded-full bg-[#4ECDC4]/20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#4ECDC4]" />
          </div>
        </div>
        <div className="flex flex-col gap-2" title="仓库状态">
          <div className="w-5 h-5 rounded-full bg-[#00d68f]/20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#00d68f]" />
          </div>
        </div>
        <div className="flex flex-col gap-2" title="道路状态">
          <div className="w-5 h-5 rounded-full bg-[#5b9bd5]/20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#5b9bd5]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[280px] flex flex-col bg-[#242938]/80 backdrop-blur-md border-r border-[#2e3548] h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2e3548]">
        <h2 className="text-base font-semibold text-[#e8eaed] font-['Rajdhani'] tracking-wide">
          筛选控制
        </h2>
        <button
          className="p-1.5 rounded-lg hover:bg-white/5 text-[#8b8fa3] hover:text-[#e8eaed] transition-colors"
          onClick={toggleLeftPanel}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-[#8b8fa3] uppercase tracking-wider mb-2 font-['Rajdhani']">
            物资类型
          </h3>
          <div className="space-y-1">
            {supplyTypes.map(({ type, count, color }) => (
              <label
                key={type}
                className="flex items-center gap-2.5 py-1 px-2 rounded-md hover:bg-white/5 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={filters.supplyTypes.includes(type)}
                  onChange={() => toggleSupplyType(type)}
                />
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    filters.supplyTypes.includes(type)
                      ? 'border-transparent'
                      : 'border-[#2e3548]'
                  }`}
                  style={{
                    backgroundColor: filters.supplyTypes.includes(type) ? color : 'transparent',
                  }}
                >
                  {filters.supplyTypes.includes(type) && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-[#e8eaed] flex-1">{type}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-[#8b8fa3] font-medium">
                  {count}
                </span>
              </label>
            ))}
            {supplyTypes.length === 0 && (
              <p className="text-xs text-[#8b8fa3] py-2 px-2">暂无物资数据</p>
            )}
          </div>
        </div>

        <div className="border-t border-[#2e3548]" />

        <div>
          <h3 className="text-xs font-semibold text-[#8b8fa3] uppercase tracking-wider mb-2 font-['Rajdhani']">
            仓库状态
          </h3>
          <div className="space-y-0.5">
            {(Object.keys(warehouseStatusConfig) as Array<'normal' | 'isolated' | 'overloaded'>).map(
              (status) => {
                const config = warehouseStatusConfig[status];
                return (
                  <ToggleSwitch
                    key={status}
                    enabled={filters.warehouseStatuses.includes(status)}
                    onToggle={() => toggleWarehouseStatus(status)}
                    color={config.color}
                    label={config.label}
                  />
                );
              }
            )}
          </div>
        </div>

        <div className="border-t border-[#2e3548]" />

        <div>
          <h3 className="text-xs font-semibold text-[#8b8fa3] uppercase tracking-wider mb-2 font-['Rajdhani']">
            道路状态
          </h3>
          <div className="space-y-0.5">
            {(Object.keys(roadStatusConfig) as Array<'open' | 'interrupted' | 'slope_limited'>).map(
              (status) => {
                const config = roadStatusConfig[status];
                return (
                  <ToggleSwitch
                    key={status}
                    enabled={filters.roadStatuses.includes(status)}
                    onToggle={() => toggleRoadStatus(status)}
                    color={config.color}
                    label={config.label}
                  />
                );
              }
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-[#2e3548]">
        <button
          className="w-full py-2 px-3 rounded-lg border border-[#2e3548] text-sm text-[#8b8fa3] hover:text-[#e8eaed] hover:border-[#8b8fa3]/50 flex items-center justify-center gap-2 transition-colors"
          onClick={resetFilters}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          重置
        </button>
      </div>
    </div>
  );
}
