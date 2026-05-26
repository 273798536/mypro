import React, { useState } from 'react';
import { Clock, AlertCircle, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { PlayerAction, Card, ErrorType } from '@/types';
import { ERROR_TYPE_LABELS, MATERIAL_TYPE_LABELS, SECURITY_LEVEL_LABELS, RETENTION_PERIOD_LABELS } from '@/types';

interface OperationLogProps {
  actions: PlayerAction[];
  cards: Card[];
  className?: string;
}

export const OperationLog: React.FC<OperationLogProps> = ({ actions, cards, className = '' }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const getErrorIcon = (errors: ErrorType[]) => {
    if (errors.length === 0) {
      return <CheckCircle size={18} className="text-green-500" />;
    }
    return <XCircle size={18} className="text-red-500" />;
  };

  const getLevelLabel = (level: string) => {
    return SECURITY_LEVEL_LABELS[level as keyof typeof SECURITY_LEVEL_LABELS] || level;
  };

  const getPeriodLabel = (period: string) => {
    return RETENTION_PERIOD_LABELS[period as keyof typeof RETENTION_PERIOD_LABELS] || period;
  };

  return (
    <div className={`rounded-xl border border-gray-200 bg-white ${className}`}>
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 font-medium text-gray-700">
        操作日志
      </div>
      <div className="max-h-96 overflow-y-auto">
        {actions.length === 0 ? (
          <div className="p-4 text-center text-gray-400">暂无操作记录</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {actions.map((action, index) => {
              const card = cards.find((c) => c.id === action.cardId);
              const isExpanded = expandedIndex === index;
              if (!card) return null;

              return (
                <div key={action.cardId + index} className="p-3">
                  <div
                    className="flex cursor-pointer items-center justify-between gap-2"
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  >
                    <div className="flex items-center gap-3">
                      {getErrorIcon(action.errors)}
                      <div>
                        <div className="text-sm font-medium text-gray-800">
                          第 {index + 1} 张 - {card.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock size={12} />
                          {new Date(action.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${action.scoreChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {action.scoreChange >= 0 ? '+' : ''}{action.scoreChange}
                      </span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs">
                      <div className="mb-2 font-medium text-gray-700">玩家选择：</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>分类：{MATERIAL_TYPE_LABELS[action.selectedType]}</div>
                        <div>保密级别：{getLevelLabel(action.selectedSecurityLevel)}</div>
                        <div>保管期限：{getPeriodLabel(action.selectedRetentionPeriod)}</div>
                        <div>借阅登记：{action.isBorrowRegistered ? '已登记' : '未登记'}</div>
                      </div>
                      
                      {action.errors.length > 0 && (
                        <div className="mt-2">
                          <div className="mb-1 flex items-center gap-1 font-medium text-red-600">
                            <AlertCircle size={12} />
                            错误类型：
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {action.errors.map((error) => (
                              <span key={error} className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">
                                {ERROR_TYPE_LABELS[error]}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-2 rounded-lg bg-white p-2">
                        <div className="mb-1 font-medium text-gray-600">正确答案：</div>
                        <div className="grid grid-cols-2 gap-1 text-gray-500">
                          <div>分类：{MATERIAL_TYPE_LABELS[card.materialType]}</div>
                          <div>保密级别：{getLevelLabel(card.correctSecurityLevel)}</div>
                          <div>保管期限：{getPeriodLabel(card.correctRetentionPeriod)}</div>
                          <div>借阅登记：{card.hasBorrowRequest ? '需要登记' : '不需要'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
