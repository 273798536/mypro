import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import type { PartSystem, PartStatus } from '@/types';
import { useReactorStore } from '@/store/useReactorStore';
import { fmtStatus } from '@/utils/format';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const systems: { value: PartSystem; label: string }[] = [
  { value: 'stirring', label: '搅拌系统' },
  { value: 'heating', label: '加热系统' },
  { value: 'sealing', label: '密封系统' },
  { value: 'temp', label: '测温系统' },
  { value: 'vessel', label: '釜体' },
  { value: 'motor', label: '电机' },
];

const statuses: { value: 'all' | PartStatus; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'normal', label: '正常' },
  { value: 'warning', label: '预警' },
  { value: 'danger', label: '故障' },
];

const systemBadgeVariant: Record<PartSystem, 'default' | 'orange' | 'green' | 'red' | 'yellow'> = {
  stirring: 'orange',
  heating: 'red',
  sealing: 'green',
  temp: 'yellow',
  vessel: 'default',
  motor: 'orange',
};

const statusBadgeVariant: Record<PartStatus, 'default' | 'orange' | 'green' | 'red' | 'yellow'> = {
  normal: 'green',
  warning: 'yellow',
  danger: 'red',
};

export default function PartFilter() {
  const parts = useReactorStore((s) => s.parts);
  const selectedPartId = useReactorStore((s) => s.selectedPartId);
  const selectPart = useReactorStore((s) => s.selectPart);

  const [selectedSystems, setSelectedSystems] = useState<Set<PartSystem>>(new Set());
  const [selectedStatus, setSelectedStatus] = useState<'all' | PartStatus>('all');
  const [searchText, setSearchText] = useState('');

  const toggleSystem = (sys: PartSystem) => {
    const next = new Set(selectedSystems);
    if (next.has(sys)) {
      next.delete(sys);
    } else {
      next.add(sys);
    }
    setSelectedSystems(next);
  };

  const filteredParts = useMemo(() => {
    return parts.filter((p) => {
      if (selectedSystems.size > 0 && !selectedSystems.has(p.system)) return false;
      if (selectedStatus !== 'all' && p.status !== selectedStatus) return false;
      if (searchText.trim() && !p.name.toLowerCase().includes(searchText.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [parts, selectedSystems, selectedStatus, searchText]);

  return (
    <div className="glass w-72 h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white mb-3">部件筛选</h3>

        <div className="mb-4">
          <label className="text-xs text-steel-300 block mb-2">按系统</label>
          <div className="grid grid-cols-2 gap-2">
            {systems.map((sys) => (
              <label key={sys.value} className="flex items-center gap-2 text-sm text-steel-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSystems.has(sys.value)}
                  onChange={() => toggleSystem(sys.value)}
                  className="accent-orange-500"
                />
                <span>{sys.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-steel-300 block mb-2">按状态</label>
          <div className="flex gap-1 flex-wrap">
            {statuses.map((st) => (
              <button
                key={st.value}
                onClick={() => setSelectedStatus(st.value)}
                className={cn(
                  'text-xs px-3 py-1 rounded transition-colors',
                  selectedStatus === st.value
                    ? 'bg-accent-orange text-white'
                    : 'bg-white/5 text-steel-100 hover:bg-white/10'
                )}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-steel-300 block mb-2">搜索部件</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-300" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="输入部件名称..."
              className="w-full bg-white/5 border border-white/10 rounded pl-8 pr-3 py-2 text-sm text-white placeholder:text-steel-300 focus:outline-none focus:border-accent-orange/50"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-2">
        {filteredParts.length === 0 ? (
          <p className="text-sm text-steel-300 text-center py-8">无匹配部件</p>
        ) : (
          <ul className="space-y-1">
            {filteredParts.map((p) => {
              const statusFmt = fmtStatus(p.status);
              return (
                <li key={p.id}>
                  <button
                    onClick={() => selectPart(p.id)}
                    className={cn(
                      'w-full text-left p-3 rounded transition-colors',
                      selectedPartId === p.id
                        ? 'bg-accent-orange/15 border border-accent-orange/30'
                        : 'hover:bg-white/5 border border-transparent'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-white truncate">{p.name}</span>
                      <Badge variant={statusBadgeVariant[p.status]}>{statusFmt.label}</Badge>
                    </div>
                    <Badge variant={systemBadgeVariant[p.system]} className="text-[10px]">
                      {systems.find((s) => s.value === p.system)?.label}
                    </Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
