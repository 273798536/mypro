import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useDataStore } from '@/store/useDataStore';
import { getIssueTypeName, getFrequencyColor, getFrequencyName } from '@/engine/acoustics';
import type { IssueType, FrequencyBand } from '@/types/acoustics';
import { Filter, AlertTriangle, Eye, Zap, X } from 'lucide-react';

export const FilterPanel = () => {
  const {
    filters,
    validationResult,
    toggleFrequencyBand,
    toggleIssueType,
    setShowOnlyIssues,
    setSelectedSeatIds,
  } = useDataStore();

  const issueStats = validationResult?.issues || [];
  const issueCounts = {
    material_missing: issueStats.filter((i) => i.type === 'material_missing').length,
    seat_occluded: issueStats.filter((i) => i.type === 'seat_occluded').length,
    frequency_error: issueStats.filter((i) => i.type === 'frequency_error').length,
  };

  const issueButtons: { type: IssueType; label: string; icon: typeof AlertTriangle; color: string }[] = [
    { type: 'material_missing', label: '材料缺失', icon: AlertTriangle, color: '#f59e0b' },
    { type: 'seat_occluded', label: '座位遮挡', icon: Eye, color: '#ef4444' },
    { type: 'frequency_error', label: '频段错误', icon: Zap, color: '#8b5cf6' },
  ];

  return (
    <Panel title="问题筛选器" icon={<Filter size={14} />} className="mb-3">
      <div className="p-3 space-y-3">
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 font-medium">频段筛选</div>
          <div className="flex gap-2">
            {(['low', 'mid', 'high'] as FrequencyBand[]).map((band) => {
              const isActive = filters.frequencyBands.includes(band);
              return (
                <button
                  key={band}
                  onClick={() => toggleFrequencyBand(band)}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    isActive ? 'border-transparent' : 'border-zinc-700'
                  }`}
                  style={{
                    backgroundColor: isActive ? getFrequencyColor(band) + '20' : 'transparent',
                    color: isActive ? getFrequencyColor(band) : '#71717a',
                    borderColor: isActive ? getFrequencyColor(band) + '40' : undefined,
                  }}
                >
                  {getFrequencyName(band)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">问题类型</span>
            {filters.issueTypes.length > 0 && (
              <button
                onClick={() => {
                  filters.issueTypes.forEach((t) => toggleIssueType(t));
                }}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5"
              >
                <X size={10} /> 清除
              </button>
            )}
          </div>
          <div className="space-y-1">
            {issueButtons.map(({ type, label, icon: Icon, color }) => {
              const isActive = filters.issueTypes.includes(type);
              const count = issueCounts[type];
              return (
                <button
                  key={type}
                  onClick={() => toggleIssueType(type)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    isActive
                      ? 'bg-zinc-800'
                      : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{
                        backgroundColor: isActive ? color + '20' : '#27272a',
                        border: `1px solid ${isActive ? color + '50' : '#3f3f46'}`,
                      }}
                    >
                      <Icon size={12} style={{ color: isActive ? color : '#71717a' }} />
                    </div>
                    <span className={isActive ? 'text-zinc-200' : 'text-zinc-400'}>
                      {label}
                    </span>
                  </div>
                  {count > 0 && (
                    <Badge
                      size="sm"
                      variant={type === 'seat_occluded' ? 'danger' : 'warning'}
                    >
                      {count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800/50">
          <button
            onClick={() => setShowOnlyIssues(!filters.showOnlyIssues)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              filters.showOnlyIssues
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-zinc-800/50 text-zinc-400 border border-transparent hover:bg-zinc-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={12} />
              仅显示有问题的座位
            </div>
            <div
              className={`w-8 h-4 rounded-full transition-all relative ${
                filters.showOnlyIssues ? 'bg-red-500' : 'bg-zinc-600'
              }`}
            >
              <div
                className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${
                  filters.showOnlyIssues ? 'left-4' : 'left-0.5'
                }`}
              />
            </div>
          </button>
        </div>

        {filters.selectedSeatIds.length > 0 && (
          <div className="pt-2 border-t border-zinc-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400 font-medium">已选座位</span>
              <button
                onClick={() => setSelectedSeatIds([])}
                className="text-[10px] text-zinc-500 hover:text-zinc-300"
              >
                清除选择
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {filters.selectedSeatIds.slice(0, 6).map((id) => {
                const parts = id.split('_');
                const row = parseInt(parts[1]) + 1;
                const col = parseInt(parts[2]) + 1;
                return (
                  <Badge key={id} size="sm" variant="info">
                    {row}-{col}
                  </Badge>
                );
              })}
              {filters.selectedSeatIds.length > 6 && (
                <Badge size="sm">+{filters.selectedSeatIds.length - 6}</Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
};
