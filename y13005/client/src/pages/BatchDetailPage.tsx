import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBatchDetail } from '../api';
import type { BatchDetail } from '../types';
import ReceiptCard from '../components/ReceiptCard';

export default function BatchDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!id) return;
    getBatchDetail(Number(id)).then((d) => { setData(d); setLoading(false); });
  }, [id, reloadToken]);

  const refresh = () => setReloadToken((t) => t + 1);

  if (loading) return <div className="empty">加载中...</div>;
  if (!data) return <div className="empty">批次不存在</div>;

  const anomalyReceipts = data.receipts.filter(r => r.is_currency_anomaly === 1);
  const normalReceipts = data.receipts.filter(r => r.is_currency_anomaly !== 1);
  const needMaterial = data.receipts.filter(r => r.review?.needs_material || r.review?.status === 'needs_material');
  const passable = data.receipts.filter(r => r.review?.status === 'pass');

  return (
    <>
      <Link className="back-link" to="/">← 返回批次列表</Link>
      <div className="page-title">{data.batch_no} · {data.batch_name}</div>
      <div className="page-sub">
        专项计划：{data.abs_name} · 兑付日：{data.payment_date}
        {data.reviewer && ` · 当前复核人：${data.reviewer}`}
      </div>

      <div className="stat-grid">
        <div className="stat-card"><div className="num">{data.stats.total}</div><div className="label">托管回执总数</div></div>
        <div className="stat-card ok"><div className="num">{data.stats.pass}</div><div className="label">可放行</div></div>
        <div className="stat-card"><div className="num">{data.stats.pending}</div><div className="label">待核实</div></div>
        <div className="stat-card warn"><div className="num">{data.stats.needs_material}</div><div className="label">需补材料</div></div>
        <div className="stat-card danger"><div className="num">{data.stats.anomaly}</div><div className="label">币种异常(已隔离)</div></div>
        <div className="stat-card muted"><div className="num">{data.stats.overridden}</div><div className="label">人工改判过</div></div>
      </div>

      {needMaterial.length > 0 && (
        <div className="guidance-box need">
          <strong>小林注意：还有 {needMaterial.length} 条需要补材料 ——</strong>
          {needMaterial.map((r, i) => (
            <span key={r.id}>
              {i > 0 && '；'}
              <span style={{ fontWeight: 600 }}>{r.receipt_no || '无回执号'}</span>：{r.review?.needs_material || '材料缺失'}
            </span>
          ))}
        </div>
      )}
      {anomalyReceipts.length > 0 && (
        <div className="guidance-box need" style={{ marginTop: 10 }}>
          <strong>{anomalyReceipts.length} 条币种异常已被单独隔离</strong>，不会混入正常结果，见下方"币种异常隔离区"。
        </div>
      )}
      {passable.length > 0 && passable.length === normalReceipts.length && needMaterial.length === 0 && anomalyReceipts.length === 0 && (
        <div className="guidance-box ok" style={{ marginTop: 10 }}>
          <strong>所有回执已可放行 ✓</strong> 本批次复核可收尾。
        </div>
      )}

      {anomalyReceipts.length > 0 && (
        <div className="section-gap">
          <div className="card-title">
            币种异常隔离区
            <span className="badge-count">{anomalyReceipts.length}</span>
          </div>
          {anomalyReceipts.map(r => (
            <ReceiptCard key={r.id} receipt={r} onSaved={refresh} />
          ))}
        </div>
      )}

      <div className="section-gap">
        <div className="card-title">正常回执（{normalReceipts.length}条）</div>
        {normalReceipts.length === 0
          ? <div className="empty">暂无正常回执</div>
          : normalReceipts.map(r => (
              <ReceiptCard key={r.id} receipt={r} onSaved={refresh} />
            ))}
      </div>
    </>
  );
}
