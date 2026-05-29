import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Download, Eye, Filter } from 'lucide-react';
import { useSettlementStore } from '@/store';
import { exportCsv } from '@/utils/api';

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待结算' },
  { value: 'confirmed', label: '已结算' },
  { value: 'amended', label: '已修正' },
  { value: 'cancelled', label: '已撤销' },
];

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  amended: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
};

const STATUS_LABEL: Record<string, string> = {
  pending: '待结算',
  confirmed: '已结算',
  amended: '已修正',
  cancelled: '已撤销',
};

function fmt(n: number) {
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
}

function Skeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: 9 }).map((__, j) => (
            <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded" /></td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function SettlementList() {
  const { settlements, filters, setFilters, loadSettlements, loading } = useSettlementStore();
  const navigate = useNavigate();
  const [local, setLocal] = useState(filters);

  useEffect(() => { loadSettlements(); }, [filters]);

  const handleSearch = () => setFilters(local);

  const handleReset = () => {
    const empty = { status: '', seller: '', dateFrom: '', dateTo: '' };
    setLocal(empty);
    setFilters(empty);
  };

  const handleExport = () => {
    const params: Record<string, string> = {};
    if (filters.status) params.status = filters.status;
    if (filters.seller) params.seller = filters.seller;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    exportCsv(params);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">寄售结算工作台</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={local.status}
              onChange={e => setLocal({ ...local, status: e.target.value })}
              className="border rounded px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <input
            placeholder="卖家名称"
            value={local.seller}
            onChange={e => setLocal({ ...local, seller: e.target.value })}
            className="border rounded px-3 py-2 text-sm w-40"
          />
          <input
            type="date"
            value={local.dateFrom}
            onChange={e => setLocal({ ...local, dateFrom: e.target.value })}
            className="border rounded px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={local.dateTo}
            onChange={e => setLocal({ ...local, dateTo: e.target.value })}
            className="border rounded px-3 py-2 text-sm"
          />
          <button
            onClick={handleSearch}
            className="bg-[#c9a96e] text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-1 hover:bg-[#b8954f]"
          >
            <Search className="w-4 h-4" />查询
          </button>
          <button onClick={handleReset} className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300">重置</button>
          <button
            onClick={handleExport}
            className="ml-auto bg-[#c9a96e] text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-1 hover:bg-[#b8954f]"
          >
            <Download className="w-4 h-4" />导出CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f5f0eb] text-gray-600 text-left">
              <th className="px-4 py-3 font-medium">寄售单号</th>
              <th className="px-4 py-3 font-medium">商品</th>
              <th className="px-4 py-3 font-medium">卖家</th>
              <th className="px-4 py-3 font-medium text-right">成交价</th>
              <th className="px-4 py-3 font-medium text-right">佣金金额</th>
              <th className="px-4 py-3 font-medium text-right">费用抵扣</th>
              <th className="px-4 py-3 font-medium text-right">净结算额</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <Skeleton /> : settlements.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-16 text-gray-400">
                  <Eye className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>暂无结算记录</p>
                </td>
              </tr>
            ) : settlements.map((s, idx) => (
              <tr
                key={s.id}
                className={`border-t hover:bg-[#faf7f3] cursor-pointer transition-colors ${idx % 2 === 1 ? 'bg-[#fdfcfa]' : ''}`}
                onClick={() => navigate(`/settlement/${s.id}`)}
              >
                <td className="px-4 py-3 text-[#c9a96e] font-medium">{s.consignment_no}</td>
                <td className="px-4 py-3">{s.item_name}</td>
                <td className="px-4 py-3">{s.seller_name}</td>
                <td className="px-4 py-3 text-right">{fmt(s.sale_price)}</td>
                <td className="px-4 py-3 text-right">{fmt(s.commission_amount)}</td>
                <td className="px-4 py-3 text-right">{fmt(s.total_deductions)}</td>
                <td className="px-4 py-3 text-right font-semibold">{fmt(s.net_amount)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[s.status] || ''}`}>
                    {STATUS_LABEL[s.status] || s.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/settlement/${s.id}`}
                    onClick={e => e.stopPropagation()}
                    className="text-[#c9a96e] hover:underline font-medium inline-flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />查看
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
