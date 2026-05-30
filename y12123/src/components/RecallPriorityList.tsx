import { useState } from 'react';
import { Users, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { RecallPriorityItem, MemberState } from '../types';
import { MEMBER_STATE_LABELS, MEMBER_STATE_COLORS } from '../types';
import { AnomalyCard } from './AnomalyCard';

interface RecallPriorityListProps {
  items: RecallPriorityItem[];
  threshold: number;
  compareItems?: RecallPriorityItem[];
}

export function RecallPriorityList({ items, threshold, compareItems }: RecallPriorityListProps) {
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const filteredItems = items.filter(item => {
    if (filter === 'high') return item.churnProbability >= threshold;
    if (filter === 'medium') return item.churnProbability >= threshold * 0.7 && item.churnProbability < threshold;
    if (filter === 'low') return item.churnProbability < threshold * 0.7;
    return true;
  });

  const getRankChange = (memberId: string): 'up' | 'down' | 'same' | 'new' => {
    if (!compareItems) return 'same';
    const oldItem = compareItems.find(i => i.memberId === memberId);
    const newItem = items.find(i => i.memberId === memberId);
    if (!oldItem && newItem) return 'new';
    if (!oldItem || !newItem) return 'same';
    if (newItem.rank < oldItem.rank) return 'up';
    if (newItem.rank > oldItem.rank) return 'down';
    return 'same';
  };

  const getProbChange = (memberId: string): number | null => {
    if (!compareItems) return null;
    const oldItem = compareItems.find(i => i.memberId === memberId);
    const newItem = items.find(i => i.memberId === memberId);
    if (!oldItem || !newItem) return null;
    return newItem.churnProbability - oldItem.churnProbability;
  };

  const getRiskBadge = (prob: number) => {
    if (prob >= threshold) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
          高风险
        </span>
      );
    }
    if (prob >= threshold * 0.7) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
          中风险
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
        低风险
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-slate-700" />
          <h3 className="font-semibold text-slate-800">召回优先级排序</h3>
        </div>
        <div className="text-center py-12 text-gray-500">
          暂无数据，请先上传数据并运行计算
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 transition-all duration-300 hover:shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-800">召回优先级排序</h3>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(['all', 'high', 'medium', 'low'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all
                  ${filter === f ? 'bg-white text-slate-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {f === 'all' ? '全部' : f === 'high' ? '高风险' : f === 'medium' ? '中风险' : '低风险'}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-500">
            显示 {filteredItems.length}/{items.length}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                排名
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                会员
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                当前状态
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                流失概率
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                优先级分
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                风险等级
              </th>
              {compareItems && (
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  变化
                </th>
              )}
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                建议策略
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                详情
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredItems.map((item) => {
              const rankChange = getRankChange(item.memberId);
              const probChange = getProbChange(item.memberId);
              const isExpanded = expandedMember === item.memberId;

              return (
                <>
                  <tr
                    key={item.memberId}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer
                      ${item.churnProbability >= threshold ? 'bg-red-50/30' : ''}`}
                    onClick={() => setExpandedMember(isExpanded ? null : item.memberId)}
                  >
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className={`inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-full
                          ${item.rank <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                          {item.rank}
                        </span>
                        {compareItems && rankChange === 'up' && (
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        )}
                        {compareItems && rankChange === 'down' && (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        {compareItems && rankChange === 'same' && (
                          <Minus className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.memberName || item.memberId}
                      </div>
                      <div className="text-xs text-gray-500">{item.memberId}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full"
                        style={{
                          backgroundColor: `${MEMBER_STATE_COLORS[item.currentState]}15`,
                          color: MEMBER_STATE_COLORS[item.currentState],
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: MEMBER_STATE_COLORS[item.currentState] }}
                        ></span>
                        {MEMBER_STATE_LABELS[item.currentState]}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="font-mono text-sm font-semibold text-gray-900">
                        {(item.churnProbability * 100).toFixed(1)}%
                      </div>
                      {probChange !== null && probChange !== 0 && (
                        <div className={`text-xs ${probChange > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {probChange > 0 ? '↑' : '↓'} {Math.abs(probChange * 100).toFixed(1)}%
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="font-mono text-sm font-semibold text-slate-700">
                        {(item.priorityScore * 100).toFixed(0)}
                      </div>
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-gradient-to-r from-slate-400 to-slate-600 rounded-full"
                          style={{ width: `${item.priorityScore * 100}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {getRiskBadge(item.churnProbability)}
                    </td>
                    {compareItems && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        {probChange !== null && (
                          <span className={`text-xs font-medium ${probChange > 0.1 ? 'text-red-600' : probChange < -0.1 ? 'text-emerald-600' : 'text-gray-500'}`}>
                            {probChange > 0.1 ? '流失风险↑' : probChange < -0.1 ? '流失风险↓' : '无明显变化'}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-3">
                      <div className="text-sm text-gray-700 max-w-xs truncate">
                        {item.suggestedAction}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={compareItems ? 9 : 8} className="px-3 py-4 bg-gray-50">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-gray-700">会员详情</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="text-gray-500">会员价值</div>
                              <div className="font-medium">¥{item.value?.toFixed(2) || '-'}</div>
                              <div className="text-gray-500">会员任期</div>
                              <div className="font-medium">{item.tenureDays || 0} 天</div>
                              <div className="text-gray-500">最后活跃</div>
                              <div className="font-medium">{item.lastActive ? formatDate(item.lastActive) : '-'}</div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-3">数据异常</h4>
                            {item.anomalies.length > 0 ? (
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {item.anomalies.map((anomaly, idx) => (
                                  <AnomalyCard key={idx} anomaly={anomaly} showSuggestion={false} />
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">无异常数据</div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          没有符合筛选条件的会员
        </div>
      )}
    </div>
  );
}
