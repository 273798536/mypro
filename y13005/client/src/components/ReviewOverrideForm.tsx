import { useState } from 'react';
import { submitReview } from '../api';
import type { ReceiptWithReview } from '../types';

interface Props {
  receipt: ReceiptWithReview;
  onSaved: () => void;
}

export default function ReviewOverrideForm({ receipt, onSaved }: Props) {
  const [reviewer, setReviewer] = useState('小林');
  const [manualConclusion, setManualConclusion] = useState(receipt.review?.manual_conclusion || '');
  const [status, setStatus] = useState<'pass' | 'fail' | 'needs_material' | 'pending'>(
    (receipt.review?.status === 'anomaly' ? 'pending' : receipt.review?.status) || 'pending'
  );
  const [overrideReason, setOverrideReason] = useState(receipt.review?.override_reason || '');
  const [overrideImpact, setOverrideImpact] = useState(receipt.review?.override_impact || '');
  const [supplementary, setSupplementary] = useState(receipt.review?.supplementary_material || '');
  const [needsMaterial, setNeedsMaterial] = useState(receipt.review?.needs_material || '');
  const [guidance, setGuidance] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!manualConclusion.trim() || !overrideReason.trim() || !overrideImpact.trim()) {
      alert('请务必填写：改判后结论、改判原因、对批次结论的影响说明');
      return;
    }
    setSubmitting(true);
    try {
      await submitReview(receipt.id, {
        reviewer,
        manual_conclusion: manualConclusion,
        override_reason: overrideReason,
        override_impact: overrideImpact,
        status,
        supplementary_material: supplementary || undefined,
        needs_material: needsMaterial || undefined,
        review_guidance: guidance || undefined,
      });
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card-title" style={{ fontSize: 14 }}>人工改判 / 补充复核</div>

      <div className="grid-2">
        <div className="form-row">
          <label>复核人</label>
          <input value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="请输入姓名" />
        </div>
        <div className="form-row">
          <label>复核结论</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="pending">待继续核实</option>
            <option value="pass">可放行</option>
            <option value="fail">驳回</option>
            <option value="needs_material">需补材料</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <label>改判后结论（必填）</label>
        <textarea
          value={manualConclusion}
          onChange={(e) => setManualConclusion(e.target.value)}
          placeholder="例如：通过-经核实大写为笔误；或 驳回-到账金额与计划不一致"
        />
        <div className="hint">这是下一班复核人员第一眼会看到的结论，写清楚，别只写"已改判"</div>
      </div>

      <div className="form-row">
        <label>为什么改判？改判原因（必填）</label>
        <textarea
          value={overrideReason}
          onChange={(e) => setOverrideReason(e.target.value)}
          placeholder="说明核实过程：与托管行电话确认、补充了银行流水、发现原始回执脏字段属于旧口径等等"
        />
      </div>

      <div className="form-row">
        <label>改判对本批次结论的影响（必填）</label>
        <textarea
          value={overrideImpact}
          onChange={(e) => setOverrideImpact(e.target.value)}
          placeholder="例如：该笔占总金额34%，放行后批次整体结论可过；或 该笔异常不影响整体，但需单独记录"
        />
        <div className="hint">下一班人最想知道的：这条改判会不会影响最终批次能不能过</div>
      </div>

      <div className="grid-2">
        <div className="form-row">
          <label>补充材料（如有）</label>
          <input
            value={supplementary}
            onChange={(e) => setSupplementary(e.target.value)}
            placeholder="如：托管行电话沟通记录截图_20260609.png"
          />
        </div>
        <div className="form-row">
          <label>还需要补哪些材料</label>
          <input
            value={needsMaterial}
            onChange={(e) => setNeedsMaterial(e.target.value)}
            placeholder='如选"需补材料"，请在此列出需补清单'
          />
        </div>
      </div>

      <div className="form-row">
        <label>给下一班 / 给项目经理的复核指引（非技术说明）</label>
        <textarea
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          placeholder="直接说人话：哪条材料还需要补、哪条已经可以放行、还剩什么风险点。别写技术说明。"
        />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? '提交中...' : '保存改判（写入历史）'}
        </button>
      </div>
    </div>
  );
}
