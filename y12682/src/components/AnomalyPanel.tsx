import React, { useState } from 'react';
import { useAnomalyStore, useRecordStore, useTopologyStore } from '../store';
import type { AnomalyRecord } from '../types';

interface AnomalyPanelProps {
  onOpenModelViewer?: (modelUrl: string, nodeId?: string) => void;
}

const AnomalyPanel: React.FC<AnomalyPanelProps> = ({ onOpenModelViewer }) => {
  const { anomalies, addHandling, resolveAnomaly } = useAnomalyStore();
  const { addRecord } = useRecordStore();
  const { nodes } = useTopologyStore();
  const [selectedAnomaly, setSelectedAnomaly] = useState<string | null>(null);
  const [showHandlingForm, setShowHandlingForm] = useState(false);
  const [handlingOpinion, setHandlingOpinion] = useState('');
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);

  const handleAddHandling = (anomalyId: string) => {
    if (!handlingOpinion.trim()) return;

    addHandling(anomalyId, {
      handler: '当前用户',
      time: Date.now(),
      opinion: handlingOpinion,
      result: '处理中',
    });

    addRecord({
      operator: '当前用户',
      operation: '添加处理意见',
      parameters: { anomalyId, opinion: handlingOpinion },
      result: 'success',
    });

    setHandlingOpinion('');
    setShowHandlingForm(false);
  };

  const handleResolve = (anomalyId: string) => {
    resolveAnomaly(anomalyId);
    
    addRecord({
      operator: '当前用户',
      operation: '标记异常为已解决',
      parameters: { anomalyId },
      result: 'success',
    });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: '待处理',
      in_progress: '处理中',
      resolved: '已解决',
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      coordinate_mix: '坐标系混用',
      boundary_failure: '边界失败',
      unit_error: '单位错误',
      performance: '性能问题',
    };
    return labels[type] || type;
  };

  const getTypeDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      coordinate_mix: '多个节点使用了不同的坐标系（2D/3D）或计量单位（px/cm/inch），导致距离和位置计算出现偏差。',
      boundary_failure: '跨分片事务边界节点连接异常，带宽不足或延迟过高，影响分布式事务提交。',
      unit_error: '单位换算错误，不同节点间的距离单位未按标准比例转换。',
      performance: '节点性能指标异常，存在CPU、内存、网络等瓶颈。',
    };
    return descriptions[type] || '异常情况需要进一步分析。';
  };

  const getRelatedNodes = (anomaly: AnomalyRecord) => {
    return anomaly.context.nodeIds
      .map(id => nodes.find(n => n.id === id))
      .filter(Boolean);
  };

  const toggleTrace = (id: string) => {
    setExpandedTrace(expandedTrace === id ? null : id);
  };

  const sortedAnomalies = [...anomalies].sort((a, b) => {
    const statusOrder: Record<string, number> = { open: 0, in_progress: 1, resolved: 2 };
    return (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header" style={{ background: 'var(--color-background)', padding: '12px 16px' }}>
        ⚠️ 异常追踪 ({anomalies.length})
      </div>

      <div style={{
        padding: '8px 12px',
        background: '#FEF2F2',
        borderBottom: '1px solid var(--color-border)',
        fontSize: '11px',
        color: '#991B1B',
      }}>
        🔍 追溯链路：异常记录 → 关联节点/三维模型 → 处理意见
      </div>

      <div className="anomaly-list" style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {sortedAnomalies.length === 0 ? (
          <div style={{ 
            padding: '40px 20px', 
            textAlign: 'center', 
            color: 'var(--color-text-secondary)',
            fontSize: '13px'
          }}>
            暂无异常记录
          </div>
        ) : (
          sortedAnomalies.map(anomaly => {
            const relatedNodes = getRelatedNodes(anomaly);
            const isExpanded = expandedTrace === anomaly.id;

            return (
              <div key={anomaly.id} className="anomaly-item">
                <div className="anomaly-header">
                  <span className="anomaly-type">{getTypeLabel(anomaly.type)}</span>
                  <span className={`anomaly-status ${anomaly.status}`}>
                    {getStatusLabel(anomaly.status)}
                  </span>
                </div>

                <div className="anomaly-context">
                  <div style={{ marginBottom: '8px' }}>
                    ⏰ {new Date(anomaly.timestamp).toLocaleString('zh-CN')}
                  </div>
                  
                  <div style={{
                    padding: '8px',
                    background: '#FFFBEB',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11px',
                    color: '#92400E',
                    marginBottom: '8px',
                    lineHeight: '1.6',
                  }}>
                    📋 <b>问题说明：</b>{getTypeDescription(anomaly.type)}
                  </div>

                  <div style={{ marginBottom: '4px' }}>
                    🔗 关联节点：{relatedNodes.length} 个
                    {relatedNodes.length > 0 && (
                      <span style={{ 
                        marginLeft: '6px', 
                        fontSize: '10px', 
                        color: 'var(--color-text-secondary)' 
                      }}>
                        ({relatedNodes.map(n => n?.name).join('、')})
                      </span>
                    )}
                  </div>

                  {anomaly.context.modelUrl && (
                    <div style={{ 
                      marginBottom: '4px', 
                      padding: '6px 8px',
                      background: '#EFF6FF',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px dashed #BFDBFE',
                    }}>
                      <span style={{ color: 'var(--color-primary)', fontSize: '11px' }}>
                        🧊 关联3D模型：{anomaly.context.modelUrl}
                      </span>
                    </div>
                  )}

                  {anomaly.context.screenshot && (
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                      📷 截图：{anomaly.context.screenshot}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '8px' }}>
                  <button
                    onClick={() => toggleTrace(anomaly.id)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '11px',
                      background: isExpanded ? 'var(--color-primary)' : 'var(--color-background)',
                      color: isExpanded ? 'white' : 'var(--color-text)',
                      border: '1px solid',
                      borderColor: isExpanded ? 'var(--color-primary)' : 'var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>🔗 {isExpanded ? '收起' : '展开'}追溯详情</span>
                    <span>{isExpanded ? '▲' : '▼'}</span>
                  </button>
                </div>

                {isExpanded && (
                  <div style={{
                    marginTop: '8px',
                    padding: '12px',
                    background: '#F8FAFC',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '10px', color: 'var(--color-primary)' }}>
                      📊 完整追溯链路
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        marginBottom: '6px',
                        color: 'var(--color-text-secondary)',
                      }}>
                        ① 异常记录
                      </div>
                      <div style={{
                        padding: '8px',
                        background: 'white',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        borderLeft: '3px solid var(--color-error)',
                      }}>
                        <div><b>类型：</b>{getTypeLabel(anomaly.type)}</div>
                        <div><b>时间：</b>{new Date(anomaly.timestamp).toLocaleString('zh-CN')}</div>
                        <div><b>状态：</b>{getStatusLabel(anomaly.status)}</div>
                      </div>
                    </div>

                    {relatedNodes.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          marginBottom: '6px',
                          color: 'var(--color-text-secondary)',
                        }}>
                          ② 关联节点 / 三维模型
                        </div>
                        {relatedNodes.map((node, idx) => (
                          <div key={idx} style={{
                            padding: '8px',
                            background: 'white',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '11px',
                            borderLeft: '3px solid var(--color-warning)',
                            marginBottom: '6px',
                          }}>
                            <div style={{ fontWeight: '600' }}>{node?.name}</div>
                            <div style={{ marginTop: '4px', color: 'var(--color-text-secondary)' }}>
                              坐标：{node?.coordinateSystem} | 单位：{node?.unit}
                            </div>
                            {node?.modelUrl && (
                              <div style={{ marginTop: '6px' }}>
                                <button
                                  onClick={() => onOpenModelViewer?.(node.modelUrl!, node.id)}
                                  style={{
                                    padding: '4px 10px',
                                    fontSize: '10px',
                                    background: 'var(--color-primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  🧊 查看3D模型
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        {anomaly.context.modelUrl && (
                          <div style={{
                            padding: '8px',
                            background: '#EFF6FF',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '11px',
                            border: '1px dashed #BFDBFE',
                          }}>
                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>异常场景3D模型</div>
                            <button
                              onClick={() => onOpenModelViewer?.(
                                anomaly.context.modelUrl!, 
                                anomaly.context.nodeIds[0]
                              )}
                              style={{
                                padding: '4px 10px',
                                fontSize: '10px',
                                background: 'var(--color-primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                              }}
                            >
                              🧊 打开场景模型追溯
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        marginBottom: '6px',
                        color: 'var(--color-text-secondary)',
                      }}>
                        ③ 处理意见 ({anomaly.handling.length})
                      </div>
                      {anomaly.handling.length === 0 ? (
                        <div style={{
                          padding: '8px',
                          background: 'white',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11px',
                          color: 'var(--color-text-secondary)',
                          textAlign: 'center',
                          borderLeft: '3px solid var(--color-border)',
                        }}>
                          暂无处理意见，请点击下方"处理"按钮添加
                        </div>
                      ) : (
                        anomaly.handling.map((h, index) => (
                          <div key={index} style={{
                            padding: '8px',
                            background: 'white',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '11px',
                            borderLeft: '3px solid var(--color-success)',
                            marginBottom: '6px',
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: '4px',
                              color: 'var(--color-text-secondary)',
                            }}>
                              <span>👤 {h.handler}</span>
                              <span>{new Date(h.time).toLocaleString('zh-CN')}</span>
                            </div>
                            <div style={{ color: 'var(--color-text)', lineHeight: '1.6' }}>
                              {h.opinion}
                            </div>
                            {h.result && (
                              <div style={{ marginTop: '4px', color: 'var(--color-success)', fontWeight: '600' }}>
                                ✓ 处理结果：{h.result}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {anomaly.handling.length > 0 && !isExpanded && (
                  <div className="anomaly-handling">
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
                      💬 处理意见 ({anomaly.handling.length})
                    </div>
                    {anomaly.handling.slice(-1).map((h, index) => (
                      <div key={index} className="handling-item">
                        <div className="handling-header">
                          <span>👤 {h.handler}</span>
                          <span>{new Date(h.time).toLocaleString('zh-CN')}</span>
                        </div>
                        <div className="handling-opinion">{h.opinion}</div>
                        {h.result && (
                          <div style={{ 
                            fontSize: '11px', 
                            color: 'var(--color-success)',
                            marginTop: '4px',
                          }}>
                            ✓ {h.result}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedAnomaly === anomaly.id && showHandlingForm && (
                  <div style={{ marginTop: '12px', padding: '12px', background: 'white', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
                      📝 添加处理意见
                    </div>
                    <textarea
                      value={handlingOpinion}
                      onChange={(e) => setHandlingOpinion(e.target.value)}
                      placeholder="请输入处理意见..."
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '8px',
                        fontSize: '13px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '8px',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleAddHandling(anomaly.id)}
                        style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }}
                      >
                        ✓ 提交
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowHandlingForm(false);
                          setHandlingOpinion('');
                        }}
                        style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {anomaly.status !== 'resolved' && (
                    <>
                      <button 
                        className="btn btn-warning"
                        onClick={() => {
                          setSelectedAnomaly(anomaly.id);
                          setShowHandlingForm(true);
                        }}
                        style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }}
                      >
                        💬 处理
                      </button>
                      <button 
                        className="btn btn-success"
                        onClick={() => handleResolve(anomaly.id)}
                        style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }}
                      >
                        ✓ 解决
                      </button>
                    </>
                  )}
                  {anomaly.context.modelUrl && (
                    <button 
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => onOpenModelViewer?.(
                        anomaly.context.modelUrl!, 
                        anomaly.context.nodeIds[0]
                      )}
                    >
                      🧊 3D追溯
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ 
        borderTop: '1px solid var(--color-border)', 
        padding: '12px',
        background: 'var(--color-background)',
      }}>
        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
          💡 提示：展开追溯详情可查看 异常→节点/3D模型→处理意见 的完整链路
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '11px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '600', color: 'var(--color-error)' }}>
              {anomalies.filter(a => a.status === 'open').length}
            </div>
            <div>待处理</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '600', color: 'var(--color-warning)' }}>
              {anomalies.filter(a => a.status === 'in_progress').length}
            </div>
            <div>处理中</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '600', color: 'var(--color-success)' }}>
              {anomalies.filter(a => a.status === 'resolved').length}
            </div>
            <div>已解决</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnomalyPanel;
