import { ChevronDown, ChevronRight, AlertTriangle, Activity, Ship, Fish, Droplets, Radio } from 'lucide-react';
import { useState } from 'react';
import { useDataStore, useProcessStore, useSceneStore } from '@/stores';
import { getRiskColor, getRiskLabel, formatTime } from '@/utils/geo';
import { cn } from '@/lib/utils';

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, icon, defaultOpen = true, children }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-700/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-800/50 transition-colors"
      >
        {isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
        <span className="text-slate-300">{icon}</span>
        <span className="text-sm font-medium text-slate-200">{title}</span>
      </button>
      {isOpen && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

function RiskNoticeList() {
  const { riskNotices, selectedRiskNoticeId, setSelectedRiskNotice } = useDataStore();

  return (
    <div className="space-y-2">
      {riskNotices.map((notice) => (
        <div
          key={notice.id}
          onClick={() => setSelectedRiskNotice(selectedRiskNoticeId === notice.id ? null : notice.id)}
          className={cn(
            'p-3 rounded-lg cursor-pointer transition-all',
            'border border-slate-700 hover:border-cyan-500/50',
            selectedRiskNoticeId === notice.id
              ? 'bg-cyan-900/30 border-cyan-500'
              : 'bg-slate-800/50 hover:bg-slate-800'
          )}
        >
          <div className="flex items-start gap-2">
            <div
              className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: getRiskColor(notice.severity) }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-100 truncate">{notice.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatTime(notice.noticeTime)} · {getRiskLabel(notice.severity)}风险
              </p>
            </div>
          </div>
          {selectedRiskNoticeId === notice.id && (
            <div className="mt-2 pt-2 border-t border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">处理意见：</p>
              <p className="text-xs text-slate-300 leading-relaxed">{notice.handlingOpinion}</p>
              <p className="text-xs text-slate-500 mt-2">来源：{notice.source}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BuoyStatusList() {
  const { buoys } = useDataStore();
  const { filters, toggleFilter } = useSceneStore();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">共 {buoys.length} 个浮标</span>
        <button
          onClick={() => toggleFilter('showBuoys')}
          className={cn(
            'text-xs px-2 py-1 rounded transition-colors',
            filters.showBuoys
              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
              : 'bg-slate-700 text-slate-400 border border-slate-600'
          )}
        >
          {filters.showBuoys ? '显示中' : '已隐藏'}
        </button>
      </div>
      {buoys.map((buoy) => (
        <div
          key={buoy.id}
          className={cn(
            'p-2 rounded-lg border flex items-center gap-2',
            buoy.isOffline
              ? 'bg-red-900/20 border-red-800/50'
              : 'bg-slate-800/30 border-slate-700/50'
          )}
        >
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              buoy.isOffline ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
            )}
          />
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-200">{buoy.buoyId}</p>
            <p className="text-xs text-slate-400">
              油膜厚度: {buoy.oilThickness.toFixed(2)} mm
            </p>
          </div>
          {buoy.isOffline && (
            <span className="text-xs text-red-400 font-medium">离线</span>
          )}
        </div>
      ))}
    </div>
  );
}

function DataSourceSummary() {
  const { shipTracks, aquacultureLogs, salinityDataList } = useDataStore();
  const { filters, toggleFilter } = useSceneStore();
  const { getAllDataGaps, getAllAnomalies } = useProcessStore();

  const sources = [
    { key: 'showShips', label: '船舶轨迹', count: shipTracks.length, icon: <Ship size={14} /> },
    { key: 'showFarms', label: '养殖日志', count: aquacultureLogs.length, icon: <Fish size={14} /> },
    { key: 'showStations', label: '盐度监测', count: salinityDataList.length, icon: <Droplets size={14} /> },
    { key: 'showAnomalies', label: '异常点', count: getAllAnomalies().length, icon: <AlertTriangle size={14} /> },
  ];

  return (
    <div className="space-y-2">
      {sources.map((src) => (
        <button
          key={src.key}
          onClick={() => toggleFilter(src.key as keyof typeof filters)}
          className={cn(
            'w-full flex items-center gap-2 p-2 rounded-lg border transition-all text-left',
            filters[src.key as keyof typeof filters] as boolean
              ? 'bg-cyan-900/20 border-cyan-700/50 text-cyan-200'
              : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:bg-slate-800/50'
          )}
        >
          <span className="text-slate-400">{src.icon}</span>
          <span className="text-xs flex-1">{src.label}</span>
          <span className="text-xs font-mono bg-slate-700/50 px-1.5 py-0.5 rounded">
            {src.count}
          </span>
        </button>
      ))}

      {getAllDataGaps().length > 0 && (
        <div className="mt-3 p-2 rounded-lg bg-amber-900/20 border border-amber-700/50">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle size={14} />
            <span className="text-xs font-medium">数据缺口: {getAllDataGaps().length} 项</span>
          </div>
          <p className="text-xs text-amber-300/70 mt-1">部分数据缺失，结论仅供参考</p>
        </div>
      )}
    </div>
  );
}

function FilterPanel() {
  const { filters, toggleFilter } = useSceneStore();
  const levels = [
    { key: 'critical', label: '极高', color: 'bg-red-500' },
    { key: 'high', label: '高', color: 'bg-orange-500' },
    { key: 'medium', label: '中', color: 'bg-amber-500' },
    { key: 'low', label: '低', color: 'bg-emerald-500' },
  ];

  return (
    <div>
      <p className="text-xs text-slate-400 mb-2">风险等级筛选</p>
      <div className="flex flex-wrap gap-1.5">
        {levels.map((level) => (
          <button
            key={level.key}
            onClick={() => toggleFilter('riskLevels', level.key)}
            className={cn(
              'px-2 py-1 rounded text-xs flex items-center gap-1.5 border transition-all',
              filters.riskLevels.includes(level.key)
                ? 'border-slate-500 bg-slate-700 text-slate-200'
                : 'border-slate-700 bg-slate-800/50 text-slate-500'
            )}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${level.color}`} />
            {level.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LeftPanel() {
  return (
    <div className="w-72 h-full bg-slate-900/90 backdrop-blur-sm border-r border-slate-700/50 flex flex-col overflow-hidden">
      <div className="px-4 py-4 border-b border-slate-700/50">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Activity size={18} className="text-cyan-400" />
          海面溢油扩散复盘
        </h2>
        <p className="text-xs text-slate-500 mt-1">大亚湾 6·15 溢油事件</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Section title="风险通报" icon={<AlertTriangle size={16} className="text-orange-400" />}>
          <RiskNoticeList />
        </Section>

        <Section title="浮标状态" icon={<Radio size={16} className="text-emerald-400" />} defaultOpen={true}>
          <BuoyStatusList />
        </Section>

        <Section title="数据源" icon={<Activity size={16} className="text-cyan-400" />} defaultOpen={true}>
          <DataSourceSummary />
        </Section>

        <Section title="筛选设置" icon={<Activity size={16} className="text-purple-400" />} defaultOpen={false}>
          <FilterPanel />
        </Section>
      </div>

      <div className="px-4 py-3 border-t border-slate-700/50">
        <button className="w-full py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors">
          导入数据
        </button>
      </div>
    </div>
  );
}
