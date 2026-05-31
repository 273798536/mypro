import Layout from '@/components/Layout';
import CircleProgress from '@/components/CircleProgress';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { useStore } from '@/store/useStore';
import { TrendingUp, Lock, AlertTriangle, Receipt, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DonationRecord, ConflictLog } from '@/types';

const formatAmount = (amount: number): string => {
  return `¥${amount.toLocaleString('zh-CN')}`;
};

const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'high':
      return 'bg-red-500';
    case 'medium':
      return 'bg-amber-500';
    default:
      return 'bg-slate-400';
  }
};

const getConflictTypeLabel = (type: string): string => {
  switch (type) {
    case 'purpose_mismatch':
      return '用途不一致';
    case 'receipt_duplicate':
      return '票据重复';
    case 'refund_delayed':
      return '退款延迟';
    default:
      return type;
  }
};

export default function Home() {
  const navigate = useNavigate();
  const { donations, budgets, receipts, locks, conflicts } = useStore();

  const total = donations.length;
  const locked = donations.filter(d => d.status === 'locked').length;
  const pending = donations.filter(d => d.status === 'pending').length;
  const matched = budgets.filter(b => b.status === 'matched').length;
  const matchedAmount = budgets.reduce((sum, b) => sum + b.matchedAmount, 0);
  const totalBudget = budgets.reduce((sum, b) => sum + b.budgetAmount, 0);
  const linked = receipts.filter(r => r.status === 'linked').length;

  const totalDonationAmount = donations.reduce((sum, d) => sum + d.amount, 0);
  const lockedAmount = donations.filter(d => d.status === 'locked').reduce((sum, d) => sum + d.amount, 0);
  const unresolvedConflicts = conflicts.filter(c => !c.resolvedAt);
  const receiptLinkRate = total > 0 ? Math.round((linked / total) * 100) : 0;

  const topConflicts = [...unresolvedConflicts]
    .sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .slice(0, 3);

  const last5Donations = [...donations]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const donationColumns = [
    {
      key: 'id',
      header: 'ID',
      width: '140',
    },
    {
      key: 'donorName',
      header: '捐赠人',
    },
    {
      key: 'amount',
      header: '金额',
      render: (row: DonationRecord) => formatAmount(row.amount),
    },
    {
      key: 'designatedPurpose',
      header: '指定用途',
    },
    {
      key: 'projectId',
      header: '关联项目',
      render: (row: DonationRecord) => {
        const budget = budgets.find(b => b.projectId === row.projectId);
        return budget?.projectName || row.projectId;
      },
    },
    {
      key: 'status',
      header: '状态',
      render: (row: DonationRecord) => <StatusBadge status={row.status} type="donation" />,
    },
    {
      key: 'action',
      header: '操作',
      render: (row: DonationRecord) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate('/donations');
          }}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors"
        >
          <Eye className="w-3 h-3" />
          查看明细
        </button>
      ),
    },
  ];

  const statsCards = [
    {
      title: '总捐赠金额',
      value: formatAmount(totalDonationAmount),
      icon: TrendingUp,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      title: '已锁定金额',
      value: formatAmount(lockedAmount),
      icon: Lock,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: '待处理冲突',
      value: unresolvedConflicts.length,
      icon: AlertTriangle,
      color: unresolvedConflicts.length > 0 ? 'text-red-600' : 'text-slate-600',
      bgColor: unresolvedConflicts.length > 0 ? 'bg-red-50' : 'bg-slate-50',
    },
    {
      title: '票据关联率',
      value: `${receiptLinkRate}%`,
      icon: Receipt,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-noto-serif-sc">
            总览 · 公益捐赠指定用途账
          </h2>
          <p className="text-sm text-slate-500 mt-1">三源数据对齐状态总览</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <CircleProgress
              value={total > 0 ? ((locked + pending) / total) * 100 : 0}
              label="捐赠记录"
              sublabel={`${locked}/${total}已锁定`}
              size={100}
              strokeWidth={8}
              color="#0F766E"
            />
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <CircleProgress
              value={total > 0 ? (matched / total) * 100 : 0}
              label="项目预算"
              sublabel={`${formatAmount(matchedAmount)}/${formatAmount(totalBudget)}已匹配`}
              size={100}
              strokeWidth={8}
              color="#059669"
            />
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <CircleProgress
              value={total > 0 ? (linked / total) * 100 : 0}
              label="支出票据"
              sublabel={`${linked}/${total}已关联`}
              size={100}
              strokeWidth={8}
              color="#0284C7"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {statsCards.map((card, index) => (
            <div key={index} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{card.title}</p>
                  <p className={`text-2xl font-bold mt-2 ${card.color}`}>{card.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800">最近捐赠记录</h3>
          </div>
          <div className="p-6">
            <DataTable<DonationRecord>
              columns={donationColumns}
              data={last5Donations}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800">待处理冲突TOP3</h3>
          </div>
          <div className="p-6">
            {topConflicts.length === 0 ? (
              <div className="py-8 text-center text-slate-500">暂无待处理冲突</div>
            ) : (
              <div className="space-y-3">
                {topConflicts.map((conflict: ConflictLog) => {
                  const donation = donations.find(d => d.id === conflict.donationId);
                  return (
                    <div
                      key={conflict.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-3 h-3 rounded-full ${getSeverityColor(conflict.severity)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">
                              {getConflictTypeLabel(conflict.conflictType)}
                            </span>
                            <StatusBadge status={conflict.severity} type="severity" />
                          </div>
                          <p className="text-sm text-slate-500 mt-1 truncate">
                            {conflict.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                            <span>捐赠人：{donation?.donorName || '-'}</span>
                            <span>检测时间：{formatDateTime(conflict.detectedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate('/lock')}
                        className="px-3 py-1.5 text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors"
                      >
                        处理
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
