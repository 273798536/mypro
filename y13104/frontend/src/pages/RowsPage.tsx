import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { sheetApi } from '../api';
import type { ParameterRow, ParameterSheet } from '../types';

export default function RowsPage() {
  const { id } = useParams<{ id: string }>();
  const sheetId = Number(id);
  const [sheet, setSheet] = useState<ParameterSheet | null>(null);
  const [rows, setRows] = useState<ParameterRow[]>([]);
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [s, r] = await Promise.all([
          sheetApi.get(sheetId),
          sheetApi.rows(sheetId, onlyIssues),
        ]);
        setSheet(s);
        setRows(r);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sheetId, onlyIssues]);

  if (loading) return <div className="empty">加载中...</div>;

  return (
    <div>
      <div className="section-title">
        <h2>参数表明细 · {sheet?.file_name}</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#57606f' }}>
            <input
              type="checkbox"
              checked={onlyIssues}
              onChange={e => setOnlyIssues(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            只看有问题的行
          </label>
          <Link to={`/sheets/${sheetId}/review`} className="btn secondary">
            返回复核页
          </Link>
          <Link to="/" className="btn secondary">列表</Link>
        </div>
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <div className="empty">暂无数据</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Excel行号</th>
                <th>代码</th>
                <th>名称</th>
                <th>X值</th>
                <th>Y值</th>
                <th>权重</th>
                <th>单位</th>
                <th>单位来源</th>
                <th>状态</th>
                <th>警告</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
              <tr key={r.id}>
                <td>{r.excel_row_number}</td>
                <td>{r.security_code || '-'}</td>
                <td>{r.security_name || '-'}</td>
                <td>{r.x_value?.toFixed(4) ?? '-'}</td>
                <td>{r.y_value?.toFixed(4) ?? '-'}</td>
                <td>{r.weight?.toFixed(4) ?? '-'}</td>
                <td>{r.unit || '-'}</td>
                <td>
                  {r.unit_source ? (
                    <span className="tag">{r.unit_source}</span>
                  ) : '-'}
                </td>
                <td>
                  {r.row_status === 'ok' ? (
                    <span className="badge ok">正常</span>
                  ) : (
                    <span className="badge warning">有问题</span>
                  )}
                </td>
                <td className="warning-text" style={{ maxWidth: 200, fontSize: 11 }}>
                  {r.warnings?.slice(0, 1).join('；')}
                  {r.warnings && r.warnings.length > 1 && ` +${r.warnings.length - 1}`}
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
