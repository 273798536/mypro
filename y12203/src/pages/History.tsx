import { useState } from 'react';
import { FileText, FileCheck, Calculator, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../store';
import { formatDateTime } from '../utils/calculator';
import { formatFieldName, formatValue, deepDiff } from '../utils/diff';
import { EntityType, ActionType } from '../types';

const entityTypeLabels: Record<EntityType, { label: string; icon: any; color: string }> = {
  claim: { label: '赔案单', icon: FileText, color: 'bg-blue-100 text-blue-700' },
  contract: { label: '分保合同', icon: FileCheck, color: 'bg-accent-100 text-accent-700' },
  recovery: { label: '摊回计算', icon: Calculator, color: 'bg-green-100 text-green-700' },
};

const actionLabels: Record<ActionType, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  recalculate: '重新计算',
};

export default function History() {
  const { auditTrails, claims, contracts } = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterEntity, setFilterEntity] = useState<EntityType | ''>('');

  const filteredTrails = filterEntity
    ? auditTrails.filter((t) => t.entityType === filterEntity)
    : auditTrails;

  const sortedTrails = [...filteredTrails].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const getEntityName = (entityType: EntityType, entityId: string) => {
    if (entityType === 'claim') {
      return claims.find((c) => c.id === entityId)?.caseNo || entityId;
    }
    if (entityType === 'contract') {
      return contracts.find((c) => c.id === entityId)?.contractNo || entityId;
    }
    return entityId;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">历史追溯</h1>
          <p className="text-gray-500 mt-1">查看所有操作历史记录</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value as EntityType | '')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部类型</option>
            <option value="claim">赔案单</option>
            <option value="contract">分保合同</option>
            <option value="recovery">摊回计算</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-200" />

          <div className="divide-y divide-gray-100">
            {sortedTrails.map((trail, index) => {
              const config = entityTypeLabels[trail.entityType];
              const Icon = config.icon;
              const isExpanded = expandedId === trail.id;
              const diffs =
                trail.action === 'update'
                  ? deepDiff(trail.beforeValue || {}, trail.afterValue || {})
                  : [];

              return (
                <div
                  key={trail.id}
                  className="relative pl-20 pr-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={`absolute left-6 w-5 h-5 rounded-full border-4 border-white ${config.color} flex items-center justify-center shadow-md`}
                  >
                    <Icon className="w-2.5 h-2.5" />
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          {actionLabels[trail.action]}
                        </span>
                        <span className="font-medium text-gray-900">
                          {getEntityName(trail.entityType, trail.entityId)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{trail.remark}</p>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDateTime(trail.createdAt)}
                      </div>
                    </div>

                    {diffs.length > 0 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : trail.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>

                  {isExpanded && diffs.length > 0 && (
                    <div className="mt-4 ml-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-3">变更详情</p>
                      <div className="space-y-2">
                        {diffs.map((diff, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-4 text-sm"
                          >
                            <span className="w-24 text-gray-500">
                              {formatFieldName(diff.field)}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                                {formatValue(diff.before)}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                                {formatValue(diff.after)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {sortedTrails.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">暂无历史记录</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">操作统计</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(entityTypeLabels).map(([key, config]) => {
            const count = auditTrails.filter((t) => t.entityType === key).length;
            const Icon = config.icon;
            return (
              <div
                key={key}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <div className={`p-3 rounded-lg ${config.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{config.label}操作</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
