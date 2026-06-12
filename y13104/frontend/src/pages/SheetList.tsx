import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sheetApi } from '../api';
import type { ParameterSheet } from '../types';

export default function SheetList() {
  const [sheets, setSheets] = useState<ParameterSheet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sheetApi.list().then(data => {
      setSheets(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="section-title">
        <h2>参数表列表</h2>
        <Link to="/upload" className="btn">上传新参数表</Link>
      </div>
      <div className="card">
        {loading ? (
          <div className="empty">加载中...</div>
        ) : sheets.length === 0 ? (
          <div className="empty">
            <p>暂无参数表</p>
            <p style={{ marginTop: 12 }}>
              <Link to="/upload" className="btn">去上传</Link>
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>文件名</th>
                <th>版本</th>
                <th>行数</th>
                <th>上传人</th>
                <th>上传时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {sheets.map(s => (
                <tr key={s.id}>
                  <td>{s.file_name}</td>
                  <td><span className="tag">{s.version}</span></td>
                  <td>{s.row_count}</td>
                  <td>{s.uploaded_by}</td>
                  <td>{new Date(s.uploaded_at).toLocaleString()}</td>
                  <td>
                    <Link to={`/sheets/${s.id}/review`} className="btn small">
                      复核
                    </Link>
                    {' '}
                    <Link to={`/sheets/${s.id}/rows`} className="btn small secondary">
                      明细
                    </Link>
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
