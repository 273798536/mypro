import React from 'react';
import { useTopologyStore, useRecordStore, useAnomalyStore, useTimelineStore } from '../store';

interface NodeInfoPanelProps {
  onOpenModelViewer?: (modelUrl: string, nodeId?: string) => void;
}

const NodeInfoPanel: React.FC<NodeInfoPanelProps> = ({ onOpenModelViewer }) => {
  const { nodes, links, selectedNodeId } = useTopologyStore();
  const { addRecord } = useRecordStore();
  const { addAnomaly, anomalies } = useAnomalyStore();
  const { addSyncRecord } = useTimelineStore();

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  
  if (!selectedNode) {
    return (
      <div className="node-info">
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>👆</div>
          <p>点击拓扑图中的节点查看详情</p>
        </div>
      </div>
    );
  }

  const relatedLinks = links.filter(
    l => l.source === selectedNode.id || l.target === selectedNode.id
  );

  const relatedAnomalies = anomalies.filter(a => 
    a.context.nodeIds.includes(selectedNode.id)
  );

  const handleReportAnomaly = () => {
    addAnomaly({
      type: 'coordinate_mix',
      context: {
        nodeIds: [selectedNode.id],
        modelUrl: selectedNode.modelUrl,
      },
      handling: [],
      status: 'open',
    });

    addRecord({
      operator: '当前用户',
      operation: '报告异常',
      parameters: { nodeId: selectedNode.id, nodeName: selectedNode.name },
      result: 'success',
    });
  };

  const handleAddSyncRecord = () => {
    addSyncRecord({
      initiator: '当前用户',
      beforeState: { coordinateSystem: selectedNode.coordinateSystem, unit: selectedNode.unit },
      afterState: { coordinateSystem: selectedNode.coordinateSystem, unit: selectedNode.unit },
      status: 'pending',
    });

    addRecord({
      operator: '当前用户',
      operation: '记录时间轴同步',
      parameters: { nodeId: selectedNode.id },
      result: 'success',
    });
  };

  const getNodeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      center: '中心节点',
      primary: '一级分片',
      secondary: '二级分片',
      boundary: '边界节点',
    };
    return labels[type] || type;
  };

  const getNodeIcon = (type: string) => {
    const icons: Record<string, string> = {
      center: '☀️',
      primary: '🟢',
      secondary: '🟡',
      boundary: '🔴',
    };
    return icons[type] || '📌';
  };

  return (
    <div className="node-info">
      <div className="node-header">
        <div className={`node-icon ${selectedNode.type}`}>
          {getNodeIcon(selectedNode.type)}
        </div>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
            {selectedNode.name}
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            {getNodeTypeLabel(selectedNode.type)}
          </span>
        </div>
      </div>

      <div className="node-details">
        <div className="node-detail-row">
          <span className="node-detail-label">节点ID</span>
          <span className="node-detail-value">{selectedNode.id}</span>
        </div>
        
        <div className="node-detail-row">
          <span className="node-detail-label">坐标系统</span>
          <span className="node-detail-value">{selectedNode.coordinateSystem}</span>
        </div>
        
        <div className="node-detail-row">
          <span className="node-detail-label">单位</span>
          <span className="node-detail-value">{selectedNode.unit}</span>
        </div>
        
        <div className="node-detail-row">
          <span className="node-detail-label">位置</span>
          <span className="node-detail-value">
            ({selectedNode.position.x}, {selectedNode.position.y}
            {selectedNode.position.z !== undefined && `, ${selectedNode.position.z}`})
          </span>
        </div>

        {selectedNode.modelUrl && (
          <div className="node-detail-row">
            <span className="node-detail-label">3D模型</span>
            <span className="node-detail-value" style={{ fontSize: '11px', color: 'var(--color-primary)' }}>
              📦 {selectedNode.modelUrl}
            </span>
          </div>
        )}
      </div>

      {Object.keys(selectedNode.metadata).length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
            元数据
          </h4>
          <div style={{ background: 'var(--color-background)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '12px' }}>
            {Object.entries(selectedNode.metadata).map(([key, value]) => (
              <div key={key} className="node-detail-row" style={{ borderBottom: 'none' }}>
                <span className="node-detail-label">{key}</span>
                <span className="node-detail-value">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {relatedLinks.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
            相关连接 ({relatedLinks.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {relatedLinks.map(link => {
              const otherNode = nodes.find(n => 
                n.id === (link.source === selectedNode.id ? link.target : link.source)
              );
              return (
                <div key={link.id} style={{
                  padding: '8px',
                  background: 'var(--color-background)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span>{otherNode?.name}</span>
                  <span className={`level-badge ${
                    link.status === 'normal' ? 'success' : 
                    link.status === 'warning' ? 'warning' : 'error'
                  }`} style={{ fontSize: '10px' }}>
                    {link.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {relatedAnomalies.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-error)' }}>
            ⚠️ 关联异常 ({relatedAnomalies.length})
          </h4>
          {relatedAnomalies.map(anomaly => (
            <div key={anomaly.id} style={{
              padding: '12px',
              background: '#FEF2F2',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              marginBottom: '8px',
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>{anomaly.type}</div>
              <div style={{ color: 'var(--color-text-secondary)' }}>
                状态: {anomaly.status} | 处理意见: {anomaly.handling.length}条
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button className="btn btn-warning" onClick={handleReportAnomaly} style={{ width: '100%' }}>
          ⚠️ 报告异常
        </button>
        <button className="btn btn-secondary" onClick={handleAddSyncRecord} style={{ width: '100%' }}>
          📝 记录时间轴
        </button>
        {selectedNode.modelUrl && (
          <button 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            onClick={() => onOpenModelViewer?.(selectedNode.modelUrl!, selectedNode.id)}
          >
            🧊 查看3D模型
          </button>
        )}
      </div>
    </div>
  );
};

export default NodeInfoPanel;
