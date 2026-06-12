import { useState, useEffect } from 'react';
import { api } from '../api';
import {
  AnchorageRecord,
  ReviewHistory,
  statusLabel,
  reviewLabel,
  DataStatus,
  ReviewStatus,
} from '../types';

interface Props {
  recordId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function RecordDetail({ recordId, onClose, onUpdate }: Props) {
  const [record, setRecord] = useState<AnchorageRecord | null>(null);
  const [history, setHistory] = useState<ReviewHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editLat, setEditLat] = useState(0);
  const [editLng, setEditLng] = useState(0);
  const [editALat, setEditALat] = useState(0);
  const [editALng, setEditALng] = useState(0);
  const [remark, setRemark] = useState('');
  const [reviewRemark, setReviewRemark] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoRemark, setPhotoRemark] = useState('');
  const [statusFilter, setStatusFilter] = useState<DataStatus | ''>('');
  const [reviewFilter, setReviewFilter] = useState<ReviewStatus | ''>('');

  const load = async () => {
    setLoading(true);
    try {
      const [r, h] = await Promise.all([api.getRecord(recordId), api.getHistory(recordId)]);
      setRecord(r);
      setHistory(h);
      setEditLat(r.reportedLat);
      setEditLng(r.reportedLng);
      setEditALat(r.actualLat);
      setEditALng(r.actualLng);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [recordId]);

  const handleSaveDrift = async () => {
    if (!record) return;
    try {
      const updated = await api.updateDrift(record.id, {
        reportedLat: editLat,
        reportedLng: editLng,
        actualLat: editALat,
        actualLng: editALng,
        reviewer: '调度员',
        remark,
      });
      setRecord(updated);
      setEditMode(false);
      setRemark('');
      onUpdate();
      load();
    } catch (e) {
      alert('保存失败: ' + (e as Error).message);
    }
  };

  const handleStatusChange = async () => {
    if (!record) return;
    try {
      const updated = await api.updateStatus(record.id, {
        status: statusFilter || undefined,
        reviewStatus: reviewFilter || undefined,
        reviewer: '调度员',
        remark: reviewRemark,
      });
      setRecord(updated);
      setReviewRemark('');
      setStatusFilter('');
      setReviewFilter('');
      onUpdate();
      load();
    } catch (e) {
      alert('操作失败: ' + (e as Error).message);
    }
  };

  const handleUploadPhoto = async () => {
    if (!record || !photoFile) return;
    try {
      const updated = await api.attachPhoto(record.id, photoFile, photoRemark);
      setRecord(updated);
      setPhotoFile(null);
      setPhotoRemark('');
      onUpdate();
    } catch (e) {
      alert('上传失败: ' + (e as Error).message);
    }
  };

  const quickApprove = async () => {
    if (!record) return;
    try {
      const updated = await api.updateStatus(record.id, {
        reviewStatus: 'approved',
        reviewer: '调度员',
        remark: reviewRemark || '复核通过，数据准确',
      });
      setRecord(updated);
      setReviewRemark('');
      onUpdate();
      load();
    } catch (e) {
      alert('操作失败');
    }
  };

  if (loading || !record) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-body">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            记录详情 · {record.recordNo}
          </h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="source-info">
            <span><strong>来源文件：</strong>{record.sourceFile}</span>
            <span><strong>来源行号：</strong>第 {record.sourceRow} 行</span>
            <span><strong>导入时间：</strong>{new Date(record.importedAt).toLocaleString('zh-CN')}</span>
          </div>

          <div className="note-box">
            🧭 <strong>倒查链路：</strong>
            从这条漂移记录可以追溯到：① 来源文件与行号 ② 原始上报/实际坐标 ③ 计算公式与过程
            ④ 关联巡检照片 ⑤ 历次人工修正与审核留痕。
          </div>

          <div className="section-title">基本信息</div>
          <div className="form-row">
            <div className="form-group">
              <label>船名</label>
              <input type="text" value={record.shipName} readOnly />
            </div>
            <div className="form-group">
              <label>避风锚地</label>
              <input type="text" value={record.anchorageName} readOnly />
            </div>
            <div className="form-group">
              <label>台风名称</label>
              <input type="text" value={record.typhoonName} readOnly />
            </div>
            <div className="form-group">
              <label>报告日期</label>
              <input type="text" value={record.reportDate} readOnly />
            </div>
          </div>

          <div className="section-title">轨迹漂移计算</div>

          <div className="calc-box">
            <div className={record.driftDistance !== null ? 'result' : 'result fail'}>
              {record.driftDistance !== null ? record.driftDistance : '计算失败'}
              <span className="unit">海里</span>
            </div>
            {record.driftCalculationNote && (
              <div className="drift-note">{record.driftCalculationNote}</div>
            )}
          </div>

          {editMode ? (
            <div>
              <div className="form-row">
                <div className="form-group">
                  <label>上报纬度</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editLat}
                    onChange={(e) => setEditLat(parseFloat(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>上报经度</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editLng}
                    onChange={(e) => setEditLng(parseFloat(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>实际纬度</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editALat}
                    onChange={(e) => setEditALat(parseFloat(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>实际经度</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editALng}
                    onChange={(e) => setEditALng(parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>修正备注（留痕）</label>
                <textarea
                  rows={2}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="说明修改原因..."
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(false)}>
                  取消
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSaveDrift}>
                  保存修正
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(true)}>
                ✏️ 人工修正坐标
              </button>
            </div>
          )}

          <div className="section-title">复核与状态</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <span className={`status-tag status-${record.status}`}>
              数据：{statusLabel[record.status]}
            </span>
            <span className={`status-tag review-${record.reviewStatus}`}>
              复核：{reviewLabel[record.reviewStatus]}
            </span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>修改数据状态</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as DataStatus)}
              >
                <option value="">— 不修改 —</option>
                <option value="available">可用</option>
                <option value="pending">暂缓</option>
                <option value="recollect">需重新采集</option>
              </select>
            </div>
            <div className="form-group">
              <label>修改复核状态</label>
              <select
                value={reviewFilter}
                onChange={(e) => setReviewFilter(e.target.value as ReviewStatus)}
              >
                <option value="">— 不修改 —</option>
                <option value="pending">待确认</option>
                <option value="approved">通过</option>
                <option value="rejected">驳回</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>复核备注（留痕）</label>
            <textarea
              rows={2}
              value={reviewRemark}
              onChange={(e) => setReviewRemark(e.target.value)}
              placeholder="记录复核意见..."
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {record.reviewStatus !== 'approved' && (
              <button className="btn btn-success btn-sm" onClick={quickApprove}>
                ✓ 快速通过
              </button>
            )}
            {(statusFilter || reviewFilter) && (
              <button className="btn btn-primary btn-sm" onClick={handleStatusChange}>
                提交状态变更
              </button>
            )}
          </div>

          <div className="section-title">
            巡检照片 ({record.photos.length} 张)
          </div>
          <div className="form-group">
            <label>上传关联照片</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            />
            <input
              type="text"
              placeholder="照片备注（拍摄位置/角度/异常点...）"
              value={photoRemark}
              onChange={(e) => setPhotoRemark(e.target.value)}
              style={{ marginTop: 6 }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button
              className="btn btn-primary btn-sm"
              disabled={!photoFile}
              onClick={handleUploadPhoto}
            >
              上传照片
            </button>
          </div>

          {record.photos.length > 0 ? (
            <div className="photo-grid">
              {record.photos.map((p) => (
                <div key={p.id} className="photo-item">
                  <img src={`/api/photos/${p.filePath}`} alt={p.fileName} />
                  <div className="photo-info">
                    <div className="photo-name" title={p.fileName}>{p.fileName}</div>
                    <div className="photo-time">
                      {new Date(p.uploadTime).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    {p.remark && (
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: 2 }}>
                        {p.remark}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
              暂无关联照片
            </div>
          )}

          <div className="section-title">处理留痕（{history.length} 条）</div>
          {history.length > 0 ? (
            <div className="timeline">
              {[...history].reverse().map((h) => (
                <div key={h.id} className="timeline-item">
                  <div className="time">
                    {new Date(h.reviewedAt).toLocaleString('zh-CN')} · {h.reviewer}
                  </div>
                  <div className="title">
                    {h.fieldName === 'status'
                      ? '数据状态变更'
                      : h.fieldName === 'reviewStatus'
                      ? '复核状态变更'
                      : '坐标修正'}
                  </div>
                  <div className="detail">
                    <div>
                      <span className="diff">{String(h.oldValue ?? '—')}</span>
                      <span style={{ margin: '0 6px' }}>→</span>
                      <span className="diff">{String(h.newValue ?? '—')}</span>
                    </div>
                    {h.remark && (
                      <div style={{ marginTop: 4, color: '#64748b' }}>
                        备注：{h.remark}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
              暂无处理记录
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
