import { useState, useEffect } from 'react';
import { api, LABELS } from '../api';
import type {
  ReconciliationRecord,
  HistoryChangeLog,
  ExceptionQueueItem,
  ReviewConclusion,
} from '../types';

interface Props {
  recordId: string;
  onClose: () => void;
  onReviewed: () => void;
}

export default function DetailModal({ recordId, onClose, onReviewed }: Props) {
  const [data, setData] = useState<{
    record: ReconciliationRecord;
    history: HistoryChangeLog[];
    exception?: ExceptionQueueItem;
  } | null>(null);
  const [conclusion, setConclusion] = useState<ReviewConclusion>('supplement');
  const [remark, setRemark] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [materials, setMaterials] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getRecord(recordId).then((d) => {
      setData(d);
      if (d.record.remark) setRemark(d.record.remark);
    });
  }, [recordId]);

  if (!data) return null;
  const { record, history, exception } = data;

  const handleSubmit = async () => {
    if (!changeReason.trim()) {
      alert('请填写改判/复核原因');
      return;
    }
    setSubmitting(true);
    try {
      const matList = materials
        .split(/[,，、\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      await api.reviewRecord(recordId, {
        conclusion,
        remark,
        changeReason,
        supplementaryMaterials: matList.length ? matList : undefined,
      });
      onReviewed();
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const historyClass = (h: HistoryChangeLog) => {
    if (h.newConclusion === 'reject') return 'reject';
    if (h.newConclusion === 'supplement') return 'supplement';
    if (h.newConclusion === 'pass') return 'pass';
    return '';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            对账详情 · {record.businessNo}
            {record.isDualCaliberConflict && (
              <span
                className="status-tag"
                style={{ marginLeft: 10, background: '#fff0f6', color: '#eb2f96', borderColor: '#ffadd2' }}
              >
                双口径冲突
              </span>
            )}
            {record.isSplitRepayment && (
              <span
                className="status-tag"
                style={{ marginLeft: 10, background: '#f9f0ff', color: '#722ed1', borderColor: '#d3adf7' }}
              >
                回款拆分
              </span>
            )}
            {record.boundarySampleTag && (
              <span
                className="status-tag"
                style={{ marginLeft: 10, background: '#fffbe6', color: '#d48806', borderColor: '#ffe58f' }}
              >
                边界样本
              </span>
            )}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {record.isDualCaliberConflict && (
            <div className="alert alert-danger">
              ⚠ 双口径冲突：该笔资金同时被「{LABELS.calibers[record.primaryCaliber]}」和
              「{LABELS.calibers[record.secondaryCaliber!]}」两个口径认定，需人工裁定归属
            </div>
          )}
          {record.isSplitRepayment && (
            <div className="alert alert-warn">
              ⚠ 回款拆分记录：该笔为多笔拆分入账之一（父单 {record.splitParentId}），
              复核通过时将自动标注「回款拆分-特殊标注」，不得按单笔正常通过处理
            </div>
          )}
          {record.boundarySampleTag && (
            <div className="alert alert-info">
              📌 边界样本关联：{record.boundarySampleTag} — 本样本结论将作为同类边界案例参考依据
            </div>
          )}
          {exception && exception.isActive && (
            <div className="alert alert-info">
              <span
                className="severity-dot"
                style={{ background: LABELS.severityColor[exception.severity] }}
              />
              <b>异常队列：</b>{exception.reason}
              <div style={{ marginTop: 4, fontSize: 11, color: '#595959' }}>
                关联口径：{exception.caliberFilter.map((c) => LABELS.calibers[c]).join('、')}
              </div>
            </div>
          )}

          <div className="detail-grid">
            <div className="detail-item"><span className="k">业务编号：</span><span className="v">{record.businessNo}</span></div>
            <div className="detail-item"><span className="k">业务日期：</span><span className="v">{record.businessDate}</span></div>
            <div className="detail-item"><span className="k">客户名称：</span><span className="v">{record.clientName}</span></div>
            <div className="detail-item"><span className="k">客户编号：</span><span className="v">{record.clientId}</span></div>
            <div className="detail-item"><span className="k">产品名称：</span><span className="v">{record.productName}</span></div>
            <div className="detail-item"><span className="k">产品代码：</span><span className="v">{record.productCode}</span></div>
            <div className="detail-item">
              <span className="k">交易金额：</span>
              <span className="v" style={{ fontFamily: 'monospace', color: '#cf1322' }}>
                ¥{record.amount.toLocaleString()}
              </span>
            </div>
            <div className="detail-item"><span className="k">当前状态：</span>
              <span className="v">
                <span
                  className="status-tag"
                  style={{
                    background: LABELS.statusColor[record.status] + '15',
                    color: LABELS.statusColor[record.status],
                    borderColor: LABELS.statusColor[record.status] + '50',
                  }}
                >
                  {LABELS.statuses[record.status]}
                </span>
              </span>
            </div>
            <div className="detail-item"><span className="k">主口径：</span><span className="v">{LABELS.calibers[record.primaryCaliber]}</span></div>
            <div className="detail-item">
              <span className="k">次口径：</span>
              <span className="v">{record.secondaryCaliber ? LABELS.calibers[record.secondaryCaliber] : '-'}</span>
            </div>
            <div className="detail-item full">
              <span className="k">当前备注：</span>
              <span className="v">{record.remark || '（无）'}</span>
            </div>
          </div>

          <div className="section-subtitle">历史变更记录（旧材料、新备注、改判原因完整留痕）</div>
          <div style={{ padding: '12px 0' }}>
            {history.length === 0 ? (
              <div className="empty-state">暂无历史变更</div>
            ) : (
              history.map((h) => (
                <div key={h.id} className={`history-item ${historyClass(h)}`}>
                  <div className="head">
                    <span className="who">
                      {h.changedBy}
                      {h.newConclusion && (
                        <span
                          className="status-tag"
                          style={{ marginLeft: 8, fontSize: 10 }}
                        >
                          结论：{LABELS.conclusions[h.newConclusion]}
                        </span>
                      )}
                    </span>
                    <span className="when">{h.changedAt.replace('T', ' ').slice(0, 19)}</span>
                  </div>
                  <div className="reason"><b>改判原因：</b>{h.changeReason}</div>
                  {(h.previousRemark || h.newRemark) && (
                    <div className="diff">
                      {h.previousRemark && <div>旧备注：<span className="old">{h.previousRemark}</span></div>}
                      {h.newRemark && <div>新备注：<span className="new">{h.newRemark}</span></div>}
                    </div>
                  )}
                  {(h.previousStatus !== h.newStatus) && (
                    <div className="diff" style={{ marginTop: 4 }}>
                      状态变更：
                      {h.previousStatus && <span className="old">{LABELS.statuses[h.previousStatus]}</span>}
                      {' → '}
                      {h.newStatus && <span className="new">{LABELS.statuses[h.newStatus]}</span>}
                    </div>
                  )}
                  {((h.previousSupplementaryMaterials && h.previousSupplementaryMaterials.length > 0) ||
                    (h.newSupplementaryMaterials && h.newSupplementaryMaterials.length > 0) ||
                    (h.supplementaryMaterials && h.supplementaryMaterials.length > 0)) && (
                    <div className="diff" style={{ marginTop: 6 }}>
                      {h.previousSupplementaryMaterials && h.previousSupplementaryMaterials.length > 0 && (
                        <div style={{ marginBottom: 4 }}>
                          <span style={{ color: '#8c8c8c' }}>旧材料：</span>
                          {h.previousSupplementaryMaterials.map((m, i) => (
                            <span key={i} className="materials-tag" style={{ background: '#fff1f0', borderColor: '#ffa39e', color: '#cf1322', textDecoration: 'line-through' }}>📎 {m}</span>
                          ))}
                        </div>
                      )}
                      {(h.newSupplementaryMaterials && h.newSupplementaryMaterials.length > 0) && (
                        <div>
                          <span style={{ color: '#8c8c8c' }}>新材料：</span>
                          {h.newSupplementaryMaterials.map((m, i) => (
                            <span key={i} className="materials-tag" style={{ background: '#f6ffed', borderColor: '#b7eb8f', color: '#389e0d' }}>📎 {m}</span>
                          ))}
                        </div>
                      )}
                      {(!h.newSupplementaryMaterials || h.newSupplementaryMaterials.length === 0) && h.supplementaryMaterials && h.supplementaryMaterials.length > 0 && (
                        <div>
                          <span style={{ color: '#8c8c8c' }}>补录材料：</span>
                          {h.supplementaryMaterials.map((m, i) => (
                            <span key={i} className="materials-tag">📎 {m}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="section-subtitle">复核操作</div>
          <div style={{ padding: '14px 0 0' }}>
            <div className="form-row">
              <label><span className="req">*</span>复核结论</label>
              <select
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value as ReviewConclusion)}
                style={{ width: '100%' }}
              >
                <option value="pass">放行</option>
                <option value="reject">驳回</option>
                <option value="supplement">待补材料</option>
                <option value="escalate">上报升级</option>
              </select>
            </div>
            <div className="form-row">
              <label><span className="req">*</span>改判/复核原因</label>
              <textarea
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="请填写本次复核裁定的原因，双口径冲突需说明归属口径，回款拆分需注明合并笔数..."
              />
            </div>
            <div className="form-row">
              <label>备注</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="对该笔对账的补充说明"
              />
            </div>
            <div className="form-row">
              <label>补录材料（多个用逗号分隔）</label>
              <input
                type="text"
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                placeholder="例如：风险测评报告,资产证明,投资经验确认书"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>关闭</button>
          <button
            className={`btn ${conclusion === 'reject' ? 'btn-danger' : conclusion === 'supplement' ? 'btn-warn' : 'btn-primary'}`}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '提交中...' : '确认提交复核结论'}
          </button>
        </div>
      </div>
    </div>
  );
}
