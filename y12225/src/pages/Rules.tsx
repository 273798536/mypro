import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { WaiverRule } from '@/types';
import { Shield, Plus, Edit3, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, History, TrendingUp, TrendingDown } from 'lucide-react';

const ruleTypeLabel: Record<WaiverRule['ruleType'], string> = {
  percent: '比例减免',
  fixed: '固定减免',
  days: '天数减免',
};

const ruleTypeUnit: Record<WaiverRule['ruleType'], string> = {
  percent: '%',
  fixed: '元',
  days: '天',
};

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

export default function Rules() {
  const rules = useStore((s) => s.rules);
  const containers = useStore((s) => s.containers);
  const updateRule = useStore((s) => s.updateRule);

  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [editReason, setEditReason] = useState('');
  const [expandedRuleIds, setExpandedRuleIds] = useState<Set<string>>(new Set());

  const startEdit = (rule: WaiverRule) => {
    setEditingRuleId(rule.id);
    setEditValue(rule.value);
    setEditReason('');
  };

  const cancelEdit = () => {
    setEditingRuleId(null);
    setEditValue(0);
    setEditReason('');
  };

  const saveEdit = (ruleId: string) => {
    if (!editReason.trim()) return;
    updateRule(ruleId, { value: editValue }, editReason.trim());
    setEditingRuleId(null);
    setEditValue(0);
    setEditReason('');
  };

  const toggleExpand = (ruleId: string) => {
    setExpandedRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  const getAffectedContainers = (rule: WaiverRule) => {
    const allAffectedIds = rule.changeLogs.flatMap((cl) => cl.affectedContainerIds);
    const uniqueIds = [...new Set(allAffectedIds)];
    return uniqueIds
      .map((id) => containers.find((c) => c.id === id))
      .filter(Boolean) as typeof containers;
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-port-500 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-serif text-xl font-bold text-port-500">减免规则管理</h1>
          <p className="text-sm text-gray-500">管理堆存费减免规则，追踪规则变更影响</p>
        </div>
      </div>

      <div className="space-y-4">
        {rules.map((rule) => {
          const isEditing = editingRuleId === rule.id;
          const isExpanded = expandedRuleIds.has(rule.id);
          const affectedContainers = getAffectedContainers(rule);
          const hasChangeLogs = rule.changeLogs.length > 0;

          return (
            <div key={rule.id} className="space-y-3">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-serif font-bold text-port-500 text-lg">{rule.ruleName}</h3>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-port-50 text-port-500 border border-port-100">
                          {ruleTypeLabel[rule.ruleType]}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          v{rule.version}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {rule.isActive ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-accent-emerald" />
                              <span className="text-xs text-accent-emerald font-medium">生效中</span>
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-gray-400" />
                              <span className="text-xs text-gray-400 font-medium">已停用</span>
                            </>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center gap-3">
                            <label className="text-sm text-gray-600 w-20 shrink-0">当前值</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(Number(e.target.value))}
                                className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-port-400 focus:border-port-400"
                              />
                              <span className="text-sm text-gray-500">{ruleTypeUnit[rule.ruleType]}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <label className="text-sm text-gray-600 w-20 shrink-0 pt-1.5">
                              变更原因<span className="text-accent-rose">*</span>
                            </label>
                            <textarea
                              value={editReason}
                              onChange={(e) => setEditReason(e.target.value)}
                              placeholder="请输入变更原因"
                              rows={2}
                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-port-400 focus:border-port-400"
                            />
                          </div>
                          <div className="flex items-center gap-2 pl-23">
                            <button
                              onClick={() => saveEdit(rule.id)}
                              disabled={!editReason.trim()}
                              className="px-4 py-1.5 bg-port-500 text-white text-sm rounded-lg hover:bg-port-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              保存
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-4 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">当前值</span>
                              <span className="font-mono font-semibold text-port-500 text-base">
                                {rule.value}
                              </span>
                              <span className="text-gray-500">{ruleTypeUnit[rule.ruleType]}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">生效日期</span>
                              <span className="text-gray-700">{formatDate(rule.effectiveDate)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">创建人</span>
                              <span className="text-gray-700">{rule.createdBy}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">{rule.condition}</p>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <button
                        onClick={() => startEdit(rule)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-port-500 border border-port-200 rounded-lg hover:bg-port-50 transition-colors shrink-0"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        编辑
                      </button>
                    )}
                  </div>

                  {hasChangeLogs && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => toggleExpand(rule.id)}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-port-500 transition-colors"
                      >
                        <History className="w-4 h-4" />
                        <span>变更记录（{rule.changeLogs.length}）</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-3">
                          {rule.changeLogs.map((log) => {
                            const oldValue = Number(log.oldValue);
                            const newValue = Number(log.newValue);
                            const isIncrease = newValue > oldValue;

                            return (
                              <div
                                key={log.id}
                                className="bg-gray-50 rounded-lg p-4 space-y-2"
                              >
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-500">变更字段</span>
                                  <span className="font-medium text-gray-700">{log.fieldName}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                  <span className="text-gray-500">值变更</span>
                                  <span className="font-mono text-accent-rose font-medium">{log.oldValue}</span>
                                  {isIncrease ? (
                                    <TrendingUp className="w-4 h-4 text-accent-emerald" />
                                  ) : (
                                    <TrendingDown className="w-4 h-4 text-accent-rose" />
                                  )}
                                  <span className="font-mono text-accent-emerald font-medium">{log.newValue}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-500">变更原因</span>
                                  <span className="text-gray-700">{log.changeReason}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">操作人</span>
                                    <span className="text-gray-700">{log.changedBy}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">变更时间</span>
                                    <span className="text-gray-700">{formatDate(log.changedAt)}</span>
                                  </div>
                                </div>
                                {log.affectedContainerIds.length > 0 && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <CheckCircle className="w-3.5 h-3.5 text-accent-amber" />
                                    <span className="text-accent-amber font-medium">
                                      影响{log.affectedContainerIds.length}条记录
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {hasChangeLogs && affectedContainers.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-accent-amber" />
                    <span className="text-sm font-medium text-amber-800">影响分析</span>
                    <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                      {affectedContainers.length}个受影响集装箱
                    </span>
                  </div>
                  <div className="space-y-2">
                    {affectedContainers.map((container) => (
                      <div
                        key={container.id}
                        className="flex items-start gap-3 bg-white rounded-lg p-3 border border-amber-100"
                      >
                        <div className="flex items-center gap-2 shrink-0">
                          <CheckCircle className="w-3.5 h-3.5 text-accent-amber" />
                          <span className="font-mono text-sm text-gray-700">
                            {container.containerNo}
                          </span>
                        </div>
                        {container.affectedByRuleChange && (
                          <span className="text-sm text-amber-700">{container.affectedByRuleChange}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
