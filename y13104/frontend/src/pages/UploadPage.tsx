import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sheetApi } from '../api';
import type { UploadResponse } from '../types';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState('');
  const [uploadedBy, setUploadedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !version) return;
    setLoading(true);
    setError('');
    try {
      const r = await sheetApi.upload(file, version, uploadedBy || 'unknown', notes);
      setResult(r);
    } catch (err: any) {
      setError(err?.response?.data?.detail || '上传失败');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="card">
      <h2>上传成功</h2>
      <p>参数表ID：{result.sheet_id}</p>
      <p>文件名：{result.file_name}</p>
      <p>版本：{result.version}</p>
      <p>行数：{result.row_count}</p>

      {result.warnings.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3>字段匹配警告</h3>
          <ul style={{ paddingLeft: 20 }}>
            {result.warnings.map((w, i) => (
              <li key={i} className="warning-text">{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <h3>字段匹配详情</h3>
        <table>
          <thead>
            <tr>
              <th>规范字段</th>
              <th>匹配到的原始列</th>
              <th>置信度</th>
            </tr>
          </thead>
          <tbody>
            {result.column_matches.map((m, i) => (
              <tr key={i}>
                <td>{m.canonical}</td>
                <td>
                  {m.chosen ? (
                    <span className="badge ok">{m.chosen}</span>
                  ) : (
                    <span className="badge warning">未匹配</span>
                  )}
                </td>
                <td>{(m.confidence * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.rows_with_issues.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>有问题的行（前 10 条）</h3>
          <table>
            <thead>
              <tr>
                <th>Excel 行号</th>
                <th>代码</th>
                <th>名称</th>
                <th>问题</th>
              </tr>
            </thead>
            <tbody>
              {result.rows_with_issues.slice(0, 10).map((r, i) => (
                <tr key={i}>
                  <td>{r.excel_row_number}</td>
                  <td>{r.security_code || '-'}</td>
                  <td>{r.security_name || '-'}</td>
                  <td className="warning-text">{r.warnings.join('；')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
        <button className="btn" onClick={() => navigate(`/sheets/${result.sheet_id}/review`)}>
          去复核
        </button>
        <button className="btn secondary" onClick={() => navigate('/')}>
          返回列表
        </button>
      </div>
    </div>
    );
  }

  return (
    <div className="card">
      <h2>上传参数表</h2>
      {error && <p className="warning-text" style={{ marginBottom: 12 }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label>文件</label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="input"
          />
        </div>
        <div className="form-row">
          <label>版本号</label>
          <input
            type="text"
            value={version}
            onChange={e => setVersion(e.target.value)}
            placeholder="例如 v1.0 / 2026-06"
            className="input"
            style={{ width: 300 }}
          />
        </div>
        <div className="form-row">
          <label>上传人</label>
          <input
            type="text"
            value={uploadedBy}
            onChange={e => setUploadedBy(e.target.value)}
            placeholder="阿乔"
            className="input"
            style={{ width: 200 }}
          />
        </div>
        <div className="form-row">
          <label>备注</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="这批参数的背景说明"
            className="input"
            style={{ width: 400 }}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <button type="submit" className="btn" disabled={loading || !file || !version}>
            {loading ? '上传中...' : '开始导入'}
          </button>
        </div>
      </form>
    </div>
  );
}
