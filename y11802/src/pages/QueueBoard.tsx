import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Info, AlertTriangle, Clock, ChevronRight, DollarSign, Users } from 'lucide-react';
import { useRedemptionStore } from '@/store/useRedemptionStore';
import { getStatusColor, getStatusText, formatAmount, formatDate } from '@/utils/formatters';
import QueueRuleFlow from '@/components/QueueRuleFlow';
import QuotaTooltip from '@/components/QuotaTooltip';
import type { RedemptionRequest } from '@/types';

export default function QueueBoard() {
  const navigate = useNavigate();
  const { redemptions, quotaConfigs } = useRedemptionStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(redemptions[0]?.id || null);
  const [tooltipId, setTooltipId] = useState<string | null>(null);

  const filteredRedemptions = useMemo(() => {
    return redemptions
      .filter(r => {
        const matchesSearch = r.customerName.includes(searchQuery) ||
          r.fundName.includes(searchQuery) ||
          r.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => a.queuePosition - b.queuePosition);
  }, [redemptions, searchQuery, statusFilter]);

  const selectedRedemption = redemptions.find(r => r.id === selectedId);

  const stats = useMemo(() => {
    return {
      total: redemptions.length,
      pending: redemptions.filter(r => r.status === 'pending' || r.status === 'reviewing').length,
      delayed: redemptions.filter(r => r.isDelayed).length,
      todayAmount: redemptions
        .filter(r => r.applyDate === '2026-05-28')
        .reduce((sum, r) => sum + r.requestAmount, 0),
    };
  }, [redemptions]);

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'pending', label: '待处理' },
    { value: 'reviewing', label: '待复核' },
    { value: 'confirmed', label: '已确认' },
    { value: 'delayed', label: '清算顺延' },
    { value: 'settled', label: '已到账' },
  ];

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex-shrink-0 px-6 py-4 border-b border-slate-700 bg-slate-850">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">赎回排队看板</h2>
              <p className="text-sm text-slate-400 mt-0.5">按申请时间优先级排序，实时追踪清算进度</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-slate-400">
                <Clock className="w-4 h-4" />
                <span>数据更新于 {new Date().toLocaleTimeString('zh-CN')}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white font-mono">{stats.total}</p>
                <p className="text-xs text-slate-400">今日申请笔数</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white font-mono">{stats.pending}</p>
                <p className="text-xs text-slate-400">待处理/待复核</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white font-mono">{stats.delayed}</p>
                <p className="text-xs text-slate-400">清算顺延</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white font-mono">{formatAmount(stats.todayAmount)}</p>
                <p className="text-xs text-slate-400">今日申请总额（份）</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-shrink-0 px-6 py-3 border-b border-slate-700 bg-slate-850/50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索客户名称、基金名称、赎回编号..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="input-field w-40"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto scrollbar-thin">
          <table className="w-full">
            <thead className="bg-slate-800/80 sticky top-0 backdrop-blur-sm z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">排队位置</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">赎回编号</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">客户名称</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">基金名称</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">申请份额</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">确认份额</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">预计到账</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">额度检查</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredRedemptions.map((redemption) => (
                <QueueRow
                  key={redemption.id}
                  redemption={redemption}
                  isSelected={selectedId === redemption.id}
                  onSelect={() => setSelectedId(redemption.id)}
                  onViewDetail={() => navigate(`/detail/${redemption.id}`)}
                  onShowQuota={(e) => {
                    e.stopPropagation();
                    setTooltipId(tooltipId === redemption.id ? null : redemption.id);
                  }}
                  showQuotaTooltip={tooltipId === redemption.id}
                  quotaConfigs={quotaConfigs}
                />
              ))}
            </tbody>
          </table>
          {filteredRedemptions.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>没有找到匹配的赎回申请</p>
            </div>
          )}
        </div>
      </div>

      {selectedRedemption && (
        <aside className="w-96 border-l border-slate-700 bg-slate-850 flex flex-col overflow-hidden">
          <QueueRuleFlow redemption={selectedRedemption} />
        </aside>
      )}
    </div>
  );
}

interface QueueRowProps {
  redemption: RedemptionRequest;
  isSelected: boolean;
  onSelect: () => void;
  onViewDetail: () => void;
  onShowQuota: (e: React.MouseEvent) => void;
  showQuotaTooltip: boolean;
  quotaConfigs: any[];
}

function QueueRow({ redemption, isSelected, onSelect, onViewDetail, onShowQuota, showQuotaTooltip, quotaConfigs }: QueueRowProps) {
  const quotaConfig = quotaConfigs.find(q => q.fundId === redemption.fundId);

  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer transition-colors relative ${
        isSelected ? 'bg-primary-600/10 border-l-2 border-l-primary-500' : 'hover:bg-slate-800/50'
      }`}
    >
      <td className="px-6 py-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
          redemption.queuePosition <= 3 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'
        }`}>
          {redemption.queuePosition}
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="font-mono text-sm text-slate-300">{redemption.id}</span>
      </td>
      <td className="px-6 py-4">
        <div className="font-medium text-white">{redemption.customerName}</div>
        <div className="text-xs text-slate-400">{redemption.source}</div>
      </td>
      <td className="px-6 py-4">
        <div className="text-white">{redemption.fundName}</div>
        <div className="text-xs text-slate-400">{formatDate(redemption.applyDate)} 申请</div>
      </td>
      <td className="px-6 py-4 text-right font-mono text-slate-200">
        {formatAmount(redemption.requestAmount)}
      </td>
      <td className="px-6 py-4 text-right">
        <span className={`font-mono ${redemption.confirmedAmount < redemption.requestAmount ? 'text-amber-400' : 'text-emerald-400'}`}>
          {redemption.confirmedAmount > 0 ? formatAmount(redemption.confirmedAmount) : '-'}
        </span>
        {redemption.confirmedAmount > 0 && redemption.confirmedAmount < redemption.requestAmount && (
          <div className="text-xs text-amber-500">部分确认</div>
        )}
      </td>
      <td className="px-6 py-4 text-center">
        <span className={`status-pill ${getStatusColor(redemption.status)}`}>
          {redemption.isDelayed && <AlertTriangle className="w-3 h-3 mr-1" />}
          {getStatusText(redemption.status)}
        </span>
        {redemption.needsReview && (
          <div className="text-xs text-orange-400 mt-1">需复核</div>
        )}
      </td>
      <td className="px-6 py-4 text-center">
        <div className={`font-mono text-sm ${redemption.isDelayed ? 'text-orange-400' : 'text-slate-200'}`}>
          {formatDate(redemption.expectedSettlementDate)}
        </div>
        {redemption.isDelayed && (
          <div className="text-xs text-orange-500">已顺延</div>
        )}
      </td>
      <td className="px-6 py-4 text-center">
        <div className="relative">
          <button
            onClick={onShowQuota}
            className={`p-1.5 rounded-md transition-colors ${
              showQuotaTooltip ? 'bg-primary-500/20 text-primary-400' : 'text-slate-400 hover:text-primary-400 hover:bg-slate-700'
            }`}
          >
            <Info className="w-4 h-4" />
          </button>
          {showQuotaTooltip && quotaConfig && (
            <QuotaTooltip
              redemption={redemption}
              quotaConfig={quotaConfig}
              onClose={() => onShowQuota({ stopPropagation: () => {} } as React.MouseEvent)}
            />
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail();
          }}
          className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300 transition-colors"
        >
          详情
          <ChevronRight className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
