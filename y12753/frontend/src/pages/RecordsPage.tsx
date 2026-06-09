import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { STATUS_LABEL, STATUS_COLOR } from '../types';
import type { BufferRecordSummary, RecordStatus } from '../types';

const STATUS_OPTIONS: Array<{ value: '' | RecordStatus; label: string }> = [
  { value: '', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'imported', label: '已导入' },
  { value: 'reviewing', label: '复核中' },
  { value: 'confirmed', label: '已确认' },
  { value: 'reported', label: '已报告' },
];

export default function RecordsPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<BufferRecordSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'' | RecordStatus>('');
  const [error, setError] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.listRecords({
        keyword: keyword || undefined,
        status: status || undefined,
      });
      setRecords(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [keyword, status]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除该记录吗？')) return;
    try {
      await api.deleteRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : '删除失败');
    }
  };

  const handleView = (id: number) => {
    navigate(`/records/${id}`);
  };

  const getPrecisionBadge = (pass: boolean | null | undefined) => {
    if (pass === null || pass === undefined) {
      return <span className="badge badge-gray">未检测</span>;
    }
    return pass ? (
      <span className="badge badge-green">合格</span>
    ) : (
      <span className="badge badge-red">不合格</span>
    );
  };

  const getTempBadge = (pass: boolean | null | undefined) => {
    if (pass === null || pass === undefined) {
      return <span className="badge badge-gray">未检测</span>;
    }
    return pass ? (
      <span className="badge badge-green">合格</span>
    ) : (
      <span className="badge badge-red">不合格</span>
    );
  };

  return (
    <div>
      <h1 className="page-title">记录管理</h1>
      <p className="page-subtitle">管理所有缓冲液配制记录，支持搜索、筛选和操作</p>

      <div className="card">
        <div className="toolbar">
          <div className="filters">
            <input
              type="text"
              placeholder="搜索批次号或缓冲液名称"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ width: 240 }}
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as '' | RecordStatus)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/records/new')}
          >
            + 新建记录
          </button>
        </div>

        {error && (
          <div className="error-text" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="empty">加载中...</div>
        ) : records.length === 0 ? (
          <div className="empty">暂无记录</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>批次号</th>
                <th>日期</th>
                <th>缓冲液名称</th>
                <th>目标pH</th>
                <th>状态</th>
                <th>精度</th>
                <th>温度曲线</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.batch_no}</td>
                  <td>{r.record_date}</td>
                  <td>{r.buffer_name}</td>
                  <td>{r.target_ph}</td>
                  <td>
                    <span
                      className="badge"
                      style={{ background: STATUS_COLOR[r.status] }}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td>{getPrecisionBadge(r.precision_pass)}</td>
                  <td>{getTempBadge(r.temp_curve_pass)}</td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <button
                        className="link-btn"
                        onClick={() => handleView(r.id)}
                      >
                        查看详情
                      </button>
                      <button
                        className="link-btn"
                        style={{ color: '#dc2626' }}
                        onClick={() => handleDelete(r.id)}
                      >
                        删除
                      </button>
                    </div>
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
