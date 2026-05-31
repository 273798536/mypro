import { useState } from 'react';
import { PieChart, ChevronDown, ChevronRight, Edit3, Download, Calendar, Search } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/format';
import { cn } from '../lib/utils';

export function Allocation() {
  const allocationResults = useStore((state) => state.allocationResults);
  const projectTags = useStore((state) => state.projectTags);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleExpand = (projectId: string) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
  };

  const filteredResults = allocationResults.filter((result) =>
    result.projectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAllocated = allocationResults.reduce((sum, r) => sum + r.totalAmount, 0);

  const getAllocationRuleLabel = (rule: string) => {
    const labels: Record<string, string> = {
      tag_match: '标签匹配',
      manual: '手动指定',
      proportion: '比例分摊',
    };
    return labels[rule] || rule;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">项目分摊</h1>
          <p className="text-gray-500 mt-1">按项目维度查看成本分摊明细</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <Calendar className="w-4 h-4" />
            2024年5月
            <ChevronDown className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            <Download className="w-4 h-4" />
            导出分摊表
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">分摊汇总</h2>
            <div className="text-right">
              <p className="text-sm text-gray-500">分摊总金额</p>
              <p className="text-2xl font-bold text-primary-700">{formatCurrency(totalAllocated)}</p>
            </div>
          </div>
          <div className="space-y-4">
            {allocationResults.map((result, index) => {
              const percentage = ((result.totalAmount / totalAllocated) * 100).toFixed(1);
              const colors = ['bg-primary-500', 'bg-purple-500', 'bg-cyan-500', 'bg-warning-500', 'bg-gray-400'];
              return (
                <div key={result.projectId}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-3 h-3 rounded-full', colors[index % colors.length])} />
                      <span className="font-medium text-gray-900">{result.projectName}</span>
                      <span className="text-sm text-gray-500">({result.items.length} 项资源)</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-gray-900">{formatCurrency(result.totalAmount)}</span>
                      <span className="text-sm text-gray-500 w-16 text-right">{percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', colors[index % colors.length])}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
              <PieChart className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">标签配置</h2>
              <p className="text-sm text-gray-500">{projectTags.length} 个标签规则</p>
            </div>
          </div>
          <div className="space-y-3">
            {projectTags.slice(0, 5).map((tag) => (
              <div key={tag.tagId} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{tag.projectName}</span>
                  <span className="text-xs text-gray-500">{tag.tagKey}:{tag.tagValue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">分摊明细</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索项目..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredResults.map((result) => (
            <div key={result.projectId}>
              <button
                onClick={() => toggleExpand(result.projectId)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {expandedProject === result.projectId ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{result.projectName}</p>
                    <p className="text-sm text-gray-500">{result.items.length} 条分摊记录</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(result.totalAmount)}</p>
                  <p className="text-sm text-gray-500">
                    占比 {((result.totalAmount / totalAllocated) * 100).toFixed(1)}%
                  </p>
                </div>
              </button>

              {expandedProject === result.projectId && (
                <div className="bg-gray-50 border-t border-gray-100">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left">
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">资源名称</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">资源ID</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">标签</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">分摊规则</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">金额</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {result.items.map((item) => (
                        <tr key={item.itemId} className="hover:bg-gray-100">
                          <td className="px-6 py-3 text-sm text-gray-900">{item.resourceName}</td>
                          <td className="px-6 py-3 text-sm text-gray-500 font-mono">{item.resourceId}</td>
                          <td className="px-6 py-3">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(item.tags).map(([key, value]) => (
                                <span
                                  key={key}
                                  className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full"
                                >
                                  {key}:{value}
                                </span>
                              ))}
                              {Object.keys(item.tags).length === 0 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                                  无标签
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <span
                              className={cn(
                                'px-2 py-1 text-xs rounded-full',
                                item.allocationRule === 'tag_match'
                                  ? 'bg-success-100 text-success-700'
                                  : item.allocationRule === 'manual'
                                  ? 'bg-warning-100 text-warning-700'
                                  : 'bg-gray-100 text-gray-700'
                              )}
                            >
                              {getAllocationRuleLabel(item.allocationRule)}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-900 font-medium text-right">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <PieChart className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-800 mb-2">分摊规则说明</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>标签匹配</strong>：根据资源标签自动匹配对应项目，为推荐分摊方式</li>
              <li>• <strong>手动指定</strong>：对于无标签或标签异常的资源，可人工指定归属项目</li>
              <li>• <strong>比例分摊</strong>：公共资源可按预设比例分摊到多个项目</li>
              <li>• 分摊调整后需重新计算账本余额，建议每月5日前完成上月分摊确认</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
