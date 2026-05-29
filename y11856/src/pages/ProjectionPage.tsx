import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Box, GitMerge } from 'lucide-react';
import Scene3D from '@/components/Scene3D';
import ParamPanel from '@/components/ParamPanel';
import FilterPanel from '@/components/FilterPanel';
import ViewpointManager from '@/components/ViewpointManager';
import StatsPanel from '@/components/StatsPanel';
import { useStore } from '@/store/useStore';
import { samples as sampleData, overlapRegions as overlapData, outliers as outlierData, mergeDiffs as diffData } from '@/data/sampleData';
import { reduceDimensionality } from '@/utils/dimReduction';
import type { ProjectionPoint } from '@/types';

export default function ProjectionPage() {
  const setSamples = useStore((s) => s.setSamples);
  const setProjections = useStore((s) => s.setProjections);
  const setOverlapRegions = useStore((s) => s.setOverlapRegions);
  const setOutliers = useStore((s) => s.setOutliers);
  const setMergeDiffs = useStore((s) => s.setMergeDiffs);
  const samples = useStore((s) => s.samples);
  const config = useStore((s) => s.config);
  const [initialized, setInitialized] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    setSamples(sampleData);
    setOverlapRegions(overlapData);
    setOutliers(outlierData);
    setMergeDiffs(diffData);
    setInitialized(true);
  }, [setSamples, setOverlapRegions, setOutliers, setMergeDiffs]);

  useEffect(() => {
    if (!initialized || samples.length === 0) return;
    let cancelled = false;
    const vectors = samples.map((s) => s.vector);
    reduceDimensionality(vectors, config.method, config.params).then((points3d) => {
      if (cancelled) return;
      const projections: ProjectionPoint[] = points3d.map((p, i) => ({
        sampleId: samples[i].id,
        x: p.x,
        y: p.y,
        z: p.z,
      }));
      setProjections(projections);
    });
    return () => { cancelled = true; };
  }, [initialized, samples, config.method, setProjections]);

  return (
    <div className="flex h-screen w-screen bg-[#0a0e1a] overflow-hidden">
      <div className="flex flex-col w-[280px] shrink-0 overflow-y-auto">
        <div className="px-4 py-3 border-b border-[#1a2040] flex items-center gap-2">
          <Box size={18} className="text-[#00ffc8]" />
          <span className="text-sm font-bold text-white/90 tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            AI特征空间投影
          </span>
        </div>
        <ParamPanel />
        <FilterPanel />
        <ViewpointManager />
        <div className="p-4 border-t border-[#1a2040]">
          <Link
            to="/merge"
            className="flex items-center gap-2 text-xs text-[#4d9fff] hover:text-[#3d8fee] transition-colors"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <GitMerge size={14} />
            合并差异对比 →
          </Link>
        </div>
      </div>

      <div className="flex-1 relative">
        <Scene3D />
      </div>

      <div className="w-[260px] shrink-0 overflow-y-auto">
        <StatsPanel />
      </div>
    </div>
  );
}
