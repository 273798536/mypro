import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Search, Check, X } from 'lucide-react';

export default function RegionFilter() {
  const { regions, filterRegions, setFilterRegions } = useStore();
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const regionNames = regions.map(r => r.region);
  const filtered = regionNames.filter(r => r.includes(search));

  const toggleRegion = (name: string) => {
    if (filterRegions.includes(name)) {
      setFilterRegions(filterRegions.filter(r => r !== name));
    } else {
      setFilterRegions([...filterRegions, name]);
    }
  };

  const selectAll = () => setFilterRegions([]);
  const clearAll = () => setFilterRegions(regionNames);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/60 transition-colors"
      >
        <Search size={14} />
        <span>筛选地区</span>
        {filterRegions.length > 0 && (
          <span className="bg-cyan-500/20 text-cyan-300 text-xs px-1.5 py-0.5 rounded-full">
            {filterRegions.length}/{regionNames.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-64 max-h-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-2 border-b border-slate-700/50">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索省份..."
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="flex gap-2 p-2 border-b border-slate-700/50">
            <button onClick={selectAll} className="flex-1 text-xs text-cyan-400 hover:text-cyan-300 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors">
              全选
            </button>
            <button onClick={clearAll} className="flex-1 text-xs text-slate-400 hover:text-slate-300 py-1 rounded bg-slate-700/50 hover:bg-slate-600/50 transition-colors">
              清空
            </button>
          </div>
          <div className="overflow-y-auto max-h-52 p-1">
            {filtered.map(name => {
              const isSelected = filterRegions.length === 0 || filterRegions.includes(name);
              return (
                <button
                  key={name}
                  onClick={() => toggleRegion(name)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    isSelected ? 'text-slate-200 bg-slate-700/30' : 'text-slate-500 hover:bg-slate-800/50'
                  }`}
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center ${
                    isSelected ? 'bg-cyan-500/30 border-cyan-500' : 'border-slate-600'
                  }`}>
                    {isSelected && <Check size={10} className="text-cyan-300" />}
                  </span>
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
