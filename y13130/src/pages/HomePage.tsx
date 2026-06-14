import { Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import AnomalyTag from '@/components/AnomalyTag';
import SubmitForm from '@/components/SubmitForm';
import { AlertTriangle, FileText, Clock, CheckCircle2, Filter } from 'lucide-react';
import { AnomalyFilter, ChangedFilter } from '@/types';

export default function HomePage() {
  const { getUniqueRecords, filterAnomaly, filterChanged, setFilterAnomaly, setFilterChanged } = useStore();
  const records = getUniqueRecords();

  const total = records.length;
  const divisionByZero = records.filter((r) => r.anomalyType === 'division_by_zero').length;
  const emptySet = records.filter((r) => r.anomalyType === 'empty_set').length;
  const changed = records.filter((r) => r.has口径Change).length;
  const pending = records.filter((r) => r.status === 'pending').length;

  const anomalyFilters: { label: string; value: AnomalyFilter }[] = [
    { label: '全部', value: 'all' },
    { label: '空集合', value: 'empty_set' },
    { label: '除零边界', value: 'division_by_zero' },
    { label: '正常', value: 'normal' },
    { label: '其他', value: 'other' },
  ];
  const changedFilters: { label: string; value: ChangedFilter }[] = [
    { label: '全部口径', value: 'all' },
    { label: '已变更口径', value: 'changed' },
    { label: '未变更口径', value: 'unchanged' },
  ];

  const filtered = records.filter((r) => {
    if (filterAnomaly !== 'all' && r.anomalyType !== filterAnomaly) return false;
    if (filterChanged === 'changed' && !r.has口径Change) return false;
    if (filterChanged === 'unchanged' && r.has口径Change) return false;
    return true;
  });

  return (
    <Layout title="凸包面积错题复盘">
      <Link
        to="/anomaly"
        className="block bg-amber-600 text-white rounded-[6px] px-5 py-3 mb-6 flex items-center justify-between hover:bg-amber-500 transition-colors"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle size={22} />
          <div>
            <div className="font-bold text-sm">异常隔离区 · 排班同事重点关注</div>
            <div className="text-xs text-amber-100">除零边界与空集合已单独拎出，不会混入正常结果</div>
          </div>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="font-display text-2xl font-bold leading-none animate-pulse-soft">{divisionByZero}</div>
            <div className="text-[10px] text-amber-100 mt-0.5">除零边界</div>
          </div>
          <div>
            <div className="font-display text-2xl font-bold leading-none animate-pulse-soft">{emptySet}</div>
            <div className="text-[10px] text-amber-100 mt-0.5">空集合</div>
          </div>
        </div>
      </Link>

      <div className="mb-6">
        <SubmitForm />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-ink-600">总错题数</span>
            <FileText size={16} className="text-ink-700" />
          </div>
          <div className="font-display text-3xl font-bold text-ink-900">{total}</div>
          <div className="text-[10px] text-ink-600 mt-1">已按 sampleId 去重</div>
        </div>
        <div className="card p-4 border-amber-300 bg-amber-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-amber-700">除零异常</span>
            <AlertTriangle size={16} className="text-amber-600" />
          </div>
          <div className="font-display text-3xl font-bold text-amber-700">{divisionByZero}</div>
          <div className="text-[10px] text-amber-600 mt-1">单独拎出不混正常</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-ink-600">口径已变更</span>
            <FileText size={16} className="text-amber-600" />
          </div>
          <div className="font-display text-3xl font-bold text-ink-900">{changed}</div>
          <div className="text-[10px] text-ink-600 mt-1">三份材料有改动</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-ink-600">待复盘</span>
            <Clock size={16} className="text-ink-700" />
          </div>
          <div className="font-display text-3xl font-bold text-ink-900">{pending}</div>
          <div className="text-[10px] text-ink-600 mt-1">已完成 {total - pending}</div>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-ink-600" />
          <span className="text-xs text-ink-600 mr-1">异常类型：</span>
          {anomalyFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterAnomaly(f.value)}
              className={`text-xs px-2.5 py-1 rounded transition-colors ${
                filterAnomaly === f.value
                  ? 'bg-ink-800 text-white'
                  : 'bg-paper-100 text-ink-700 hover:bg-paper-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-ink-600 mr-1">口径：</span>
          {changedFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterChanged(f.value)}
              className={`text-xs px-2.5 py-1 rounded transition-colors ${
                filterChanged === f.value
                  ? 'bg-amber-600 text-white'
                  : 'bg-paper-100 text-ink-700 hover:bg-paper-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper-50 border-b border-paper-200">
            <tr className="text-left text-xs text-ink-600">
              <th className="px-4 py-3 font-medium">样本 ID</th>
              <th className="px-4 py-3 font-medium">标题</th>
              <th className="px-4 py-3 font-medium">输入摘要</th>
              <th className="px-4 py-3 font-medium">异常类型</th>
              <th className="px-4 py-3 font-medium">口径</th>
              <th className="px-4 py-3 font-medium">提交次数</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                className={`border-b border-paper-100 hover:bg-paper-50 transition-colors ${
                  r.has口径Change ? 'bg-amber-50/30' : ''
                }`}
              >
                <td className="px-4 py-3 font-mono text-xs text-ink-800">{r.sampleId}</td>
                <td className="px-4 py-3 text-ink-900 font-medium">{r.title}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-ink-600 max-w-[240px] truncate">
                  {r.rawInput}
                </td>
                <td className="px-4 py-3">
                  <AnomalyTag type={r.anomalyType} size="sm" />
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.has口径Change ? (
                    <span className="tag bg-amber-100 text-amber-700 text-[10px]">已变更</span>
                  ) : (
                    <span className="tag bg-paper-100 text-ink-600 text-[10px]">未变更</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink-700">
                  {r.submittedCount} 次
                  {r.submittedCount > 1 && <span className="text-emerald-600 ml-1">已去重</span>}
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.status === 'reviewed' ? (
                    <span className="flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 size={13} /> 已复盘
                    </span>
                  ) : (
                    <span className="text-ink-600">待复盘</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/sample/${r.id}`} className="btn-primary !py-1 !px-3 text-xs">
                    查看详情
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-ink-600 text-sm">
                  当前筛选下无记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
