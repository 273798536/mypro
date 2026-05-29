import { Search, Eye, Download, Plus, FileText, Clock, GitCompare } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { useRebateStore } from '../store/rebateStore';
import { useState } from 'react';

export default function Agreements() {
  const { agreements, compareTrialVersions } = useRebateStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgreement, setSelectedAgreement] = useState<string | null>(null);

  const filteredAgreements = agreements.filter((agreement) =>
    agreement.agreementNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agreement.dealerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">生效中</Badge>;
      case 'expired':
        return <Badge variant="error">已过期</Badge>;
      case 'draft':
        return <Badge variant="warning">待生效</Badge>;
      default:
        return <Badge variant="default">未知</Badge>;
    }
  };

  const selectedAgreementData = agreements.find(a => a.id === selectedAgreement);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">协议管理</h1>
          <p className="text-gray-500 mt-1">管理返利协议及版本追溯</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Download size={16} className="mr-2" />
            导出
          </button>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
            <Plus size={16} className="mr-2" />
            新建协议
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索协议编号、经销商..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">协议编号</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">经销商</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">返利比例</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">有效期</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">版本</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAgreements.map((agreement) => (
                    <tr key={agreement.id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedAgreement === agreement.id ? 'bg-blue-50' : ''}`}
                        onClick={() => setSelectedAgreement(agreement.id)}>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-blue-600">{agreement.agreementNo}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">{agreement.dealerName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900 font-medium">
                          {(agreement.versions[agreement.versions.length - 1]?.terms.rebateRate * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{agreement.startDate} 至 {agreement.endDate}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Badge variant="info">v{agreement.currentVersion}</Badge>
                          {agreement.versions.length > 1 && (
                            <Badge variant="warning" size="sm">{agreement.versions.length} 版本</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(agreement.status)}
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-blue-600 hover:text-blue-800 p-1" title="版本对比">
                          <GitCompare size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {selectedAgreementData && (
          <div className="w-96">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-8">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">协议详情</h3>
                  {getStatusBadge(selectedAgreementData.status)}
                </div>
                <p className="text-sm text-gray-500 mt-1">{selectedAgreementData.agreementNo}</p>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-medium">经销商</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedAgreementData.dealerName}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-medium">返利比例</label>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {(selectedAgreementData.versions[selectedAgreementData.versions.length - 1]?.terms.rebateRate * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-medium">最低采购</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {formatCurrency(selectedAgreementData.versions[selectedAgreementData.versions.length - 1]?.terms.minimumPurchase || 0)}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-medium">有效期</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedAgreementData.startDate} 至 {selectedAgreementData.endDate}
                  </p>
                </div>
              </div>

              {selectedAgreementData.versions.length > 0 && (
                <div className="border-t border-gray-100">
                  <div className="p-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                      <Clock size={16} className="mr-2 text-gray-400" />
                      版本变更历史
                    </h4>
                    <div className="space-y-3">
                      {selectedAgreementData.versions.slice().reverse().map((version) => (
                        <div key={version.id} className="pl-4 border-l-2 border-blue-200">
                          <p className="text-sm font-medium text-gray-900">{version.changeReason || '版本创建'}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            v{version.versionNo} · {version.effectiveDate} · {version.operator}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
