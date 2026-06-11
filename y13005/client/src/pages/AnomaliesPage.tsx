import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAnomalies } from '../api';
import type { AnomalyWithBatch } from '../types';

export default function AnomaliesPage() {
  const [rows, setRows] = useState<AnomalyWithBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAnomalies().then((r) => { setRows(r); setLoading(false); });
  }, []);

  return (
    <>
      <div className="page-title">币种异常隔离区</div>
      <div className="page-sub">
        币种不匹配的记录不会被揉进正常结果，单独在此列出，便于项目经理和风控核实。
      </div>

      <div className="guidance-box need">
        <strong>操作指引：</strong>以下记录因托管回执币种与专项计划本位币不一致被隔离。
        请与托管行核实后，在对应批次内修正判断并补充说明，隔离记录会同步更新。
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">待处理币种异常</div>
        {loading ? <div className="empty">加载中...</div> : rows.length === 0 ? (
          <div className="empty">暂无币种异常记录 ✓</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>所属批次</th>
                <th>回执号</th>
                <th>检测币种</th>
                <th>预期币种</th>
                <th>金额</th>
                <th>说明</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>{a.batch_no} · {a.batch_name}</td>
                  <td>{a.receipt_no || '-'}</td>
                  <td><span className="tag tag-anomaly">{a.detected_currency || '-'}</span></td>
                  <td>{a.expected_currency || '-'}</td>
                  <td>{a.amount ? a.amount.toLocaleString() : '-'}</td>
                  <td style={{ maxWidth: 320 }}>{a.description}</td>
                  <td><Link className="link-btn" to={`/batches/${a.batch_id}`}>前往处理</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
