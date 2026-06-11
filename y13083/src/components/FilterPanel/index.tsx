import { useState } from 'react';
import { ChevronDown, Layers, Database, Box, Filter } from 'lucide-react';
import { useAppStore, getFilteredObjects } from '@/store/useAppStore';
import type { DataSource, HazardType } from '@/types';
import { cn } from '@/lib/utils';

const sourceMeta: Record<DataSource, { label: string; color: string }> = {
  cad_old: { label: 'CAD旧版', color: 'bg-slate-500 text-white border-slate-500' },
  normal: { label: '正常记录', color: 'bg-emerald-500 text-white border-emerald-500' },
  verbal: { label: '口头备注', color: 'bg-orange-500 text-white border-orange-500' },
};

const typeLabels: Record<HazardType, string> = {
  tank: '储罐',
  pipe: '管线',
  valve: '阀门',
  storage: '仓储区',
};

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Layers; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-slate-800">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-800/50 transition-colors">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-slate-200">{title}</span>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform duration-200', !open && '-rotate-90')} />
      </button>
      {open && <div className="px-4 pb-4 space-y-2">{children}</div>}
    </div>
  );
}

function SourcePill({ source }: { source: DataSource }) {
  const { filterState, toggleSource } = useAppStore();
  const active = filterState.sources.includes(source);
  return (
    <button onClick={() => toggleSource(source)} className={cn(
      'px-3 py-1 text-xs font-medium border transition-all',
      active ? sourceMeta[source].color : 'bg-transparent text-slate-400 border-slate-600 hover:border-slate-500 hover:text-slate-300'
    )}>{sourceMeta[source].label}</button>
  );
}

function TypePill({ type }: { type: HazardType }) {
  const { filterState, toggleType } = useAppStore();
  const active = filterState.types.includes(type);
  return (
    <button onClick={() => toggleType(type)} className={cn(
      'px-3 py-1 text-xs font-medium border transition-all',
      active ? 'bg-cyan-500 text-white border-cyan-500' : 'bg-transparent text-slate-400 border-slate-600 hover:border-slate-500 hover:text-slate-300'
    )}>{typeLabels[type]}</button>
  );
}

function Switch({ checked, onChange, color, label }: { checked: boolean; onChange: (v: boolean) => void; color: 'orange' | 'yellow'; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-slate-300">{label}</span>
      <button onClick={() => onChange(!checked)} className={cn(
        'relative w-10 h-5 border transition-colors',
        checked ? (color === 'orange' ? 'bg-orange-500' : 'bg-yellow-500') : 'bg-slate-700 border-slate-600'
      )}>
        <span className={cn('absolute top-0.5 w-4 h-4 bg-white transition-all duration-200', checked ? 'left-5' : 'left-0.5')} />
      </button>
    </label>
  );
}

export default function FilterPanel() {
  const { layers, objects, filterState, toggleLayer, setShowAbnormalOnly, setShowOverlappingOnly } = useAppStore();
  const visibleCount = getFilteredObjects(objects, layers, filterState).length;

  return (
    <div className="w-[320px] h-full bg-slate-900/90 backdrop-blur overflow-y-auto flex flex-col" style={{ borderRight: '1px solid #1e293b' }}>
      <div className="px-4 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">筛选条件</h2>
        </div>
      </div>

      <div className="flex-1">
        <Section title="CAD图层" icon={Layers}>
          <div className="space-y-1.5">
            {layers.map((layer) => (
              <label key={layer.id} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-slate-800/40 px-2 -mx-2 transition-colors">
                <input type="checkbox" checked={layer.visible} onChange={() => toggleLayer(layer.id)} className="w-4 h-4 accent-cyan-500 bg-slate-700 border-slate-600" />
                <span className="text-sm text-slate-300 flex-1">{layer.name}</span>
                {layer.isOldVersion && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-500/20 text-red-400 border border-red-500/40">旧版</span>
                )}
              </label>
            ))}
          </div>
        </Section>

        <Section title="数据来源" icon={Database}>
          <div className="flex flex-wrap gap-2">
            <SourcePill source="cad_old" />
            <SourcePill source="normal" />
            <SourcePill source="verbal" />
          </div>
        </Section>

        <Section title="对象类型" icon={Box}>
          <div className="flex flex-wrap gap-2">
            <TypePill type="tank" />
            <TypePill type="pipe" />
            <TypePill type="valve" />
            <TypePill type="storage" />
          </div>
        </Section>

        <Section title="快捷开关" icon={Filter}>
          <div className="space-y-3 pt-1">
            <Switch checked={filterState.showAbnormalOnly} onChange={setShowAbnormalOnly} color="orange" label="只看异常对象" />
            <Switch checked={filterState.showOverlappingOnly} onChange={setShowOverlappingOnly} color="yellow" label="只看重叠对象" />
          </div>
        </Section>
      </div>

      <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/95">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">当前可见</span>
          <span className="text-sm font-bold text-cyan-400">{visibleCount} 个对象</span>
        </div>
      </div>
    </div>
  );
}
