import { useAppStore } from '../store/useAppStore';
import { Settings, GitCompare, Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function ParamCompare() {
  const {
    parameterSets,
    activeParamSetId,
    compareMode,
    compareParamSetId,
    actions: { switchParamSet, setCompareMode, setCompareParamSet }
  } = useAppStore();

  const [activeDropdown, setActiveDropdown] = useState<'active' | 'compare' | null>(null);

  const activeParam = parameterSets.find(p => p.id === activeParamSetId);
  const compareParam = compareParamSetId ? parameterSets.find(p => p.id === compareParamSetId) : null;

  const handleSwitchActive = (id: string) => {
    switchParamSet(id);
    setActiveDropdown(null);
  };

  const handleSwitchCompare = (id: string) => {
    setCompareParamSet(id);
    setActiveDropdown(null);
  };

  const ParamCard = ({
    param,
    isActive,
    onSelect,
    isDropdownOpen,
    onDropdownToggle
  }: {
    param: typeof parameterSets[0] | undefined;
    isActive: boolean;
    onSelect: (id: string) => void;
    isDropdownOpen: boolean;
    onDropdownToggle: () => void;
  }) => {
    if (!param) return null;

    return (
      <div className={`relative rounded-xl border transition-all duration-300 ${
        isActive
          ? 'border-cyan-500/50 bg-cyan-500/5 shadow-lg shadow-cyan-500/10'
          : 'border-slate-700/50 bg-slate-800/30'
      }`}>
        <button
          onClick={onDropdownToggle}
          className="w-full p-3 flex items-center justify-between hover:bg-slate-700/20 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-2">
            <Settings className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
            <div className="text-left">
              <div className={`text-sm font-medium ${isActive ? 'text-cyan-200' : 'text-slate-200'}`}>
                {param.name}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                v{param.version}
              </div>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isDropdownOpen ? 'rotate-180' : ''
          }`} />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden">
            {parameterSets.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className={`w-full px-3 py-2.5 text-left hover:bg-slate-700/50 transition-colors flex items-center justify-between ${
                  p.id === param.id ? 'bg-slate-700/30' : ''
                }`}
              >
                <div>
                  <div className="text-sm text-slate-200">{p.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">v{p.version}</div>
                </div>
                {p.id === param.id && (
                  <Check className="w-4 h-4 text-cyan-400" />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="px-3 pb-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">基准内阻</span>
            <span className="text-slate-300 font-mono">{param.baseResistance} mΩ</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">温度系数</span>
            <span className="text-slate-300 font-mono">{param.temperatureCoefficient} mΩ/°C</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">容许误差</span>
            <span className="text-slate-300 font-mono">±{param.tolerance} mΩ</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Settings className="w-4 h-4 text-cyan-400" />
          参数版本
        </h3>
        <button
          onClick={() => setCompareMode(!compareMode)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
            compareMode
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'bg-slate-700/50 text-slate-400 hover:text-slate-300 hover:bg-slate-700'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          对照模式
        </button>
      </div>

      <div className={`grid gap-3 ${compareMode ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <ParamCard
          param={activeParam}
          isActive={true}
          onSelect={handleSwitchActive}
          isDropdownOpen={activeDropdown === 'active'}
          onDropdownToggle={() => setActiveDropdown(activeDropdown === 'active' ? null : 'active')}
        />

        {compareMode && (
          <ParamCard
            param={compareParam}
            isActive={false}
            onSelect={handleSwitchCompare}
            isDropdownOpen={activeDropdown === 'compare'}
            onDropdownToggle={() => setActiveDropdown(activeDropdown === 'compare' ? null : 'compare')}
          />
        )}
      </div>

      {compareMode && (
        <div className="text-center text-xs text-slate-500">
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">VS</span>
        </div>
      )}
    </div>
  );
}
