import { useState } from 'react';
import { Trophy, Settings, ChevronDown, ChevronUp, ArrowUpDown, Info } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function RankingCenter() {
  const {
    currentRanking,
    currentRule,
    availableRules,
    changeRankingRule,
    getContestantById,
    getScoreByContestantId,
    getSubmissionByContestantId,
  } = useAppStore();

  const [showRuleSelector, setShowRuleSelector] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleRuleChange = (ruleId: string) => {
    changeRankingRule(ruleId, '规则切换');
    setShowRuleSelector(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" />
            排名中心
          </h1>
          <p className="text-slate-500 mt-1">实时查看和管理选手排名</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowRuleSelector(!showRuleSelector)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            当前规则: {currentRule.name}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showRuleSelector && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
              <div className="p-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-700">选择排名规则</p>
              </div>
              {availableRules.map((rule) => (
                <button
                  key={rule.id}
                  onClick={() => handleRuleChange(rule.id)}
                  className={`w-full p-3 text-left hover:bg-slate-50 transition-colors ${
                    rule.id === currentRule.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <p className="font-medium text-slate-800">{rule.name}</p>
                  <p className="text-sm text-slate-500 mt-1">{rule.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">{currentRule.name}</p>
            <p className="text-sm text-blue-600 mt-1">{currentRule.description}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {currentRule.tieBreakRules.map((rule, index) => (
                <span
                  key={index}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                >
                  {index + 1}. {rule.rule === 'submissionTime' ? '提交时间' : rule.rule === 'specificCategory' ? rule.category : '人工确认'}
                  {rule.ascending ? '（升序）' : '（降序）'}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 w-16">排名</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">选手</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">队伍</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">总分</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">提交时间</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 w-20">详情</th>
            </tr>
          </thead>
          <tbody>
            {currentRanking.map((entry) => {
              const contestant = getContestantById(entry.contestantId);
              const score = getScoreByContestantId(entry.contestantId);
              const submission = getSubmissionByContestantId(entry.contestantId);
              const isExpanded = expandedRow === entry.contestantId;

              return (
                <>
                  <tr
                    key={entry.id}
                    className={`border-t border-slate-100 transition-colors ${
                      entry.isTied && entry.tieBreakStatus === 'pending'
                        ? 'bg-amber-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold ${
                            entry.rank === 1
                              ? 'text-amber-500'
                              : entry.rank === 2
                              ? 'text-slate-500'
                              : entry.rank === 3
                              ? 'text-amber-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {entry.rank}
                        </span>
                        {entry.isTied && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              entry.tieBreakStatus === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {entry.tieBreakStatus === 'pending' ? '待确认' : '已确认'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{contestant?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{contestant?.team}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {entry.score.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600 text-sm">
                      {submission
                        ? format(new Date(submission.submitTime), 'HH:mm:ss', { locale: zhCN })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setExpandedRow(isExpanded ? null : entry.contestantId)}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-slate-50">
                      <td colSpan={6} className="px-8 py-4">
                        <div className="grid grid-cols-3 gap-4">
                          {score?.items.map((item) => (
                            <div
                              key={item.id}
                              className="bg-white p-3 rounded-lg border border-slate-200"
                            >
                              <p className="text-sm text-slate-500">{item.category}</p>
                              <p className="text-lg font-bold text-slate-800">
                                {item.points}
                                <span className="text-sm font-normal text-slate-400 ml-1">
                                  × {item.weight}
                                </span>
                              </p>
                              <p className="text-xs text-slate-400">
                                小计: {(item.points * item.weight).toFixed(2)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        {currentRanking.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无排名数据</p>
          </div>
        )}
      </div>
    </div>
  );
}
