import { useState } from 'react';
import { useGameStore } from '../store/gameStore';

const getRiskClass = (risk: number) => {
  if (risk < 20) return 'risk-low';
  if (risk < 50) return 'risk-medium';
  return 'risk-high';
};

export const SamplePanel = () => {
  const {
    currentPlanet,
    collectedSamples,
    selectedSample,
    currentPackage,
    getPlanetById,
    getSampleById,
    collectSample,
    selectSample,
    addToPackage,
    removeFromPackage,
  } = useGameStore();

  const [tab, setTab] = useState<'planet' | 'collected'>('planet');

  const currentPlanetData = getPlanetById(currentPlanet);
  const planetSamples = currentPlanetData?.availableSamples.map((id) => getSampleById(id)!).filter(Boolean) || [];
  const collectedSampleData = collectedSamples.map((id) => getSampleById(id)!).filter(Boolean);

  const displaySamples = tab === 'planet' ? planetSamples : collectedSampleData;

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">采样器</span>
      </div>

      <div className="tabs">
        <button
          className={`tab ${tab === 'planet' ? 'active' : ''}`}
          onClick={() => setTab('planet')}
        >
          当前星球
        </button>
        <button
          className={`tab ${tab === 'collected' ? 'active' : ''}`}
          onClick={() => setTab('collected')}
        >
          已收集 ({collectedSamples.length})
        </button>
      </div>

      <div className="sample-list">
        {displaySamples.length === 0 ? (
          <div style={{ color: '#71717a', textAlign: 'center', padding: '20px' }}>
            {tab === 'planet' ? '当前星球没有可采集的采样' : '还没有收集任何采样'}
          </div>
        ) : (
          displaySamples.map((sample) => {
            const isCollected = collectedSamples.includes(sample.id);
            const isInPackage = currentPackage.includes(sample.id);
            const isSelected = selectedSample === sample.id;

            return (
              <div
                key={sample.id}
                className={`sample-item ${isSelected ? 'selected' : ''} ${isInPackage ? 'in-package' : ''}`}
                onClick={() => selectSample(isSelected ? null : sample.id)}
              >
                <div className="sample-name">{sample.name}</div>
                <div className="sample-meta">
                  <span>{sample.genre}</span>
                  <span>品质: {sample.quality}</span>
                  <span className={`risk-indicator ${getRiskClass(sample.copyrightRisk)}`}>
                    版权风险: {sample.copyrightRisk}%
                  </span>
                </div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  {tab === 'planet' && !isCollected && (
                    <button
                      className="btn btn-primary btn-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        collectSample(sample.id);
                      }}
                    >
                      采集
                    </button>
                  )}
                  {isCollected && !isInPackage && (
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToPackage(sample.id);
                      }}
                    >
                      加入包裹
                    </button>
                  )}
                  {isInPackage && (
                    <button
                      className="btn btn-danger btn-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromPackage(sample.id);
                      }}
                    >
                      移出包裹
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedSample && (
        <div className="planet-info">
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>采样详情</div>
          {(() => {
            const sample = getSampleById(selectedSample);
            if (!sample) return null;
            const sourcePlanet = getPlanetById(sample.sourcePlanet);
            return (
              <>
                <div style={{ fontSize: '12px', color: '#a1a1aa' }}>
                  <div>来源: {sourcePlanet?.name}</div>
                  <div>类型: {sample.genre}</div>
                  <div>BPM: {sample.bpm || 'N/A'}</div>
                  <div>品质: {sample.quality}/100</div>
                  <div>独特性: {sample.uniqueness}/100</div>
                  <div>版权风险: {sample.copyrightRisk}%</div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};
