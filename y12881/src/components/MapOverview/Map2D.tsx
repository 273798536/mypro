import { useMemo } from 'react';
import { useSampleStore } from '@/store/useSampleStore';
import { useReviewStore } from '@/store/useReviewStore';
import { getRiskColor, getSpeciesColor } from '@/utils/colorUtils';

export default function Map2D() {
  const { samples, selectedSampleId, hoveredSampleId, getFilteredSamples, selectSample } =
    useSampleStore();
  const { versions, activeVersionId, diffMode } = useReviewStore();

  const filteredSamples = getFilteredSamples();

  const activeSnapshot = useMemo(() => {
    if (!activeVersionId) return null;
    return versions.find((v) => v.id === activeVersionId)?.snapshot || null;
  }, [versions, activeVersionId]);

  const getDotStyle = (x: number, z: number, size: number, color: string, opacity = 0.7) => {
    const mapSize = 200;
    const range = 50;
    const px = ((x + range) / (range * 2)) * mapSize;
    const py = ((z + range) / (range * 2)) * mapSize;
    return {
      left: `${px}px`,
      top: `${py}px`,
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: color,
      opacity,
    };
  };

  const handleClickSample = (id: string) => {
    selectSample(id);
  };

  return (
    <div className="glass-panel p-3 relative" style={{ width: 240, height: 260 }}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-ocean-100 font-display">
          俯视图
        </span>
        {diffMode !== 'none' && (
          <div className="flex gap-1">
            {diffMode === 'overlay' && (
              <span className="text-[10px] text-cyan-glow">● 叠加对比</span>
            )}
            {diffMode === 'side' && (
              <span className="text-[10px] text-cyan-glow">● 分栏对比</span>
            )}
          </div>
        )}
      </div>

      <div
        className="relative mx-auto rounded-lg overflow-hidden"
        style={{
          width: 200,
          height: 200,
          background:
            'radial-gradient(ellipse at center, rgba(27,73,101,0.3) 0%, rgba(6,14,24,0.8) 100%)',
          border: '1px solid rgba(0,212,170,0.15)',
        }}
      >
        <svg width="200" height="200" className="absolute inset-0 pointer-events-none">
          {[0, 1, 2, 3, 4].map((i) => (
            <circle
              key={i}
              cx={100}
              cy={100}
              r={20 + i * 20}
              fill="none"
              stroke="rgba(0,212,170,0.08)"
              strokeWidth="1"
            />
          ))}
          <line x1="0" y1="100" x2="200" y2="100" stroke="rgba(0,212,170,0.06)" strokeWidth="1" />
          <line x1="100" y1="0" x2="100" y2="200" stroke="rgba(0,212,170,0.06)" strokeWidth="1" />
        </svg>

        {diffMode === 'overlay' && activeSnapshot && (
          <div className="absolute inset-0">
            {activeSnapshot.map((s) => {
              const size = Math.max(3, Math.min(10, Math.log10(s.count + 1) * 3));
              const isChanged = versions[versions.length - 1]?.diff?.[s.id];
              const style = getDotStyle(
                s.x,
                s.z,
                size,
                isChanged ? '#E63946' : getSpeciesColor(s.species),
                0.35,
              );
              return (
                <div
                  key={`old-${s.id}`}
                  className="absolute rounded-full"
                  style={{
                    ...style,
                    border: '1px dashed rgba(230,57,70,0.6)',
                    transform: 'translate(-50%,-50%)',
                    backgroundColor: 'transparent',
                  }}
                />
              );
            })}
          </div>
        )}

        {filteredSamples.map((sample) => {
          const size = Math.max(3, Math.min(10, Math.log10(sample.count + 1) * 3));
          const isSelected = sample.id === selectedSampleId;
          const isHovered = sample.id === hoveredSampleId;
          const style = getDotStyle(
            sample.x,
            sample.z,
            isSelected ? size * 2.2 : isHovered ? size * 1.6 : size,
            sample.riskLevel !== 'none' ? getRiskColor(sample.riskLevel) : getSpeciesColor(sample.species),
            isSelected ? 1 : isHovered ? 0.95 : 0.75,
          );
          return (
            <div
              key={sample.id}
              className="absolute rounded-full cursor-pointer transition-all duration-150"
              style={{
                ...style,
                transform: 'translate(-50%,-50%)',
                boxShadow: isSelected
                  ? `0 0 12px ${getRiskColor(sample.riskLevel)}`
                  : isHovered
                  ? `0 0 6px ${getRiskColor(sample.riskLevel)}`
                  : 'none',
                zIndex: isSelected ? 10 : isHovered ? 5 : 1,
              }}
              onClick={() => handleClickSample(sample.id)}
            />
          );
        })}

        {selectedSampleId && (() => {
          const s = samples.find((x) => x.id === selectedSampleId);
          if (!s) return null;
          const style = getDotStyle(s.x, s.z, 22, 'transparent', 1);
          return (
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                ...style,
                transform: 'translate(-50%,-50%)',
                border: `2px solid ${getRiskColor(s.riskLevel)}`,
                boxShadow: `0 0 16px ${getRiskColor(s.riskLevel)}`,
                animation: 'pulse-glow 1.5s ease-in-out infinite',
              }}
            />
          );
        })()}
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-ocean-300">
        <span>样本：{filteredSamples.length}/{samples.length}</span>
        {diffMode !== 'none' && (
          <span className="text-crimson-risk">
            差异：{Object.keys(versions[versions.length - 1]?.diff || {}).length}项
          </span>
        )}
      </div>
    </div>
  );
}
