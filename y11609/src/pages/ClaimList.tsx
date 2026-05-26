import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Edit2, History, RefreshCw, AlertTriangle } from 'lucide-react';
import { useClaimStore } from '@/store/claimStore';
import { StatusBadge, AnomalyBadge } from '@/components/Badges';
import { Button } from '@/components/UI';
import type { ClaimStatus } from '@/types';

export default function ClaimList() {
  const navigate = useNavigate();
  const { claims, initMockData, resetData } = useClaimStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | 'all'>('all');

  initMockData();

  const filteredClaims = claims.filter((claim) => {
    const matchSearch =
      claim.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.claimant.includes(searchTerm) ||
      claim.policyNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || claim.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const sortedClaims = [...filteredClaims].sort((a, b) => {
    if (a.anomalies.length > 0 && b.anomalies.length === 0) return -1;
    if (a.anomalies.length === 0 && b.anomalies.length > 0) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const anomalyCount = claims.filter((c) => c.anomalies.length > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">理赔单列表</h1>
          <p className="text-sm text-slate-500 mt-1">
            共 {claims.length} 条记录，其中 <span className="text-red-600 font-medium">{anomalyCount}</span> 条存在异常
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={resetData}>
            <RefreshCw size={14} />
            重置数据
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索理赔单号、申请人、保单号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ClaimStatus | 'all')}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">全部状态</option>
            <option value="pending">待复核</option>
            <option value="reviewing">复核中</option>
            <option value="supplement">待补料</option>
            <option value="approved">已通过</option>
            <option value="rejected">已驳回</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">理赔单号</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">申请人</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">保单号</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">总金额</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">赔付金额</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">异常</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">更新时间</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedClaims.map((claim) => (
              <tr
                key={claim.id}
                className={`hover:bg-slate-50 transition-colors ${
                  claim.anomalies.length > 0 ? 'bg-red-50/50' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-sm text-blue-600">{claim.id}</span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-800">{claim.claimant}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-slate-600">{claim.policyNo}</span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-800 text-right">
                  ¥{claim.totalAmount.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-blue-600 text-right">
                  ¥{claim.payoutAmount.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={claim.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {claim.anomalies.length > 0 ? (
                      claim.anomalies.map((a) => <AnomalyBadge key={a} type={a} />)
                    ) : (
                      <span className="text-xs text-green-600">正常</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-500 text-center">
                  {new Date(claim.updatedAt).toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => navigate(`/claims/${claim.id}`)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="查看详情"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => navigate(`/claims/${claim.id}/edit`)}
                      className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="编辑"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => navigate(`/claims/${claim.id}/history`)}
                      className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                      title="历史记录"
                    >
                      <History size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sortedClaims.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                  <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
                  <p>暂无匹配的理赔单</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
