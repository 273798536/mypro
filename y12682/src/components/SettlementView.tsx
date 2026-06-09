import React, { useState } from 'react';
import { useLevelStore, useAnomalyStore, useRecordStore } from '../store';

interface SettlementViewProps {
  onClose: () => void;
}

const SettlementView: React.FC<SettlementViewProps> = ({ onClose }) => {
  const { settlements, levels } = useLevelStore();
  const { anomalies } = useAnomalyStore();
  const { processRecords } = useRecordStore();
  const [activeTab, setActiveTab] = useState<'summary' | 'report' | 'details'>('summary');

  const latestSettlement = settlements[settlements.length - 1];
  const level = levels.find(l => l.id === latestSettlement?.levelId);
  
  const openAnomalies = anomalies.filter(a => a.status !== 'resolved');
  const totalRecords = processRecords.length;

  const generatePlainTextReport = () => {
    const lines = [
      `项目名称：数据库分片拓扑星图评审报告`,
      `评审日期：${new Date().toLocaleDateString('zh-CN')}`,
      `评审版本：v1.0`,
      ``,
      `【评审概况】`,
      `本次评审共检查了${totalRecords}项操作记录，发现${openAnomalies.length}个待处理异常。`,
      `评审得分：${latestSettlement?.score || 0}分（满分100分）。`,
      ``,
      `【主要发现】`,
      ...(latestSettlement?.passed 
        ? [`✓ 拓扑结构基本合理，分片策略符合预期。`]
        : [
            `✗ 检测到坐标系混用问题，部分节点使用了不同的单位。`,
            `✗ 存在边界连接错误，带宽配置不足。`,
          ]
      ),
      ``,
      `【改进建议】`,
      ...(latestSettlement?.suggestions || []).map(s => `• ${s}`),
      ``,
      `【异常处理进度】`,
      `• 待处理异常：${openAnomalies.length}项`,
      `• 已处理异常：${anomalies.length - openAnomalies.length}项`,
      `• 异常类型包括：${[...new Set(anomalies.map(a => a.type))].join('、')}`,
      ``,
      `【后续行动】`,
      `1. 统一所有节点的坐标系和单位`,
      `2. 增加边界连接的带宽配置`,
      `3. 完成所有异常的处理意见填写`,
      `4. 重新进行评审验证`,
      ``,
      `评审员：[签名]`,
      `日期：[日期]`,
    ];
    
    return lines.join('\n');
  };

  return (
    <div className="settlement-container">
      <div className="settlement-header">
        <h1 className={`settlement-title ${latestSettlement?.passed ? 'passed' : 'failed'}`}>
          {latestSettlement?.passed ? '✓ 评审通过' : '✗ 评审未通过'}
        </h1>
        <p className="settlement-subtitle">
          {level?.name || '综合评审结算'} - 
          {new Date(latestSettlement?.completedAt || Date.now()).toLocaleString('zh-CN')}
        </p>
      </div>

      <div className="settlement-stats">
        <div className="stat-card">
          <div className="stat-value">{latestSettlement?.score || 0}</div>
          <div className="stat-label">评审得分</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{latestSettlement?.problems?.length || 0}</div>
          <div className="stat-label">发现问题</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{openAnomalies.length}</div>
          <div className="stat-label">待处理异常</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.floor((latestSettlement?.duration || 0) / 60)}分</div>
          <div className="stat-label">评审耗时</div>
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          结算总结
        </button>
        <button 
          className={`tab ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          评审报告
        </button>
        <button 
          className={`tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          详细记录
        </button>
      </div>

      {activeTab === 'summary' && (
        <div>
          <div className="settlement-section">
            <h2 className="section-title">📋 评审总结</h2>
            <p style={{ lineHeight: '1.8', marginBottom: '16px' }}>
              {latestSettlement?.passed 
                ? '本次评审总体通过。数据库分片拓扑结构设计合理，星型连接关系清晰，各节点职责明确。建议持续监控性能指标，定期进行拓扑结构优化。'
                : '本次评审未通过。虽然整体拓扑结构基本合理，但存在若干需要立即处理的问题，包括坐标系不统一、边界带宽不足等。建议尽快修复后再进行评审。'}
            </p>
          </div>

          {latestSettlement?.problems && latestSettlement.problems.length > 0 && (
            <div className="settlement-section">
              <h2 className="section-title" style={{ borderLeftColor: 'var(--color-error)' }}>
                ⚠️ 发现的问题
              </h2>
              <ul className="problem-list">
                {latestSettlement.problems.map((problem, index) => (
                  <li key={index}>{problem}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="settlement-section">
            <h2 className="section-title" style={{ borderLeftColor: 'var(--color-success)' }}>
              💡 改进建议
            </h2>
            <ul className="suggestion-list">
              {(latestSettlement?.suggestions || []).map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'report' && (
        <div>
          <div className="report-section">
            <h2 className="report-title">📄 评审报告 - 普通话解释版</h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
              👆 以下内容可直接复制给同事，无需重新翻译
            </p>
            <textarea
              value={generatePlainTextReport()}
              readOnly
              style={{
                width: '100%',
                minHeight: '400px',
                fontFamily: 'inherit',
                fontSize: '13px',
                lineHeight: '1.8',
                padding: '16px',
                border: '2px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'white',
                resize: 'vertical',
              }}
            />
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '12px' }}
              onClick={() => {
                navigator.clipboard.writeText(generatePlainTextReport());
                alert('报告已复制到剪贴板！');
              }}
            >
              📋 复制报告
            </button>
          </div>

          <div className="report-section">
            <h2 className="report-title">📊 技术详情</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'white', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>节点总数</div>
                <div style={{ fontSize: '20px', fontWeight: '600' }}>
                  {useLevelStore.getState().levels.length} 个
                </div>
              </div>
              <div style={{ padding: '12px', background: 'white', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>处理记录</div>
                <div style={{ fontSize: '20px', fontWeight: '600' }}>{totalRecords} 条</div>
              </div>
              <div style={{ padding: '12px', background: 'white', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>异常总数</div>
                <div style={{ fontSize: '20px', fontWeight: '600' }}>{anomalies.length} 项</div>
              </div>
              <div style={{ padding: '12px', background: 'white', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>评审结论</div>
                <div style={{ 
                  fontSize: '20px', 
                  fontWeight: '600',
                  color: latestSettlement?.passed ? 'var(--color-success)' : 'var(--color-error)'
                }}>
                  {latestSettlement?.passed ? '通过' : '未通过'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'details' && (
        <div>
          <div className="settlement-section">
            <h2 className="section-title">📜 处理记录详情</h2>
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              {processRecords.slice(-20).reverse().map(record => (
                <div key={record.id} className="record-item" style={{ borderLeft: '3px solid var(--color-primary)' }}>
                  <div className="record-time">
                    {new Date(record.timestamp).toLocaleString('zh-CN')}
                  </div>
                  <div className="record-operation">{record.operation}</div>
                  <div className="record-operator">
                    操作人：{record.operator} | 结果：{record.result}
                  </div>
                  {record.parameters && Object.keys(record.parameters).length > 0 && (
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '8px', 
                      background: 'var(--color-background)', 
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      fontFamily: 'Monaco, Menlo, monospace',
                    }}>
                      {JSON.stringify(record.parameters, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
        <button className="btn btn-secondary" onClick={onClose}>
          ← 返回编辑器
        </button>
        <button className="btn btn-primary" onClick={() => window.print()}>
          🖨️ 打印报告
        </button>
      </div>
    </div>
  );
};

export default SettlementView;
