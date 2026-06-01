import { useState } from 'react';
import { useGameStore } from '../store/gameStore';

export const PackagePanel = () => {
  const {
    currentPackage,
    packages,
    getSampleById,
    removeFromPackage,
    createPackage,
    deliverPackage,
  } = useGameStore();

  const [packageName, setPackageName] = useState('');

  const currentPackageSamples = currentPackage
    .map((id) => getSampleById(id)!)
    .filter(Boolean);

  const handleCreatePackage = () => {
    if (currentPackage.length > 0 && packageName.trim()) {
      createPackage(packageName.trim());
      setPackageName('');
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'draft': return 'status-draft';
      case 'delivered': return 'status-delivered';
      case 'rejected': return 'status-rejected';
      default: return 'status-draft';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#eab308';
      default: return '#22c55e';
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">节奏包裹</span>
      </div>

      <div className="current-package">
        <div style={{ fontWeight: 600, marginBottom: '8px' }}>当前包裹</div>
        {currentPackageSamples.length === 0 ? (
          <div style={{ color: '#71717a', fontSize: '12px' }}>
            从已收集的采样中添加采样到包裹
          </div>
        ) : (
          <>
            <div className="package-samples">
              {currentPackageSamples.map((sample) => (
                <span key={sample.id} className="package-sample-tag">
                  {sample.name}
                  <button
                    className="remove-btn"
                    onClick={() => removeFromPackage(sample.id)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <input
                type="text"
                className="input"
                placeholder="包裹名称"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-primary"
                onClick={handleCreatePackage}
                disabled={!packageName.trim()}
              >
                合成
              </button>
            </div>
          </>
        )}
      </div>

      <div className="section-title">已创建的包裹 ({packages.length})</div>

      <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {packages.length === 0 ? (
          <div style={{ color: '#71717a', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
            还没有创建任何包裹
          </div>
        ) : (
          packages.map((pkg) => {
          const samples = pkg.samples.map((id) => getSampleById(id)!).filter(Boolean);
            return (
              <div key={pkg.id} className="package-card">
                <div className="package-name">{pkg.name}</div>
                <span className={`package-status ${getStatusClass(pkg.status)}`}>
                  {pkg.status === 'draft' ? '待投递' : pkg.status === 'delivered' ? '已投递' : '已拒绝'}
                </span>
                <div style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '8px' }}>
                  分数: <span style={{ color: '#4ade80', fontWeight: 600 }}>{pkg.score}</span>
                  {' | '}
                  采样数: {samples.length}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                  {samples.map((sample) => (
                    <span key={sample.id} className="package-sample-tag">
                      {sample.name}
                    </span>
                  ))}
                </div>

                {pkg.copyrightClaims.length > 0 && (
                  <>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#ef4444', marginTop: '8px' }}>
                    版权冲突 ({pkg.copyrightClaims.length})
                  </div>
                  {pkg.copyrightClaims.map((claim) => (
                    <div key={claim.id} className="copyright-claim">
                      <span style={{ color: getSeverityColor(claim.severity), fontWeight: 500 }}>
                        {claim.severity.toUpperCase()}
                      </span>
                      {' - '}
                      {claim.reason}
                    </div>
                  ))}
                  </>
                )}

                {pkg.noiseEvents.length > 0 && (
                  <>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#eab308', marginTop: '8px' }}>
                    噪声事件 ({pkg.noiseEvents.length})
                  </div>
                    {pkg.noiseEvents.map((event) => (
                    <div key={event.id} className="noise-event">
                      {event.description} (严重度: {Math.round(event.severity)})
                    </div>
                  ))}
                  </>
                )}

                {pkg.status === 'draft' && (
                  <button
                    className="btn btn-primary btn-small"
                    style={{ marginTop: '12px', width: '100%' }}
                    onClick={() => deliverPackage(pkg.id)}
                  >
                    投递包裹
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
