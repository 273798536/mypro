import { useState, useEffect } from 'react';
import { useTopologyStore, useLevelStore, useRecordStore, useAnomalyStore, useTimelineStore } from './store';
import { sampleNodes, sampleLinks, sampleLevels, sampleRecords, sampleAnomalies, sampleSyncRecords } from './data/sampleData';
import TopologyCanvas from './components/TopologyCanvas';
import LevelPanel from './components/LevelPanel';
import NodeInfoPanel from './components/NodeInfoPanel';
import PlaybackPanel from './components/PlaybackPanel';
import SettlementView from './components/SettlementView';
import ReportPanel from './components/ReportPanel';
import AnomalyPanel from './components/AnomalyPanel';
import TimelinePanel from './components/TimelinePanel';
import ThreeDModelViewer from './components/ThreeDModelViewer';
import type { TimelineSyncRecord, ViewState } from './types';

function App() {
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [activeTab, setActiveTab] = useState<'node' | 'records' | 'anomalies' | 'timeline' | 'report' | 'model'>('node');
  const [showSettlement, setShowSettlement] = useState(false);
  const [viewerModelUrl, setViewerModelUrl] = useState<string | undefined>(undefined);
  const [viewerNodeId, setViewerNodeId] = useState<string | undefined>(undefined);
  
  const { nodes, links, setNodes, setLinks, selectedNodeId } = useTopologyStore();
  const { setLevels } = useLevelStore();
  const { processRecords, addRecord } = useRecordStore();
  const { addAnomaly } = useAnomalyStore();
  const { addSyncRecord } = useTimelineStore();

  useEffect(() => {
    const hasLoadedBefore = localStorage.getItem('dbShardTopologyLoaded');
    
    if (!hasLoadedBefore) {
      loadSampleData();
      localStorage.setItem('dbShardTopologyLoaded', 'true');
      setIsFirstLoad(false);
    } else {
      setIsFirstLoad(false);
    }
  }, []);

  useEffect(() => {
    if (selectedNodeId) {
      setActiveTab('node');
    }
  }, [selectedNodeId]);

  const loadSampleData = () => {
    setNodes(sampleNodes);
    setLinks(sampleLinks);
    setLevels(sampleLevels);
    
    sampleRecords.forEach(record => {
      addRecord({
        operator: record.operator,
        operation: record.operation,
        parameters: record.parameters,
        result: record.result,
        snapshot: record.snapshot,
      });
    });

    sampleAnomalies.forEach(anomaly => {
      addAnomaly({
        type: anomaly.type,
        context: anomaly.context,
        handling: anomaly.handling,
        status: anomaly.status,
      });
    });

    sampleSyncRecords.forEach((sync: Omit<TimelineSyncRecord, 'id' | 'timestamp'>) => {
      addSyncRecord(sync);
    });
  };

  const handleViewChange = (view: ViewState) => {
    addRecord({
      operator: '当前用户',
      operation: '调整视图',
      parameters: { 
        viewX: view.x, 
        viewY: view.y, 
        zoom: view.zoom,
        source: 'view_change'
      },
      result: 'success',
    });
  };

  const handleOpenModelViewer = (modelUrl: string, nodeId?: string) => {
    setViewerModelUrl(modelUrl);
    setViewerNodeId(nodeId);
    setActiveTab('model');
    addRecord({
      operator: '当前用户',
      operation: '打开三维模型',
      parameters: { modelUrl, nodeId },
      result: 'success',
    });
  };

  const handleCompleteLevel = (levelId: string, passed: boolean) => {
    const settlement = {
      levelId,
      passed,
      problems: passed ? [] : ['检测到坐标系混用问题', '存在边界连接错误'],
      suggestions: ['统一使用px单位', '增加边界节点带宽'],
      duration: 300,
      score: passed ? 85 : 60,
      completedAt: Date.now(),
    };
    
    useLevelStore.getState().completeLevel(settlement);
    setShowSettlement(true);
  };

  if (isFirstLoad) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="top-toolbar">
        <h1>📊 数据库分片拓扑星图</h1>
        <div className="toolbar-divider"></div>
        <div className="toolbar-section">
          <button className="btn btn-secondary" onClick={loadSampleData}>
            🔄 重新加载示例
          </button>
          <button className="btn btn-primary" onClick={() => setShowSettlement(true)}>
            📋 生成评审报告
          </button>
        </div>
        <div className="toolbar-section" style={{ marginLeft: 'auto' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            示例数据已加载 | 节点: {nodes.length} | 连接: {links.length} | 记录: {processRecords.length}
          </span>
        </div>
      </header>

      <main className="main-content">
        <aside className="left-panel">
          <div className="panel-header">
            📚 关卡列表
          </div>
          <div className="panel-content">
            <LevelPanel onCompleteLevel={handleCompleteLevel} />
          </div>
        </aside>

        <section className="center-canvas">
          {showSettlement ? (
            <SettlementView onClose={() => setShowSettlement(false)} />
          ) : (
            <TopologyCanvas onViewChange={handleViewChange} />
          )}
        </section>

        <aside className="right-panel">
          <div className="panel-header">
            📋 详情面板
          </div>
          <div className="tabs" style={{ flexWrap: 'wrap' }}>
            <button 
              className={`tab ${activeTab === 'node' ? 'active' : ''}`}
              onClick={() => setActiveTab('node')}
            >
              节点
            </button>
            <button 
              className={`tab ${activeTab === 'records' ? 'active' : ''}`}
              onClick={() => setActiveTab('records')}
            >
              记录
            </button>
            <button 
              className={`tab ${activeTab === 'anomalies' ? 'active' : ''}`}
              onClick={() => setActiveTab('anomalies')}
            >
              异常
            </button>
            <button 
              className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              时间轴
            </button>
            <button 
              className={`tab ${activeTab === 'report' ? 'active' : ''}`}
              onClick={() => setActiveTab('report')}
            >
              报告
            </button>
            <button 
              className={`tab ${activeTab === 'model' ? 'active' : ''}`}
              onClick={() => setActiveTab('model')}
            >
              3D模型
            </button>
          </div>
          
          {activeTab === 'node' && (
            <NodeInfoPanel onOpenModelViewer={handleOpenModelViewer} />
          )}
          {activeTab === 'records' && (
            <PlaybackPanel />
          )}
          {activeTab === 'anomalies' && (
            <AnomalyPanel onOpenModelViewer={handleOpenModelViewer} />
          )}
          {activeTab === 'timeline' && (
            <TimelinePanel />
          )}
          {activeTab === 'report' && (
            <ReportPanel />
          )}
          {activeTab === 'model' && (
            <div style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
              {viewerModelUrl ? (
                <>
                  <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
                    🧊 三维模型查看器 - {viewerNodeId || '关联节点'}
                  </div>
                  <div style={{ flex: 1, minHeight: '300px' }}>
                    <ThreeDModelViewer modelUrl={viewerModelUrl} nodeId={viewerNodeId} />
                  </div>
                </>
              ) : (
                <div style={{ 
                  padding: '40px 20px', 
                  textAlign: 'center', 
                  color: 'var(--color-text-secondary)',
                  fontSize: '13px'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🧊</div>
                  <p>请从异常面板或节点详情中打开三维模型</p>
                  <p style={{ fontSize: '11px', marginTop: '8px' }}>
                    提示：坐标系混用异常关联了 /models/mixed-coord.glb
                  </p>
                  <button 
                    className="btn btn-secondary"
                    style={{ marginTop: '16px' }}
                    onClick={() => handleOpenModelViewer('/models/mixed-coord.glb', 'anomaly-node-1')}
                  >
                    📦 查看示例模型
                  </button>
                </div>
              )}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
