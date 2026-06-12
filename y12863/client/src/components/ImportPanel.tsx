import { useState } from 'react';
import { api } from '../api';
import { ImportBatch } from '../types';

interface Props {
  onImported: () => void;
}

interface ImportResult {
  batch: ImportBatch;
  importedCount: number;
  duplicateCount: number;
  errors: string[];
}

export default function ImportPanel({ onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batches, setBatches] = useState<ImportBatch[]>([]);

  const loadBatches = async () => {
    try {
      const data = await api.getBatches();
      setBatches(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.importFile(file, '调度员');
      setResult({
        batch: r.batch,
        importedCount: r.imported.length,
        duplicateCount: r.duplicates.length,
        errors: r.errors,
      });
      setFile(null);
      loadBatches();
      onImported();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h2>
          数据导入
          <span className="badge">CSV / Excel</span>
        </h2>

        <div className="note-box">
          🔒 <strong>防重复机制：</strong>
          系统通过「船名 + 台风名 + 锚地名 + 日期」四要素组合判断重复记录。
          同一件事不会出现两份结论。补录新数据时，已有记录会被自动识别并跳过，不会覆盖也不会重复。
        </div>

        <div className="form-group">
          <label>选择文件</label>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResult(null);
              setError(null);
            }}
          />
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: 6 }}>
            支持 CSV / XLS / XLSX 格式。表头识别：船名、锚地名、台风名、日期、上报经纬度、实际经纬度等。
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-primary"
            onClick={handleImport}
            disabled={!file || loading}
          >
            {loading ? '导入中...' : '开始导入'}
          </button>
        </div>

        {result && (
          <div className={`import-result ${result.errors.length > 0 ? 'warning' : 'success'}`}>
            <strong>导入完成！</strong>
            <p style={{ marginTop: 4 }}>
              新增 {result.importedCount} 条，重复跳过 {result.duplicateCount} 条
              {result.errors.length > 0 && `，格式错误 ${result.errors.length} 条`}
            </p>
            {result.errors.length > 0 && (
              <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: '12px' }}>
                {result.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {result.errors.length > 5 && <li>... 还有 {result.errors.length - 5} 条</li>}
              </ul>
            )}
          </div>
        )}

        {error && (
          <div className="import-result error">
            <strong>导入失败：</strong> {error}
          </div>
        )}
      </div>

      <div className="card">
        <h2>导入历史</h2>
        {batches.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📦</div>
            <p>暂无导入记录</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>文件</th>
                <th>导入时间</th>
                <th>操作人</th>
                <th>新增</th>
                <th>去重</th>
              </tr>
            </thead>
            <tbody>
              {[...batches].reverse().map((b) => (
                <tr key={b.id}>
                  <td>{b.fileName}</td>
                  <td>{new Date(b.importedAt).toLocaleString('zh-CN')}</td>
                  <td>{b.operator}</td>
                  <td style={{ color: '#16a34a', fontWeight: 600 }}>{b.recordCount}</td>
                  <td style={{ color: '#ca8a04', fontWeight: 600 }}>{b.duplicateCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
