import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../store/DataContext';
import { StatusBadge, TypeBadge } from '../components/Badges';
import { RecordStatus, RecordType } from '../types';
import { STATUS_LABELS, TYPE_LABELS } from '../utils/constants';
import { formatDateTime } from '../utils/helpers';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function FilterPage() {
  const navigate = useNavigate();
  const query = useQuery();
  const { records, batches, filterRecords, deleteRecord, updateRecordStatus } = useData();

  const [statusFilter, setStatusFilter] = useState<RecordStatus[]>([]);
  const [typeFilter, setTypeFilter] = useState<RecordType[]>([]);
  const [batchFilter, setBatchFilter] = useState<string>('');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    const s = query.get('status');
    const b = query.get('batchId');
    if (s && ['normal', 'duplicate', 'conflict', 'missing_camera'].includes(s)) {
      setStatusFilter([s as RecordStatus]);
    }
    if (b) setBatchFilter(b);
  }, [query]);

  const filtered = useMemo(() => {
    return filterRecords({
      status: statusFilter.length ? statusFilter : undefined,
      type: typeFilter.length ? typeFilter : undefined,
      keyword: keyword.trim() || undefined,
      batchId: batchFilter || undefined,
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [records, statusFilter, typeFilter, keyword, batchFilter, filterRecords]);

  function toggleStatus(s: RecordStatus) {
    setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }
  function toggleType(t: RecordType) {
    setTypeFilter(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  function getBatchName(id: string) {
    return batches.find(b => b.id === id)?.name || id;
  }

  function clearFilters() {
    setStatusFilter([]);
    setTypeFilter([]);
    setBatchFilter('');
    setKeyword('');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">异常筛选</h3>
          <p className="text-sm text-slate-500 mt-1">
            筛选导入记录，查看异常数据。保留原始行号、图片名与来源备注，便于向甲方展示时追溯。
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={clearFilters} className="px-3 py-2 text-sm border border-slate-300 rounded hover:bg-slate-50 text-slate-700">
            清除筛选
          </button>
          <button onClick={() => navigate('/import')} className="px-3 py-2 text-sm bg-tech-blue text-white rounded hover:bg-tech-blue/90">
            + 导入数据
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 w-14">状态:</span>
            {(Object.keys(STATUS_LABELS) as RecordStatus[]).map(s => (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`text-xs px-2.5 py-1 rounded border transition ${
                  statusFilter.includes(s)
                    ? `${STATUS_LABELS[s].bg} ${STATUS_LABELS[s].color} font-medium`
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {STATUS_LABELS[s].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 w-14">类型:</span>
            {(Object.keys(TYPE_LABELS) as RecordType[]).map(t => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`text-xs px-2.5 py-1 rounded border transition ${
                  typeFilter.includes(t)
                    ? `${TYPE_LABELS[t].bg} ${TYPE_LABELS[t].color} font-medium`
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {TYPE_LABELS[t].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-14">批次:</span>
          <select
            value={batchFilter}
            onChange={e => setBatchFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-tech-blue/40"
          >
            <option value="">全部批次</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.recordCount})</option>
            ))}
          </select>

          <span className="text-xs text-slate-500 w-14 ml-4">搜索:</span>
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="搜索关键词（编号、文件名、备注等）"
            className="flex-1 min-w-[240px] px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-tech-blue/40"
          />
          <span className="text-xs text-slate-400">共 {filtered.length} 条结果</span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-xs">类型</th>
                <th className="text-left px-4 py-3 font-medium text-xs">标识</th>
                <th className="text-left px-4 py-3 font-medium text-xs">状态</th>
                <th className="text-left px-4 py-3 font-medium text-xs">来源批次</th>
                <th className="text-left px-4 py-3 font-medium text-xs">原始文件</th>
                <th className="text-left px-4 py-3 font-medium text-xs">行号</th>
                <th className="text-left px-4 py-3 font-medium text-xs">来源备注/图片</th>
                <th className="text-left px-4 py-3 font-medium text-xs">更新时间</th>
                <th className="text-left px-4 py-3 font-medium text-xs">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-sm text-slate-400">
                    没有符合条件的记录
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id} className={`hover:bg-slate-50 ${r.status !== 'normal' ? 'bg-yellow-50/20' : ''}`}>
                    <td className="px-4 py-3"><TypeBadge type={r.type} /></td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-800">
                        {r.data.name || r.data.buoyId || r.data.modelId || r.data.deviceId || '(未命名)'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[200px]">
                        {Object.entries(r.data).slice(0, 2).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v).slice(0, 40) : v}`).join(' | ')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                      {r.duplicateOfId && (
                        <div className="text-[10px] text-slate-400 mt-1">重复记录</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-600">{getBatchName(r.batchId)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-700 truncate max-w-[160px]" title={r.fileName}>
                        {r.fileName}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        L{r.originalLine}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      {r.imageName && (
                        <div className="text-[11px] text-cyan-700 mb-0.5">🖼 {r.imageName}</div>
                      )}
                      <div className="text-[11px] text-slate-500 line-clamp-2" title={r.sourceRemark}>
                        {r.sourceRemark}
                      </div>
                      {r.processingOpinion && (
                        <div className="text-[11px] text-deep-sea mt-1 border-l-2 border-tech-blue pl-1.5 line-clamp-2">
                          💡 {r.processingOpinion}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(r.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/detail/${r.id}`)}
                          className="text-xs text-tech-blue hover:underline"
                        >
                          详情
                        </button>
                        <button
                          onClick={() => navigate(`/section/${r.id}`)}
                          className="text-xs text-tech-blue hover:underline"
                        >
                          剖切
                        </button>
                        {r.status !== 'normal' && (
                          <button
                            onClick={() => {
                              if (confirm('标记为正常？将保留记录但不再视为异常。')) {
                                updateRecordStatus(r.id, 'normal');
                              }
                            }}
                            className="text-xs text-green-600 hover:underline"
                          >
                            标正常
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('确认删除这条记录？相关剖切数据也会失效。')) {
                              deleteRecord(r.id);
                            }
                          }}
                          className="text-xs text-red-500 hover:underline"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
