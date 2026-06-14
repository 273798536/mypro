import { useEffect, useState } from 'react';
import { anomalyApi, rowApi } from '../api';
import type { AnomalyPoint, ParameterRow } from '../types';

interface Props {
  anomaly: AnomalyPoint | null;
  onClose: () => void;
  onUpdated?: () => void;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  processed: { label: '已处理', cls: 'processed' },
  pending_material: { label: '待补材料', cls: 'pending' },
  manual_overrule: { label: '人工改判', cls: 'manual' },
};

export default function AnomalyDetailModal({ anomaly, onClose, onUpdated }: Props) {
  const [originRow, setOriginRow] = useState<ParameterRow | null>(null);
  const [loadingRow, setLoadingRow] = useState(false);
  const [reviewStatus, setReviewStatus] = useState(anomaly?.review_status || '');
  const [reviewerNote, setReviewerNote] = useState(anomaly?.reviewer_note || '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editReason, setEditReason] = useState('');

  useEffect(() => {
    if (anomaly) {
      setReviewStatus(anomaly.review_status || '');
      setReviewerNote(anomaly.reviewer_note || '');
      setOriginRow(null);
      setEditField(null);
      setEditValue('');
      setEditReason('');
      setErrorMsg(null);
    }
  }, [anomaly]);

  if (!anomaly) return null;

  const loadOriginRow = async () => {
    if (originRow) return;
    setLoadingRow(true);
    try {
      const row = await anomalyApi.getOriginRow(anomaly.id);
      setOriginRow(row);
    } finally {
      setLoadingRow(false);
    }
  };

  const handleSaveReview = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      await anomalyApi.updateReview(anomaly.id, {
        review_status: reviewStatus,
        reviewer_note: reviewerNote,
      });
      onUpdated?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || err?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleEditField = async () => {
    if (!editField || !originRow) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await rowApi.edit(originRow.id, editField, editValue, '复核人', editReason);
      setEditField(null);
      setEditValue('');
      setEditReason('');
      const row = await rowApi.get(originRow.id);
      setOriginRow(row);
      onUpdated?.();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || err?.message || '修改字段失败');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (field: string, currentValue: any) => {
    setEditField(field);
    setEditValue(currentValue != null ? String(currentValue) : '');
    loadOriginRow();
  };

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>异常点详情</h3>

        <div className="three-col" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div className="stat-box">
            <div className="label">证券代码</div>
            <div className="value" style={{ fontSize: 16 }}>{anomaly.security_code || '-'}</div>
          </div>
          <div className="stat-box">
            <div className="label">证券名称</div>
            <div className="value" style={{ fontSize: 16 }}>{anomaly.security_name || '-'}</div>
          </div>
          <div className="stat-box">
            <div className="label">当前状态</div>
            <div className="value">
              <span className={`badge ${STATUS_LABELS[anomaly.review_status]?.cls || ''}`}>
                {STATUS_LABELS[anomaly.review_status]?.label || anomaly.review_status}
              </span>
            </div>
          </div>
        </div>

        <div className="three-col" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div className="stat-box">
            <div className="label">实际 Y</div>
            <div className="value" style={{ fontSize: 16 }}>{anomaly.y_value?.toFixed(4)}</div>
          </div>
          <div className="stat-box">
            <div className="label">预测 Y</div>
            <div className="value" style={{ fontSize: 16 }}>{anomaly.predicted_y?.toFixed(4)}</div>
          </div>
          <div className="stat-box">
            <div className="label">Z 分数</div>
            <div className="value" style={{ fontSize: 16, color: '#ff4757' }}>{anomaly.z_score?.toFixed(2)}</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h3>异常原因</h3>
          <p style={{ fontSize: 13, color: '#57606f' }}>{anomaly.anomaly_reason || '-'}</p>
        </div>

        <div className="tabs">
          <div className={`tab ${!editField ? 'active' : ''}`} onClick={() => loadOriginRow()}>
            追踪原始材料
          </div>
        </div>

        {!originRow ? (
          <div>
            <p style={{ fontSize: 12, color: '#747d8c', marginBottom: 8 }}>
              点击下方按钮查看原始参数表行（含原始字段名和值）
            </p>
            <button className="btn small" onClick={loadOriginRow} disabled={loadingRow}>
              {loadingRow ? '加载中...' : '查看原始行'}
            </button>
          </div>
        ) : (
          <div>
            <div className="form-row">
              <label>Excel行号</label>
              <span>{originRow.excel_row_number}</span>
            </div>

            <h3>规范字段</h3>
            <table>
              <thead>
                <tr>
                  <th>字段</th>
                  <th>值</th>
                  <th>说明</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>权重 (weight)</td>
                  <td>{originRow.weight ?? '-'}</td>
                  <td>
                    {originRow.warnings?.includes('权重缺失')
                      ? <span className="warning-text">缺失</span>
                      : '正常'}
                  </td>
                  <td>
                    <button className="btn small secondary" onClick={() => startEdit('weight', originRow.weight)}>
                      修改
                    </button>
                  </td>
                </tr>
                <tr>
                  <td>X 值</td>
                  <td>{originRow.x_value ?? '-'}</td>
                  <td>-</td>
                  <td>
                    <button className="btn small secondary" onClick={() => startEdit('x_value', originRow.x_value)}>
                      修改
                    </button>
                  </td>
                </tr>
                <tr>
                  <td>Y 值</td>
                  <td>{originRow.y_value ?? '-'}</td>
                  <td>-</td>
                  <td>
                    <button className="btn small secondary" onClick={() => startEdit('y_value', originRow.y_value)}>
                      修改
                    </button>
                  </td>
                </tr>
                <tr>
                  <td>单位</td>
                  <td>{originRow.unit ?? '-'}</td>
                  <td>
                    {originRow.unit_source ? (
                      <span className="tag">{originRow.unit_source}</span>
                    ) : (
                      <span className="warning-text">未识别</span>
                    )}
                  </td>
                  <td>
                    <button className="btn small secondary" onClick={() => startEdit('unit', originRow.unit)}>
                      修改
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ marginTop: 16 }}>原始参数表行（一字不差）</h3>
            <div className="raw-data-grid">
              {Object.entries(originRow.raw_data || {}).map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <div className="key">{k}</div>
                  <div>{v == null ? '' : String(v)}</div>
                </div>
              ))}
            </div>

            {originRow.warnings && originRow.warnings.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <h3>警告</h3>
                <ul style={{ paddingLeft: 20 }}>
                  {originRow.warnings.map((w, i) => (
                    <li key={i} className="warning-text">{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {editField && (
          <div style={{ marginTop: 16, padding: 12, background: '#f8f9fc', borderRadius: 4 }}>
            <h3>修改字段：{editField}</h3>
            <div className="form-row">
              <label>新值</label>
              <input
                type="text"
                className="input"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
              />
            </div>
            <div className="form-row">
              <label>修改原因</label>
              <input
                type="text"
                className="input"
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                placeholder="为什么改？改了依据？"
                style={{ width: 300 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn small" onClick={handleEditField} disabled={saving}>
                保存修改
              </button>
              <button className="btn small secondary" onClick={() => setEditField(null)}>
                取消
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <h3>复核处理</h3>
          <div className="form-row">
            <label>状态</label>
            <select
              className="input"
              value={reviewStatus}
              onChange={e => setReviewStatus(e.target.value)}
            >
              <option value="processed">已处理</option>
              <option value="pending_material">待补材料</option>
              <option value="manual_overrule">人工改判</option>
            </select>
          </div>
          <div className="form-row">
            <label>复核说明</label>
            <textarea
              className="input"
              value={reviewerNote}
              onChange={e => setReviewerNote(e.target.value)}
              rows={3}
              style={{ width: '100%' }}
              placeholder="为什么判定这个状态？参考了什么材料？"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="warning-text" style={{ marginTop: 12, padding: 8, background: '#fff5f5', borderRadius: 4 }}>
            {errorMsg}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn secondary" onClick={onClose}>关闭</button>
          <button className="btn" onClick={handleSaveReview} disabled={saving}>
            {saving ? '保存中...' : '保存复核结论'}
          </button>
        </div>
      </div>
    </div>
  );
}
