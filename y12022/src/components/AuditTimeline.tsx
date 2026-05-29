import {
  GitCommit,
  GraduationCap,
  Calendar,
  UserPlus,
  LogOut,
  Snowflake,
  DollarSign,
  ArrowRight,
  Clock,
  User,
  Tag,
} from 'lucide-react';
import { AuditLog, EntityType } from '../types';

interface AuditTimelineProps {
  logs: AuditLog[];
  title?: string;
  maxItems?: number;
}

export const AuditTimeline = ({ logs, title = '操作日志', maxItems }: AuditTimelineProps) => {
  const displayLogs = maxItems ? logs.slice(0, maxItems) : logs;

  const entityConfig: Record<EntityType, { label: string; icon: typeof GraduationCap; color: string }> = {
    coursePack: { label: '课包', icon: GraduationCap, color: 'bg-teal-500' },
    attendance: { label: '签到', icon: Calendar, color: 'bg-blue-500' },
    substitute: { label: '代课', icon: UserPlus, color: 'bg-orange-500' },
    leave: { label: '请假', icon: LogOut, color: 'bg-amber-500' },
    freeze: { label: '冻结', icon: Snowflake, color: 'bg-cyan-500' },
    revenue: { label: '收入', icon: DollarSign, color: 'bg-emerald-500' },
  };

  const actionLabels: Record<string, string> = {
    create: '创建',
    update: '修改',
    delete: '删除',
    confirm: '确认',
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatValue = (value: unknown) => {
    if (value === null || value === undefined) return '空';
    if (typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(', ');
    }
    return String(value);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="p-4 max-h-96 overflow-y-auto">
        {displayLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <GitCommit className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无操作记录</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-4">
              {displayLogs.map((log) => {
                const config = entityConfig[log.entityType];
                const Icon = config.icon;
                return (
                  <div key={log.id} className="relative pl-10">
                    <div
                      className={`absolute left-2.5 w-4 h-4 rounded-full ${config.color} border-2 border-white shadow`}
                    />
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white ${config.color}`}
                          >
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </span>
                          <span className="text-xs font-medium text-gray-600">
                            {actionLabels[log.action]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {formatDate(log.timestamp)}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Tag className="w-3 h-3" />
                          <span>来源: {log.source}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <User className="w-3 h-3" />
                          <span>操作人: {log.operator}</span>
                        </div>

                        {(log.beforeValue || log.afterValue) && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="text-xs font-medium text-gray-600 mb-1">变更详情:</div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              {log.beforeValue && (
                                <span className="px-2 py-1 bg-red-50 text-red-700 rounded">
                                  {formatValue(log.beforeValue)}
                                </span>
                              )}
                              <ArrowRight className="w-3 h-3 text-gray-400" />
                              {log.afterValue && (
                                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded">
                                  {formatValue(log.afterValue)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
