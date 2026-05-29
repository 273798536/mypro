import { Filter, Calendar, Building2, MapPin, RotateCcw } from 'lucide-react';
import { useParkingStore } from '../store/useParkingStore';
import { useParkingData } from '../hooks/useParkingData';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { DateType } from '../types/parking';

export function FilterToolbar() {
  const { filters, currentRecord, setDateTypeFilter, toggleFloorFilter, toggleEntranceFilter, clearFilters } = useParkingStore();
  const { currentScenario } = useParkingData();

  const dateTypeOptions: Array<{ value: DateType | 'all'; label: string }> = [
    { value: 'all', label: '全部' },
    { value: 'workday', label: '工作日' },
    { value: 'weekend', label: '周末' },
    { value: 'event', label: '活动日' },
  ];

  const floorOptions = [0, 1, 2, 3];
  const entranceOptions = currentRecord?.entrances.map(e => e.entranceName) || ['东入口', '西入口', '南入口', '北入口'];

  const activeFilterCount = 
    (filters.dateType !== 'all' ? 1 : 0) +
    (filters.selectedFloors.length < 4 ? 1 : 0) +
    (filters.selectedEntrances.length > 0 && filters.selectedEntrances.length < entranceOptions.length ? 1 : 0);

  return (
    <div className="bg-parking-panel backdrop-blur-xl border-b border-parking-border px-6 py-3">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-cyan-400" />
          <span className="text-sm font-medium text-cyan-300">筛选条件</span>
          {activeFilterCount > 0 && (
            <Badge variant="info" size="sm">{activeFilterCount} 个筛选</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          <span className="text-xs text-slate-400">日期类型:</span>
          <div className="flex gap-1">
            {dateTypeOptions.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={filters.dateType === option.value ? 'primary' : 'ghost'}
                onClick={() => setDateTypeFilter(option.value)}
                active={filters.dateType === option.value}
                className="px-2.5"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="h-6 w-px bg-slate-700" />

        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-slate-400" />
          <span className="text-xs text-slate-400">楼层:</span>
          <div className="flex gap-1">
            {floorOptions.map((floor) => (
              <Button
                key={floor}
                size="sm"
                variant={filters.selectedFloors.includes(floor) ? 'primary' : 'ghost'}
                onClick={() => toggleFloorFilter(floor)}
                active={filters.selectedFloors.includes(floor)}
                className="px-2.5"
              >
                B{floor + 1}
              </Button>
            ))}
          </div>
        </div>

        <div className="h-6 w-px bg-slate-700" />

        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-slate-400" />
          <span className="text-xs text-slate-400">入口:</span>
          <div className="flex gap-1">
            {entranceOptions.map((entrance) => (
              <Button
                key={entrance}
                size="sm"
                variant={
                  filters.selectedEntrances.length === 0 || filters.selectedEntrances.includes(entrance)
                    ? 'primary'
                    : 'ghost'
                }
                onClick={() => toggleEntranceFilter(entrance)}
                active={filters.selectedEntrances.length === 0 || filters.selectedEntrances.includes(entrance)}
                className="px-2.5"
              >
                {entrance.replace('入口', '')}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        {currentScenario && (
          <Badge variant="info">
            当前场景: {currentScenario.name}
          </Badge>
        )}

        {activeFilterCount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={clearFilters}
            className="gap-1"
          >
            <RotateCcw size={14} />
            重置筛选
          </Button>
        )}
      </div>
    </div>
  );
}
