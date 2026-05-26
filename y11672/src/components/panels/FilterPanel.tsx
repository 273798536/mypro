import { useState } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useYardStore } from '../../store/useYardStore';

export function FilterPanel() {
  const [isExpanded, setIsExpanded] = useState(true);
  const { filters, setFilters, resetFilters, containers } = useYardStore();
  
  const bays = Array.from(new Set(containers.map(c => c.bay))).sort((a, b) => a - b);
  const rows = Array.from(new Set(containers.map(c => c.row))).sort((a, b) => a - b);
  const dangerousLevels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const statuses = ['pending', 'ready', 'completed', 'expired'];
  
  const statusLabels: Record<string, string> = {
    pending: '待处理',
    ready: '就绪',
    completed: '已完成',
    expired: '已过期'
  };
  
  const dangerousLabels: Record<number, string> = {
    0: '非危险品',
    1: '爆炸品',
    2: '气体',
    3: '易燃液体',
    4: '易燃固体',
    5: '氧化剂',
    6: '毒性物质',
    7: '放射性物质',
    8: '腐蚀品',
    9: '杂类'
  };
  
  const toggleDangerousLevel = (level: number) => {
    const current = filters.dangerousLevel;
    if (current.includes(level)) {
      setFilters({ dangerousLevel: current.filter(l => l !== level) });
    } else {
      setFilters({ dangerousLevel: [...current, level] });
    }
  };
  
  const toggleStatus = (status: string) => {
    const current = filters.status;
    if (current.includes(status)) {
      setFilters({ status: current.filter(s => s !== status) });
    } else {
      setFilters({ status: [...current, status] });
    }
  };
  
  return (
    <div className="w-72 bg-industrial-darker border-l border-industrial-gray/30 h-full overflow-hidden flex flex-col">
      <div 
        className="p-3 border-b border-industrial-gray/30 cursor-pointer flex items-center justify-between hover:bg-industrial-dark/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-industrial-blue" />
          <span className="font-medium text-industrial-light">筛选条件</span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>
      
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div>
            <label className="block text-xs text-industrial-gray mb-1">箱号搜索</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-industrial-gray" />
              <input
                type="text"
                value={filters.containerId}
                onChange={(e) => setFilters({ containerId: e.target.value })}
                placeholder="输入箱号..."
                className="w-full bg-industrial-dark border border-industrial-gray/30 rounded px-7 py-1.5 text-sm text-industrial-light placeholder-industrial-gray/50 focus:outline-none focus:border-industrial-blue"
              />
              {filters.containerId && (
                <button
                  onClick={() => setFilters({ containerId: '' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3 h-3 text-industrial-gray hover:text-industrial-light" />
                </button>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-industrial-gray mb-2">贝位 (Bay)</label>
            <select
              value={filters.bay ?? ''}
              onChange={(e) => setFilters({ bay: e.target.value ? Number(e.target.value) : null })}
              className="w-full bg-industrial-dark border border-industrial-gray/30 rounded px-2 py-1.5 text-sm text-industrial-light focus:outline-none focus:border-industrial-blue"
            >
              <option value="">全部贝位</option>
              {bays.map(bay => (
                <option key={bay} value={bay}>{bay} 贝</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-industrial-gray mb-2">排 (Row)</label>
            <select
              value={filters.row ?? ''}
              onChange={(e) => setFilters({ row: e.target.value ? Number(e.target.value) : null })}
              className="w-full bg-industrial-dark border border-industrial-gray/30 rounded px-2 py-1.5 text-sm text-industrial-light focus:outline-none focus:border-industrial-blue"
            >
              <option value="">全部排</option>
              {rows.map(row => (
                <option key={row} value={row}>{row} 排</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-industrial-gray mb-2">危险品等级</label>
            <div className="grid grid-cols-2 gap-1">
              {dangerousLevels.map(level => (
                <button
                  key={level}
                  onClick={() => toggleDangerousLevel(level)}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    filters.dangerousLevel.includes(level)
                      ? level === 0
                        ? 'bg-industrial-green/20 border-industrial-green text-industrial-green'
                        : 'bg-industrial-red/20 border-industrial-red text-industrial-red'
                      : 'bg-industrial-dark border-industrial-gray/30 text-industrial-gray hover:border-industrial-blue'
                  }`}
                >
                  {level}: {dangerousLabels[level]}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-industrial-gray mb-1">预约车次</label>
            <input
              type="text"
              value={filters.trainId}
              onChange={(e) => setFilters({ trainId: e.target.value })}
              placeholder="TRAIN-001..."
              className="w-full bg-industrial-dark border border-industrial-gray/30 rounded px-2 py-1.5 text-sm text-industrial-light placeholder-industrial-gray/50 focus:outline-none focus:border-industrial-blue"
            />
          </div>
          
          <div>
            <label className="block text-xs text-industrial-gray mb-2">预约状态</label>
            <div className="flex flex-wrap gap-1">
              {statuses.map(status => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    filters.status.includes(status)
                      ? 'bg-industrial-blue/20 border-industrial-blue text-industrial-blue'
                      : 'bg-industrial-dark border-industrial-gray/30 text-industrial-gray hover:border-industrial-blue'
                  }`}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={resetFilters}
            className="w-full mt-4 py-2 text-sm bg-industrial-red/20 text-industrial-red border border-industrial-red/30 rounded hover:bg-industrial-red/30 transition-colors"
          >
            重置筛选
          </button>
        </div>
      )}
    </div>
  );
}
