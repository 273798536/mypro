import React, { useState } from 'react';
import { TensionRecord, ProcessingStatus, HistoryEntry } from '../types';
import { getRecordHistory } from '../utils/history';

interface DetailTableProps {
  records: TensionRecord[];
  onStatusChange: (recordId: string, newStatus: ProcessingStatus, reason: string) => void;
}

const STATUS_LABELS: Record<ProcessingStatus, string> = {
  [ProcessingStatus.NORMAL]: '正常',
  [ProcessingStatus.NOISE]: '疑似噪声',
  [ProcessingStatus.EXTREME]: '极端值',
  [ProcessingStatus.SUSPICIOUS]: '待确认',
  [ProcessingStatus.MANUAL_OVERRIDE]: '人工修改',
  [ProcessingStatus.PENDING]: '待分析',
};

const STATUS_CLASS: Record<ProcessingStatus, string> = {
  [ProcessingStatus.NORMAL]: 'status-normal',
  [ProcessingStatus.NOISE]: 'status-noise',
  [ProcessingStatus.EXTREME]: 'status-extreme',
  [ProcessingStatus.SUSPICIOUS]: 'status-suspicious',
  [ProcessingStatus.MANUAL_OVERRIDE]: 'status-manual',
  [ProcessingStatus.PENDING]: 'status-pending',
};

export const DetailTable: React.FC<DetailTableProps> = ({ records, onStatusChange }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<ProcessingStatus>(ProcessingStatus.NORMAL);
  const [editReason, setEditReason] = useState('');
  const [operator, setOperator] = useState('小宋');

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleEditClick = (record: TensionRecord) => {
    setEditingId(record.id);
    setEditStatus(record.processingStatus);
    setEditReason(record.statusReason);
  };

  const handleSaveEdit = (recordId: string) => {
    onStatusChange(recordId, editStatus, editReason);
    setEditingId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderHistory = (recordId: string) => {
    const history: HistoryEntry[] = getRecordHistory(recordId);
    if (history.length === 0) {
      return <div className="no-history">暂无历史修改记录</div>;
    }
    return (
      <div className="history-list">
        {history.map(h => (
          <div key={h.id} className="history-item">
            <div className="history-header">
              <span className="history-time">{formatTime(h.timestamp)}</span>
              <span className="history-operator">操作人：{h.operator}</span>
            </div>
            <div className="history-detail">
              <span className={`status-tag ${STATUS_CLASS[h.oldStatus]}`}>
                {STATUS_LABELS[h.oldStatus]}
              </span>
              <span className="history-arrow">→</span>
              <span className={`status-tag ${STATUS_CLASS[h.newStatus]}`}>
                {STATUS_LABELS[h.newStatus]}
              </span>
            </div>
            {h.note && <div className="history-note">备注：{h.note}</div>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="detail-table">
      <h3>明细数据</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>材料</th>
              <th>滑轮组</th>
              <th>张力</th>
              <th>状态</th>
              <th>跳变</th>
              <th>来源</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map(record => (
              <React.Fragment key={record.id}>
                <tr className={expandedId === record.id ? 'expanded' : ''}>
                  <td>{formatTime(record.timestamp)}</td>
                  <td title={record.materialId}>
                    {record.materialName}
                    <br />
                    <span className="material-id">{record.materialId}</span>
                  </td>
                  <td>{record.pulleyGroupId}</td>
                  <td>
                    {record.tension.toFixed(2)} {record.tensionUnit}
                  </td>
                  <td>
                    <span className={`status-tag ${STATUS_CLASS[record.processingStatus]}`}>
                      {STATUS_LABELS[record.processingStatus]}
                    </span>
                  </td>
                  <td>
                    {record.isJumpPoint ? (
                      <span className="jump-badge">跳变</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td title={record.sourceFields.join(', ')}>
                    {record.sourceFile}
                  </td>
                  <td>
                    <button onClick={() => toggleExpand(record.id)} className="btn-link">
                      {expandedId === record.id ? '收起' : '详情'}
                    </button>
                    <button onClick={() => handleEditClick(record)} className="btn-link edit">
                      修改
                    </button>
                  </td>
                </tr>
                {expandedId === record.id && (
                  <tr className="expand-row">
                    <td colSpan={8}>
                      <div className="expand-content">
                        <div className="expand-section">
                          <h4>状态详情</h4>
                          <p><strong>处理状态：</strong>
                            <span className={`status-tag ${STATUS_CLASS[record.processingStatus]}`}>
                              {STATUS_LABELS[record.processingStatus]}
                            </span>
                          </p>
                          <p><strong>状态原因：</strong>{record.statusReason}</p>
                          {record.isJumpPoint && (
                            <p><strong>跳变说明：</strong>{record.jumpDetail}</p>
                          )}
                        </div>
                        <div className="expand-section">
                          <h4>数据来源</h4>
                          <p><strong>源文件：</strong>{record.sourceFile}</p>
                          <p><strong>源字段：</strong>{record.sourceFields.join(', ')}</p>
                          <p><strong>原始数据：</strong></p>
                          <pre className="raw-data">
                            {JSON.stringify(record.rawData, null, 2)}
                          </pre>
                        </div>
                        <div className="expand-section">
                          <h4>修改历史</h4>
                          {renderHistory(record.id)}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {editingId === record.id && (
                  <tr className="edit-row">
                    <td colSpan={8}>
                      <div className="edit-form">
                        <h4>修改记录状态</h4>
                        <div className="form-row">
                          <label>操作人：</label>
                          <input
                            type="text"
                            value={operator}
                            onChange={e => setOperator(e.target.value)}
                          />
                        </div>
                        <div className="form-row">
                          <label>新状态：</label>
                          <select
                            value={editStatus}
                            onChange={e => setEditStatus(e.target.value as ProcessingStatus)}
                          >
                            {Object.entries(STATUS_LABELS).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-row">
                          <label>原因说明：</label>
                          <textarea
                            value={editReason}
                            onChange={e => setEditReason(e.target.value)}
                            rows={2}
                          />
                        </div>
                        <div className="form-actions">
                          <button onClick={() => handleSaveEdit(record.id)} className="btn-primary">
                            保存
                          </button>
                          <button onClick={() => setEditingId(null)} className="btn-secondary">
                            取消
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
