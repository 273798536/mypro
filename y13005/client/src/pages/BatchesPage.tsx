import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listBatches } from '../api';
import type { Batch } from '../types';

const statusTag: Record<string, string> = {
  pending: 'tag-pending',
  reviewing: 'tag-reviewing',
  completed: 'tag-pass',
  rejected: 'tag-fail',
};
const statusText: Record<string, string> = {
  pending: '待复核',
  reviewing: '复核中',
  completed: '已完成',
  rejected: '已驳回',
};

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listBatches().then((b) => { setBatches(b); setLoading(false); });
  }, []);

  return (
    <>
      <div className="page-title">ABS现金流批次复核</div>
      <div className="page-sub">托管回执溯源保留 · 人工改判全程留痕 · 币种异常单独隔离</div>

      <div className="card">
        <div className="card-title">所有批次</div>
        {loading ? <div className="empty">加载中...</div> : (
          <table>
            <thead>
              <tr>
                <th>批次编号</th>
                <th>批次名称</th>
                <th>专项计划</th>
                <th>兑付日</th>
                <th>总金额（元）</th>
                <th>复核人</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td className="row-link"><Link to={`/batches/${b.id}`}>{b.batch_no}</Link></td>
                  <td>{b.batch_name}</td>
                  <td>{b.abs_name}</td>
                  <td>{b.payment_date}</td>
                  <td>{b.total_amount ? b.total_amount.toLocaleString() : '-'}</td>
                  <td>{b.reviewer || '-'}</td>
                  <td><span className={`tag ${statusTag[b.status]}`}>{statusText[b.status]}</span></td>
                  <td><Link className="link-btn" to={`/batches/${b.id}`}>进入复核</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
