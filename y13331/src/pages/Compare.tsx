import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useVersionStore } from '@/store/useVersionStore';
import RadarCompare from '@/components/Chart/RadarCompare';
import BarCompare from '@/components/Chart/BarCompare';
import MetricCard from '@/components/MetricCard';
import LeakSection from '@/components/Alert/LeakSection';
import JsonViewerModal from '@/components/Modal/JsonViewerModal';
import type { Sample, Metric } from '@/types';
import { GitCompare, ChevronDown, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/helpers';

export default function Compare() {
  const navigate = useNavigate();
  const params = useParams<{ baseVersion?: string; targetVersion?: string }>();
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [showVersionDropdown, setShowVersionDropdown] = useState<'base' | 'target' | null>(null);

  const {
    versions,
    selectedBaseVersionId,
    selectedTargetVersionId,
    setSelectedBaseVersion,
    setSelectedTargetVersion,
    toggleLeakStatus,
  } = useVersionStore();

  const baseId = params.baseVersion || selectedBaseVersionId;
  const targetId = params.targetVersion || selectedTargetVersionId;

  const baseVersion = versions.find((v) => v.id === baseId) || versions[1];
  const targetVersion = versions.find((v) => v.id === targetId) || versions[0];

  const handleVersionSelect = (type: 'base' | 'target', id: string) => {
    if (type === 'base') {
      setSelectedBaseVersion(id);
      navigate(`/compare/${id}/${selectedTargetVersionId}`);
    } else {
      setSelectedTargetVersion(id);
      navigate(`/compare/${selectedBaseVersionId}/${id}`);
    }
    setShowVersionDropdown(null);
  };

  const handleMetricClick = (metric: Metric) => {
    if (metric.isAbnormal) {
      navigate(`/versions/${targetVersion.id}`);
    }
  };

  const handleToggleLeak = (sampleId: string, reason?: string) => {
    toggleLeakStatus(targetVersion.id, sampleId, reason);
  };

  const VersionSelector = ({
    type,
    version,
    color,
  }: {
    type: 'base' | 'target';
    version: typeof baseVersion;
    color: string;
  }) => (
    <div className="relative">
      <button
        onClick={() => setShowVersionDropdown(showVersionDropdown === type ? null : type)}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg border transition-all',
          'hover:border-accent-blue/50',
          color === 'blue'
            ? 'bg-accent-blue/5 border-accent-blue/30'
            : 'bg-accent-green/5 border-accent-green/30'
        )}
      >
        <div
          className={cn(
            'w-3 h-3 rounded-full',
            color === 'blue' ? 'bg-accent-blue' : 'bg-accent-green'
          )}
        />
        <div className="text-left">
          <p className="text-xs text-gray-400">
            {type === 'base' ? '基准版本' : '对比版本'}
          </p>
          <p
            className={cn(
              'font-display font-semibold',
              color === 'blue' ? 'text-accent-blue' : 'text-accent-green'
            )}
          >
            {version.versionNumber}
          </p>
        </div>
        <ChevronDown size={16} className="text-gray-400" />
      </button>

      {showVersionDropdown === type && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-bg-secondary border border-border-color rounded-lg shadow-xl z-10 overflow-hidden">
          {versions.map((v) => (
            <button
              key={v.id}
              onClick={() => handleVersionSelect(type, v.id)}
              className={cn(
                'w-full px-4 py-3 text-left hover:bg-bg-tertiary transition-colors border-b border-border-color/50 last:border-0',
                v.id === version.id && 'bg-bg-tertiary'
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'font-display font-medium',
                    v.status === 'withdrawn'
                      ? 'text-gray-500 line-through'
                      : 'text-white'
                  )}
                >
                  {v.versionNumber}
                </span>
                <span className="text-xs text-gray-500">{v.createdAt.split(' ')[0]}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{v.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="animate-fade-in"
      onClick={() => setShowVersionDropdown(null)}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <GitCompare size={28} className="text-accent-blue" />
            灰度对比
          </h1>
          <p className="text-gray-400">选择两个版本进行多维度属性对比分析</p>
        </div>

        <div className="flex items-center gap-4">
          <VersionSelector type="base" version={baseVersion} color="blue" />
          <ArrowRight size={20} className="text-gray-500" />
          <VersionSelector type="target" version={targetVersion} color="green" />
        </div>
      </div>

      <div className="grid grid-cols-8 gap-4 mb-8">
        {targetVersion.metrics.map((targetMetric) => {
          const baseMetric = baseVersion.metrics.find(
            (m) => m.name === targetMetric.name
          );
          const metric = {
            ...targetMetric,
            delta: baseMetric ? targetMetric.value - baseMetric.value : 0,
          };
          return (
            <div
              key={metric.id}
              className="cursor-pointer"
              onClick={() => handleMetricClick(metric)}
            >
              <MetricCard metric={metric} size="sm" />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <RadarCompare
          baseVersion={baseVersion}
          targetVersion={targetVersion}
          onMetricClick={handleMetricClick}
        />
        <BarCompare baseVersion={baseVersion} targetVersion={targetVersion} />
      </div>

      <div className="mb-8">
        <h2 className="font-display text-xl font-semibold text-white mb-4">双版本指标详情</h2>
        <div className="grid grid-cols-2 gap-6">
          <div
            className={cn(
              'bg-bg-secondary rounded-lg border p-6',
              baseVersion.status === 'withdrawn'
                ? 'border-gray-500/30 opacity-60'
                : 'border-accent-blue/30 glow-border'
            )}
          >
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border-color">
              <div className="w-3 h-3 rounded-full bg-accent-blue" />
              <div>
                <h3 className="font-display font-semibold text-white">
                  {baseVersion.versionNumber}
                </h3>
                <p className="text-xs text-gray-400">{baseVersion.description}</p>
              </div>
            </div>
            <div className="space-y-3">
              {baseVersion.metrics.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2 border-b border-border-color/30 last:border-0"
                >
                  <span className="text-sm text-gray-300">{m.name}</span>
                  <span className="font-mono text-white">{m.value}%</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className={cn(
              'bg-bg-secondary rounded-lg border p-6',
              targetVersion.status === 'withdrawn'
                ? 'border-gray-500/30 opacity-60'
                : 'border-accent-green/30 glow-border-green'
            )}
          >
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border-color">
              <div className="w-3 h-3 rounded-full bg-accent-green" />
              <div>
                <h3 className="font-display font-semibold text-white">
                  {targetVersion.versionNumber}
                </h3>
                <p className="text-xs text-gray-400">{targetVersion.description}</p>
              </div>
            </div>
            <div className="space-y-3">
              {targetVersion.metrics.map((m, i) => {
                const baseM = baseVersion.metrics[i];
                const delta = baseM ? m.value - baseM.value : 0;
                return (
                  <div
                    key={m.id}
                    className={cn(
                      'flex items-center justify-between py-2 border-b border-border-color/30 last:border-0',
                      m.isAbnormal && 'animate-breathe'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-300">{m.name}</span>
                      {m.isAbnormal && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-accent-red/10 text-accent-red">
                          异常
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white">{m.value}%</span>
                      <span
                        className={cn(
                          'text-xs font-mono',
                          delta > 0
                            ? 'text-accent-green'
                            : delta < 0
                            ? 'text-accent-red'
                            : 'text-gray-500'
                        )}
                      >
                        ({delta > 0 ? '+' : ''}
                        {delta.toFixed(1)})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <LeakSection
        version={targetVersion}
        onToggleLeak={handleToggleLeak}
        onViewSample={setSelectedSample}
      />

      <JsonViewerModal
        sample={selectedSample}
        onClose={() => setSelectedSample(null)}
      />
    </div>
  );
}
