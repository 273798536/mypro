import { useGameStore } from '../store/gameStore';

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const HistoryPanel = () => {
  const {
    history,
    getSampleById,
    getPlanetById,
    getPackageById,
    selectSample,
  } = useGameStore();

  const sortedHistory = [...history].reverse().slice(0, 50);

  const handleTraceClick = (
    type: 'sample' | 'planet' | 'package',
    id: string
  ) => {
    if (type === 'sample') {
      selectSample(id);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'collect': return '🚀';
      case 'synthesize': return '🎵';
      case 'copyright': return '⚠️';
      case 'noise': return '🔊';
      case 'delivery': return '📦';
      default: return '•';
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">操作历史</span>
        <span style={{ fontSize: '12px', color: '#71717a' }}>
          {history.length} 条记录
        </span>
      </div>

      <div className="history-list">
        {sortedHistory.length === 0 ? (
          <div style={{ color: '#71717a', textAlign: 'center', padding: '20px', fontSize: '12px' }}>
            还没有任何操作记录
          </div>
        ) : (
          sortedHistory.map((record) => (
            <div key={record.id} className={`history-item ${record.result}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="history-action">
                    {getTypeIcon(record.type)} {record.action}
                  </div>
                  <div className="history-details">
                    {Object.entries(record.details).map(([key, value]) => (
                      <span key={key} style={{ marginRight: '8px' }}>
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: '#71717a' }}>
                  {formatTime(record.timestamp)}
                </div>
              </div>

              {record.sourceRef && (
                <div className="history-trace">
                  <span style={{ color: '#71717a' }}>溯源:</span>
                  {record.sourceRef.planetId && (
                    <span
                      className="trace-link"
                      onClick={() => handleTraceClick('planet', record.sourceRef!.planetId!)}
                    >
                      🪐 {getPlanetById(record.sourceRef.planetId)?.name || record.sourceRef.planetId}
                    </span>
                  )}
                  {record.sourceRef.sampleId && (
                    <span
                      className="trace-link"
                      onClick={() => handleTraceClick('sample', record.sourceRef!.sampleId!)}
                    >
                      🎵 {getSampleById(record.sourceRef.sampleId)?.name || record.sourceRef.sampleId}
                    </span>
                  )}
                  {record.sourceRef.packageId && (
                    <span
                      className="trace-link"
                      onClick={() => handleTraceClick('package', record.sourceRef!.packageId!)}
                    >
                      📦 {getPackageById(record.sourceRef.packageId)?.name || record.sourceRef.packageId}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
