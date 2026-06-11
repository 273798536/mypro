import { useMemo } from 'react';
import {
  Eye,
  AlertTriangle,
  CheckCircle,
  Layers,
  Download,
  HelpCircle,
  BarChart3,
  Filter,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useDataStore } from '@/store/useDataStore';
import { ViewMode } from '@/types';
import { detectMixedUnits } from '@/utils/unit';

const viewModes: { mode: ViewMode; label: string; icon: typeof Eye; color: string }[] = [
  { mode: 'all', label: '全部', icon: Eye, color: 'text-tech-blue border-tech-blue/50 bg-tech-blue/20' },
  { mode: 'anomaly', label: '异常', icon: AlertTriangle, color: 'text-alert-red border-alert-red/50 bg-alert-red/20' },
  { mode: 'normal', label: '正常', icon: CheckCircle, color: 'text-success-green border-success-green/50 bg-success-green/20' },
  { mode: 'mixed', label: '混写', icon: Layers, color: 'text-warning-yellow border-warning-yellow/50 bg-warning-yellow/20' },
];

export default function Toolbar() {
  const { viewMode, setViewMode, toggleExportModal, toggleOpsGuide, filters, setFilters } = useAppStore();
  const { points } = useDataStore();

  const stats = useMemo(() => {
    const anomalyCount = points.filter(p => p.isAnomaly).length;
    const mixedRecords = detectMixedUnits(points);
    const mixedCount = mixedRecords.length;
    const pendingCount = points.filter(p => p.status === 'pending').length;
    const boomIds = [...new Set(points.map(p => p.boomId))].sort();
    return { anomalyCount, mixedCount, pendingCount, boomIds, total: points.length };
  }, [points]);

  const handleBoomFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFilters({ boomIds: value ? [value] : [] });
  };

  return (
    <header className="glass-card border-b border-border-glow/30 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-tech-blue" />
          <h1 className="text-lg font-bold text-text-primary tracking-wide">
            剧院吊杆阵列时序回放
          </h1>
        </div>

        <div className="h-6 w-px bg-border-glow/30 mx-2" />

        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted mr-2">视角</span>
          {viewModes.map(({ mode, label, icon: Icon, color }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                viewMode === mode
                  ? color
                  : 'text-text-secondary border-transparent hover:bg-white/5 hover:text-text-primary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Filter className="w-4 h-4 text-text-muted" />
          <select
            value={filters.boomIds[0] || ''}
            onChange={handleBoomFilterChange}
            className="text-sm py-1.5 px-3 w-32"
          >
            <option value="">全部吊杆</option>
            {stats.boomIds.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 text-xs">
          <div
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setViewMode('anomaly')}
          >
            <span className="w-2 h-2 rounded-full bg-alert-red anomaly-dot" />
            <span className="text-text-secondary">异常</span>
            <span className="font-mono text-alert-red font-semibold">{stats.anomalyCount}</span>
          </div>
          <div
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setViewMode('mixed')}
          >
            <span className="w-2 h-2 rounded-full bg-warning-yellow" />
            <span className="text-text-secondary">单位混写</span>
            <span className="font-mono text-warning-yellow font-semibold">{stats.mixedCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-info-purple" />
            <span className="text-text-secondary">待处理</span>
            <span className="font-mono text-info-purple font-semibold">{stats.pendingCount}</span>
          </div>
          <div className="h-4 w-px bg-border-glow/30" />
          <div className="text-text-muted">
            共 <span className="font-mono text-text-primary">{stats.total}</span> 条记录
          </div>
        </div>

        <div className="h-6 w-px bg-border-glow/30" />

        <button
          onClick={toggleOpsGuide}
          className="btn-ghost flex items-center gap-1.5 !py-1.5 !px-3"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="text-xs">运维指引</span>
        </button>

        <button
          onClick={toggleExportModal}
          className="btn-primary flex items-center gap-1.5 !py-1.5 !px-3"
        >
          <Download className="w-4 h-4" />
          <span className="text-xs">导出</span>
        </button>
      </div>
    </header>
  );
}
