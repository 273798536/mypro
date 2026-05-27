import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, Clock, RotateCcw, Package, Search } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { invoiceStatusLabels, Donation, dataSourceLabels } from '../types';
import { collectByProject, calculateVerificationStats } from '../utils/verificationEngine';

export const WorkbenchPage: React.FC = () => {
  const donations = useAppStore(state => state.donations);
  const projects = useAppStore(state => state.projects);
  const isDataLoaded = useAppStore(state => state.isDataLoaded);
  const [activeTab, setActiveTab] = useState<'all' | 'targeted' | 'physical' | 'refund'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const stats = calculateVerificationStats(donations);
  const projectSummaries = collectByProject(donations, projects);

  const statusColors: Record<string, string> = {
    issued: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    reversed: 'bg-gray-100 text-gray-600',
    exception: 'bg-red-100 text-red-700',
  };

  const filteredDonations = donations.filter(d => {
    const matchesSearch = d.donorName.includes(searchTerm) ||
      (d.invoiceNumber && d.invoiceNumber.includes(searchTerm)) ||
      (d.projectName && d.projectName.includes(searchTerm));

    if (!matchesSearch) return false;

    switch (activeTab) {
      case 'targeted':
        return projects.find(p => p.id === d.projectId)?.isTargeted;
      case 'physical':
        return d.isPhysical;
      case 'refund':
        return d.hasRefund;
      default:
        return true;
    }
  });

  if (!isDataLoaded) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">请先导入数据或加载样例数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">核销工作台</h2>
        <p className="text-sm text-gray-500 mt-1">查看票据状态、项目归集和退款冲销情况</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{stats.normal}</div>
              <div className="text-sm text-gray-500">正常票据</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{stats.exception}</div>
              <div className="text-sm text-gray-500">异常票据</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock size={20} className="text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{stats.pending}</div>
              <div className="text-sm text-gray-500">待开票</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <RotateCcw size={20} className="text-gray-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{stats.reversed}</div>
              <div className="text-sm text-gray-500">已冲销</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-800">捐赠明细</h3>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索捐赠人/票据号..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                {[
                  { key: 'all', label: '全部' },
                  { key: 'targeted', label: '定向项目' },
                  { key: 'physical', label: '实物捐赠' },
                  { key: 'refund', label: '退款记录' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      activeTab === tab.key
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">行号</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">捐赠人</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">金额</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">项目</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">票据号</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">状态</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">来源</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDonations.map((donation: Donation) => (
                    <tr
                      key={donation.id}
                      className={`border-t border-gray-100 hover:bg-gray-50 ${
                        donation.exceptions.length > 0 ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {donation.sourceLine}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {donation.donorName}
                        {donation.isPhysical && (
                          <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                            实物
                          </span>
                        )}
                        {donation.hasRefund && (
                          <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                            退款
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        ¥{donation.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {donation.projectName || donation.projectId}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {donation.invoiceNumber || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[donation.invoiceStatus]}`}>
                          {invoiceStatusLabels[donation.invoiceStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {dataSourceLabels[donation.source]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-span-1">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-800">项目归集</h3>
              <p className="text-sm text-gray-500 mt-0.5">按项目汇总捐赠情况</p>
            </div>
            <div className="p-4 space-y-4">
              {projectSummaries.map(summary => (
                <div
                  key={summary.projectId}
                  className="p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-800">{summary.projectName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{summary.projectCode}</div>
                    </div>
                    {summary.isTargeted && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        定向
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500">捐赠 {summary.donationCount} 笔</span>
                    <span className="font-semibold text-gray-800">
                      ¥{summary.totalAmount.toLocaleString()}
                    </span>
                  </div>
                  {(summary.physicalCount > 0 || summary.refundCount > 0) && (
                    <div className="mt-1 flex gap-2 text-xs">
                      {summary.physicalCount > 0 && (
                        <span className="text-orange-600">实物 {summary.physicalCount}</span>
                      )}
                      {summary.refundCount > 0 && (
                        <span className="text-red-600">退款 {summary.refundCount}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 mt-4">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-800">核销统计</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">捐赠总额</span>
                <span className="font-semibold text-gray-800">¥{stats.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">退款总额</span>
                <span className="font-semibold text-red-600">¥{stats.refundAmount.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">实际核销</span>
                  <span className="font-bold text-green-600">
                    ¥{(stats.totalAmount - stats.refundAmount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
