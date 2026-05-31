import { useState } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { useStore } from '@/store/useStore';
import { Wallet, CheckCircle, Target, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import type { DonationRecord, ProjectBudget } from '@/types';

const formatAmount = (amount: number): string => {
  return `¥${amount.toLocaleString('zh-CN')}`;
};

export default function Budgets() {
  const { budgets, donations, conflicts } = useStore();
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  const totalBudget = budgets.reduce((sum, b) => sum + b.budgetAmount, 0);
  const totalMatched = budgets.reduce((sum, b) => sum + b.matchedAmount, 0);
  const matchRate = totalBudget > 0 ? ((totalMatched / totalBudget) * 100).toFixed(1) : '0';

  const toggleExpand = (projectId: string) => {
    setExpandedProjectId(expandedProjectId === projectId ? null : projectId);
  };

  const getProjectDonations = (projectId: string): DonationRecord[] => {
    return donations.filter(d => d.projectId === projectId);
  };

  const getUnresolvedConflictCount = (donationId: string): number => {
    return conflicts.filter(c => c.donationId === donationId && !c.resolvedAt).length;
  };

  const hasPurposeMismatch = (budget: ProjectBudget): boolean => {
    const projectDonations = getProjectDonations(budget.projectId);
    return projectDonations.some(d => d.designatedPurpose !== budget.purpose);
  };

  const getMismatchedDonations = (budget: ProjectBudget): DonationRecord[] => {
    const projectDonations = getProjectDonations(budget.projectId);
    return projectDonations.filter(d => d.designatedPurpose !== budget.purpose);
  };

  const getColumns = () => [
    { key: 'id', header: '捐赠ID', width: '180' },
    { key: 'donorName', header: '捐赠人' },
    {
      key: 'amount',
      header: '金额',
      render: (row: DonationRecord) => formatAmount(row.amount),
    },
    { key: 'designatedPurpose', header: '指定用途' },
    { key: 'donationDate', header: '捐赠日期' },
    {
      key: 'conflictCount',
      header: '冲突状态',
      render: (row: DonationRecord) => {
        const count = getUnresolvedConflictCount(row.id);
        return count > 0 ? (
          <span className="inline-flex items-center gap-1 text-red-600 font-medium text-sm">
            <AlertTriangle className="w-3.5 h-3.5" />
            {count} 项待处理
          </span>
        ) : (
          <span className="text-emerald-600 text-sm">正常</span>
        );
      },
    },
    {
      key: 'status',
      header: '状态',
      render: (row: DonationRecord) => <StatusBadge status={row.status} type="donation" />,
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-noto-serif-sc">
            项目预算管理
          </h2>
          <p className="text-sm text-slate-500 mt-1">预算明细、用途匹配、冲突标记</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">总预算金额</p>
                <p className="text-2xl font-bold text-slate-800">{formatAmount(totalBudget)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">已匹配金额</p>
                <p className="text-2xl font-bold text-slate-800">{formatAmount(totalMatched)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">匹配率</p>
                <p className="text-2xl font-bold text-slate-800">{matchRate}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {budgets.map((budget) => {
            const isExpanded = expandedProjectId === budget.projectId;
            const projectDonations = getProjectDonations(budget.projectId);
            const progress = budget.budgetAmount > 0 
              ? ((budget.matchedAmount / budget.budgetAmount) * 100).toFixed(0) 
              : '0';
            const mismatched = getMismatchedDonations(budget);

            return (
              <div
                key={budget.id}
                className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpand(budget.projectId)}
                >
                  <div className="flex items-center gap-6 flex-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-slate-800">{budget.projectName}</h3>
                        <StatusBadge status={budget.status} type="budget" />
                      </div>
                      <p className="text-sm text-slate-500 font-mono">{budget.projectId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">预算金额</p>
                      <p className="text-lg font-semibold text-slate-800">{formatAmount(budget.budgetAmount)}</p>
                    </div>
                    <div className="w-64">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">匹配进度</span>
                        <span className="text-xs font-medium text-slate-700">{progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="ml-6">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-slate-100">
                    <div className="py-4">
                      <p className="text-sm text-slate-500 mb-1">项目用途</p>
                      <p className="text-base font-medium text-slate-800">{budget.purpose}</p>
                    </div>

                    {hasPurposeMismatch(budget) && (
                      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-red-800 mb-2">用途不一致</h4>
                            {mismatched.map((donation) => (
                              <div key={donation.id} className="mb-3 last:mb-0 p-3 bg-white rounded border border-red-100">
                                <p className="text-xs text-slate-500 mb-1 font-mono">{donation.id} · {donation.donorName}</p>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-slate-500">捐赠指定用途: </span>
                                    <span className="font-medium text-red-700">{donation.designatedPurpose}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">预算用途: </span>
                                    <span className="font-medium text-teal-700">{budget.purpose}</span>
                                  </div>
                                </div>
                                <p className="text-xs text-amber-600 mt-2">存在用途错配，请人工核实</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">预算明细</h4>
                      <DataTable<DonationRecord>
                        columns={getColumns()}
                        data={projectDonations}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
