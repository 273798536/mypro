import { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Eye, Snowflake } from 'lucide-react';
import { BATCH_STATUS_LABELS } from '../../shared/types';

export default function BatchList() {
  const { batches, fetchBatches, loading } = useAppStore();
  const [filter, setFilter] = useState({ status: '', brand: '' });

  useEffect(() => {
    fetchBatches(filter as any);
  }, [fetchBatches, filter]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-slate-100 text-slate-700',
      PENDING_REVIEW: 'bg-amber-100 text-amber-700',
      UNDER_REVIEW: 'bg-blue-100 text-blue-700',
      APPROVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
      FROZEN: 'bg-cyan-100 text-cyan-700',
      SETTLED: 'bg-emerald-100 text-emerald-700',
      ARCHIVED: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">批次管理</h1>
          <p className="text-slate-500 mt-1">管理所有打版批次及其状态</p>
        </div>
        <Link
          to="/batches/create"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-md"
        >
          <Plus size={18} />
          创建批次
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索款式编码..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setFilter({ ...filter, brand: e.target.value })}
            />
          </div>
          <select
            className="px-4 py-2 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">全部状态</option>
            <option value="DRAFT">草稿</option>
            <option value="PENDING_REVIEW">待复核</option>
            <option value="APPROVED">已通过</option>
            <option value="FROZEN">已冻结</option>
            <option value="SETTLED">已结算</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded hover:bg-slate-50">
            <Filter size={16} />
            更多筛选
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">批次号</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">款式编码</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">品牌</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">状态</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">创建人</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">创建时间</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-500">加载中...</td>
              </tr>
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-500">暂无数据</td>
              </tr>
            ) : (
              batches.map((batch) => (
                <tr key={batch.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <span className="font-mono text-sm font-medium text-slate-800">{batch.batchNo}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">{batch.styleCode}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">{batch.brand}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(batch.status)}`}>
                      {batch.frozen && <Snowflake size={12} />}
                      {BATCH_STATUS_LABELS[batch.status as keyof typeof BATCH_STATUS_LABELS] || batch.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{batch.createdBy}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {new Date(batch.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      to={`/batches/${batch.id}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <Eye size={14} />
                      详情
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
