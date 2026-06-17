import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBatches, importBatch } from '../api.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importForm, setImportForm] = useState({
    batch_id: '',
    batch_name: '',
    description: '',
    file: null
  });

  const loadBatches = async () => {
    setLoading(true);
    try {
      const res = await getBatches();
      setBatches(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleImport = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('batch_id', importForm.batch_id || `BATCH-${Date.now()}`);
    formData.append('batch_name', importForm.batch_name || `导入批次 ${new Date().toLocaleString()}`);
    formData.append('description', importForm.description);
    if (importForm.file) {
      formData.append('file', importForm.file);
    }
    try {
      const res = await importBatch(formData);
      alert(`导入成功！新增 ${res.data.stats.inserted} 条，更新 ${res.data.stats.updated} 条，跳过 ${res.data.stats.skipped} 条`);
      setShowImport(false);
      setImportForm({ batch_id: '', batch_name: '', description: '', file: null });
      loadBatches();
    } catch (e) {
      alert('导入失败: ' + (e.response?.data?.error || e.message));
    }
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>批次管理</h2>
          <button className="btn btn-primary" onClick={() => setShowImport(true)}>
            + 导入批次
          </button>
        </div>

        {batches.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48 }}>📦</div>
            <p>暂无批次，请先运行 <code>npm run seed</code> 初始化示例数据，或点击上方按钮导入</p>
          </div>
        ) : (
          <div className="batch-list">
            {batches.map(batch => (
              <div key={batch.id} className="batch-item">
                <div className="batch-info">
                  <h3>{batch.batch_name}</h3>
                  <p>
                    批次ID: {batch.batch_id} · 
                    样本数: {batch.sample_count} · 
                    导入时间: {new Date(batch.imported_at).toLocaleString()}
                    {batch.description && ` · ${batch.description}`}
                  </p>
                </div>
                <div className="batch-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/batches/${batch.batch_id}`)}>
                    查看详情
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>导入批次数据</h3>
            <form onSubmit={handleImport}>
              <div className="form-group">
                <label>批次ID（留空自动生成，相同ID会幂等更新）</label>
                <input
                  type="text"
                  value={importForm.batch_id}
                  onChange={e => setImportForm({ ...importForm, batch_id: e.target.value })}
                  placeholder="如: BATCH-2024-001"
                />
              </div>
              <div className="form-group">
                <label>批次名称</label>
                <input
                  type="text"
                  value={importForm.batch_name}
                  onChange={e => setImportForm({ ...importForm, batch_name: e.target.value })}
                  placeholder="给批次起个名字"
                />
              </div>
              <div className="form-group">
                <label>描述</label>
                <textarea
                  value={importForm.description}
                  onChange={e => setImportForm({ ...importForm, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label>CSV 文件（列: sample_id, content, sample_type, expected_result, note）</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={e => setImportForm({ ...importForm, file: e.target.files[0] })}
                />
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  sample_type: normal=正常, boundary=边界, bad=坏样本；expected_result: pass/block
                </p>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowImport(false)}>取消</button>
                <button type="submit" className="btn btn-primary">导入</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
