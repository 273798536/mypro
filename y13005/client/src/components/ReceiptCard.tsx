import type { ReceiptWithReview } from '../types';
import ReviewHistoryTimeline from './ReviewHistoryTimeline';
import ReviewOverrideForm from './ReviewOverrideForm';
import { useState } from 'react';

interface Props {
  receipt: ReceiptWithReview;
  onSaved: () => void;
}

const statusTag: Record<string, string> = {
  pass: 'tag-pass',
  pending: 'tag-pending',
  fail: 'tag-fail',
  needs_material: 'tag-needs',
};
const statusText: Record<string, string> = {
  pass: '可放行',
  pending: '待核实',
  fail: '驳回',
  needs_material: '需补材料',
};

export default function ReceiptCard({ receipt, onSaved }: Props) {
  const [expanded, setExpanded] = useState(false);
  const r = receipt;
  const review = r.review;
  const rawObj = tryParse(r.raw_data);

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {r.receipt_no || '无回执号'}
            {r.is_currency_anomaly === 1 && (
              <span className="tag tag-anomaly" style={{ marginLeft: 8 }}>币种异常·已隔离</span>
            )}
            {review?.is_manual_override === 1 && (
              <span className="tag tag-override" style={{ marginLeft: 8 }}>人工改判过</span>
            )}
          </div>
          <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
            {r.payer || '付款方未记录'} · {r.amount ? `¥${r.amount.toLocaleString()}` : '金额缺失'} · {r.currency || '币种未记录'}
            {r.source_file && <span style={{ marginLeft: 10 }}>来源：{r.source_file}</span>}
          </div>
          {review && (
            <div style={{ marginTop: 6 }}>
              <span className={`tag ${statusTag[review.status]}`}>{statusText[review.status]}</span>
              <span style={{ marginLeft: 8, fontSize: 13 }}>
                {review.manual_conclusion || review.initial_conclusion || '暂无结论'}
              </span>
            </div>
          )}
        </div>
        <button className="btn" onClick={() => setExpanded((v) => !v)}>
          {expanded ? '收起详情' : '查看详情 / 改判'}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 18 }}>
          {review?.review_guidance && (
            <div className={`guidance-box ${review.status === 'needs_material' ? 'need' : review.status === 'pass' ? 'ok' : ''}`}>
              <strong>复核指引：</strong>{review.review_guidance}
            </div>
          )}
          {review?.needs_material && (
            <div className="guidance-box need" style={{ marginTop: 10 }}>
              <strong>仍需补充的材料：</strong>{review.needs_material}
            </div>
          )}

          <div className="receipt-detail" style={{ marginTop: 18 }}>
            <div>
              <div className="card-title" style={{ fontSize: 13 }}>回执业务字段</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field k="托管人/受托人" v={r.trustee_name} />
                <Field k="付款方" v={r.payer} />
                <Field k="金额" v={r.amount ? r.amount.toLocaleString() : null} />
                <Field k="币种 / 预期" v={r.currency ? `${r.currency}${r.expected_currency ? ` / ${r.expected_currency}` : ''}` : null} />
                <Field k="到账日期" v={r.receipt_date} />
                <Field k="备注" v={r.remark} />
              </div>

              {review && (
                <div style={{ marginTop: 16 }}>
                  <div className="card-title" style={{ fontSize: 13 }}>当前复核结论</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Field k="系统初判" v={review.initial_conclusion} />
                    <Field k="人工复核" v={review.manual_conclusion} />
                    <Field k="复核人" v={review.reviewer} />
                    <Field k="复核时间" v={review.created_at} />
                  </div>
                  {review.override_reason && (
                    <div className="field-box" style={{ marginTop: 10 }}>
                      <div className="k">改判原因</div>
                      <div className="v">{review.override_reason}</div>
                    </div>
                  )}
                  {review.override_impact && (
                    <div className="field-box" style={{ marginTop: 10 }}>
                      <div className="k">对批次结论的影响</div>
                      <div className="v">{review.override_impact}</div>
                    </div>
                  )}
                  {review.supplementary_material && (
                    <div className="field-box" style={{ marginTop: 10 }}>
                      <div className="k">已补充材料</div>
                      <div className="v">{review.supplementary_material}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="card-title" style={{ fontSize: 13 }}>
                托管回执原始数据 <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 12 }}>(保留原始痕迹，不做清洗)</span>
              </div>
              <div className="raw-box">
                {rawObj ? JSON.stringify(rawObj, null, 2) : r.raw_data}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                * 原始回执中含"旧口径字段""可疑字段"等脏数据，原样保留，不做隐藏或清洗，便于追溯。
              </div>
            </div>
          </div>

          <div className="section-gap">
            <div className="card-title" style={{ fontSize: 14 }}>历史版本时间线（含每次人工改判）</div>
            <ReviewHistoryTimeline histories={r.histories} />
          </div>

          <div className="section-gap">
            <ReviewOverrideForm receipt={receipt} onSaved={onSaved} />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ k, v }: { k: string; v: string | number | null | undefined }) {
  return (
    <div className="field-box">
      <div className="k">{k}</div>
      <div className="v">{v != null && v !== '' ? String(v) : '-'}</div>
    </div>
  );
}

function tryParse(s: string): unknown | null {
  try { return JSON.parse(s); } catch { return null; }
}
