import type { DecisionRecord } from '@/types';
import { DECISION_LABELS, ERROR_TYPE_LABELS } from '@/types';
import { DIVERSION_RULES } from '@/game/rules';
import { EmotionBadge } from './EmotionBadge';
import { IntentBadge } from './IntentBadge';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Bot, User, Eye } from 'lucide-react';
import { useState } from 'react';

interface RuleMatchTimelineProps {
  records: DecisionRecord[];
}

export function RuleMatchTimeline({ records }: RuleMatchTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const decisionIcon = {
    ai: Bot,
    human: User,
    observe: Eye,
  };

  const getRuleInfo = (ruleId: string) => {
    return DIVERSION_RULES.find(r => r.id === ruleId);
  };

  return (
    <div className="space-y-4">
      {records.map((record, index) => {
        const isExpanded = expandedId === record.cardId;
        const DecisionIcon = decisionIcon[record.userDecision];
        const CorrectIcon = decisionIcon[record.correctDecision];

        return (
          <div
            key={record.cardId}
            className={`bg-slate-800/60 backdrop-blur-sm rounded-2xl border transition-all duration-300 overflow-hidden ${
              record.isCorrect
                ? 'border-emerald-500/30 hover:border-emerald-500/50'
                : 'border-red-500/30 hover:border-red-500/50'
            }`}
          >
            <div
              className="p-4 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : record.cardId)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  record.isCorrect ? 'bg-emerald-500/20' : 'bg-red-500/20'
                }`}>
                  {record.isCorrect ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-white font-medium">决策 #{index + 1}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                      record.isCorrect
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {record.isCorrect ? '正确' : '错误'}
                    </span>
                    {record.errorType && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-orange-500/20 text-orange-400">
                        {ERROR_TYPE_LABELS[record.errorType]}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <DecisionIcon className="w-4 h-4" />
                      <span>你的选择：{DECISION_LABELS[record.userDecision]}</span>
                    </div>
                    {!record.isCorrect && (
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <span>→</span>
                        <CorrectIcon className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">正确：{DECISION_LABELS[record.correctDecision]}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className={`font-mono font-bold text-lg ${
                    record.isCorrect ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {record.isCorrect ? '+' : ''}
                    {record.responseTime < 5000 ? record.isCorrect ? 15 : -8 :
                     record.responseTime < 10000 ? record.isCorrect ? 13 : -7 :
                     record.isCorrect ? 10 : -5}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {(record.responseTime / 1000).toFixed(1)}s
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <EmotionBadge
                  emotion={record.cardSnapshot.emotion}
                  confidence={record.cardSnapshot.emotionConfidence}
                  showConfidence={false}
                />
                <IntentBadge
                  intent={record.cardSnapshot.intent}
                  confidence={record.cardSnapshot.intentConfidence}
                  showConfidence={false}
                />
                {record.matchedRules.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-blue-400">
                    <AlertTriangle className="w-3 h-3" />
                    <span>命中 {record.matchedRules.length} 条规则</span>
                  </div>
                )}
                {record.dirtyDataHandled && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                    含脏数据
                  </span>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-slate-700/50 pt-4">
                <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
                  <div className="text-sm text-gray-400 mb-2">客户消息</div>
                  <p className="text-white">{record.cardSnapshot.customerMessage}</p>
                </div>

                {record.cardSnapshot.botReply && (
                  <div className="bg-cyan-500/10 rounded-xl p-4 mb-4 border border-cyan-500/20">
                    <div className="text-sm text-cyan-400 mb-2">机器人回复</div>
                    <p className="text-cyan-100">{record.cardSnapshot.botReply}</p>
                  </div>
                )}

                {!record.cardSnapshot.botReply && record.cardSnapshot.botReplyHistory.length === 0 && (
                  <div className="bg-orange-500/10 rounded-xl p-4 mb-4 border border-orange-500/20">
                    <div className="text-sm text-orange-400 mb-2">机器人回复</div>
                    <p className="text-orange-300 italic">⚠️ 无有效回复</p>
                  </div>
                )}

                {record.matchedRules.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-400 mb-2">命中规则</div>
                    <div className="space-y-2">
                      {record.matchedRules.map(ruleId => {
                        const rule = getRuleInfo(ruleId);
                        return rule ? (
                          <div
                            key={ruleId}
                            className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/30 text-blue-300 font-mono">
                                {rule.id}
                              </span>
                              <span className="text-blue-300 font-medium">{rule.name}</span>
                              <span className="ml-auto text-xs text-gray-500">
                                优先级: {rule.priority}
                              </span>
                            </div>
                            <p className="text-sm text-blue-200/80">{rule.description}</p>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {record.errorDetails && (
                  <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <div className="text-sm text-red-400 mb-1">错误分析</div>
                    <p className="text-sm text-red-200/80">{record.errorDetails}</p>
                  </div>
                )}

                {record.cardSnapshot.remarks && (
                  <div className="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <div className="text-sm text-yellow-400 mb-1">培训师备注</div>
                    <p className="text-sm text-yellow-200/80">{record.cardSnapshot.remarks}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
