import { FileText, Download, Eye, Calendar, CheckCircle, AlertCircle, TrendingUp, Users } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { useRebateStore } from '../store/rebateStore';
import { useState } from 'react';

export default function Reports() {
  const { trials, dealers } = useRebateStore();
  const [selectedPeriod, setSelectedPeriod] = useState('2024-Q4');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="success">已确认</Badge>;
      case 'draft':
        return <Badge variant="warning">草稿</Badge>;
      case 'reviewing':
        return <Badge variant="info">复核中</Badge>;
      default:
        return <Badge variant="default">未知</Badge>;
    }
  };

  const stats = {
    totalTrials: trials.length,
    totalRebate: trials.reduce((sum, t) => sum + (t.versions[t.versions.length - 1]?.finalRebateAmount || 0), 0),
    confirmedCount: trials.filter(t => t.status === 'finalized').length,
    dealerCount: dealers.length
  };

  const periods = ['2024-Q4', '2024-Q3', '2024-Q2', '2024-Q1'];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">报告输出</h1>
          <p className="text-gray-500 mt-1">合规报告、差异分析和审计追踪</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {periods.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">试算报告数</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalTrials}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <FileText size={20} className="text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">返利总额</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(stats.totalRebate)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp size={20} className="text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已确认</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{stats.confirmedCount}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <CheckCircle size={20} className="text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">经销商</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">{stats.dealerCount}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Users size={20} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">返利试算报告列表</h3>
          <p className="text-sm text-gray-500 mt-1">点击查看报告详情或导出</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">报告编号</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">经销商</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">周期</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">版本</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">计算基数</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">最终返利</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {trials.map((trial) => (
                <tr key={trial.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-blue-600">{trial.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{trial.dealerName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{trial.period}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Badge variant="info">v{trial.currentVersion}</Badge>
                      {trial.versions.length > 1 && (
                        <Badge variant="warning" size="sm">{trial.versions.length} 版本</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{formatCurrency(trial.versions[trial.versions.length - 1]?.baseAmount || 0)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(trial.versions[trial.versions.length - 1]?.finalRebateAmount || 0)}</span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(trial.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="查看">
                        <Eye size={16} />
                      </button>
                      <button className="p-1 text-green-600 hover:bg-green-50 rounded" title="导出Excel">
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">快速报告模板</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">合规汇总报告</p>
                  <p className="text-sm text-gray-500">含审计追踪和版本历史</p>
                </div>
              </div>
              <Download size={16} className="text-gray-400" />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <TrendingUp size={18} className="text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">差异分析报告</p>
                  <p className="text-sm text-gray-500">版本间变更对比</p>
                </div>
              </div>
              <Download size={16} className="text-gray-400" />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <AlertCircle size={18} className="text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">风险预警报告</p>
                  <p className="text-sm text-gray-500">异常数据和合规风险</p>
                </div>
              </div>
              <Download size={16} className="text-gray-400" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">合规状态概览</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">数据完整率</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="w-11/12 h-full bg-green-500 rounded-full"></div>
                </div>
                <span className="text-sm font-medium text-gray-900">92%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">协议匹配率</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="w-5/6 h-full bg-blue-500 rounded-full"></div>
                </div>
                <span className="text-sm font-medium text-gray-900">85%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">试算确认率</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="w-3/5 h-full bg-orange-500 rounded-full"></div>
                </div>
                <span className="text-sm font-medium text-gray-900">60%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">审计追踪完整</span>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                <span className="text-sm font-medium text-green-600">合规</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
