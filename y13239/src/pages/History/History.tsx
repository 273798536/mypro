import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Filter,
  MessageSquare,
  Check,
  Edit,
  Download,
  Layers,
  ArrowLeftRight,
  FileText,
} from 'lucide-react';
import { useMaterialStore } from '@/store/useMaterialStore';
import { actionLabels } from '@/data/mockData';
import { cn } from '@/lib/utils';
import type { OperationAction } from '@/types';

const actionIcons: Record<OperationAction, React.ComponentType<{ className?: string }>> = {
  create: FileText,
  update: Edit,
  confirm: Check,
  annotate: MessageSquare,
  export: Download,
  version_add: Layers,
  status_change: ArrowLeftRight,
};

const actionColors: Record<OperationAction, string> = {
  create: 'bg-blue-100 text-blue-600',
  update: 'bg-gray-100 text-gray-600',
  confirm: 'bg-green-100 text-green-600',
  annotate: 'bg-amber-100 text-amber-600',
  export: 'bg-purple-100 text-purple-600',
  version_add: 'bg-cyan-100 text-cyan-600',
  status_change: 'bg-orange-100 text-orange-600',
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const { operationLogs, materials, getMaterialById } = useMaterialStore();
  const [selectedAction, setSelectedAction] = useState<OperationAction | ''>('');

  const filteredLogs = useMemo(() => {
    let logs = [...operationLogs];

    if (selectedAction) {
      logs = logs.filter((log) => log.action === selectedAction);
    }

    return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [operationLogs, selectedAction]);

  const allActions = Object.keys(actionLabels) as OperationAction[];

  const stats = useMemo(() => {
    const actionCounts = allActions.reduce(
      (acc, action) => {
        acc[action] = operationLogs.filter((l) => l.action === action).length;
        return acc;
      },
      {} as Record<OperationAction, number>
    );

    return {
      total: operationLogs.length,
      ...actionCounts,
    };
  }, [operationLogs, allActions]);

  // Group logs by date
  const groupedLogs = useMemo(() => {
    const groups: Record<string, typeof filteredLogs> = {};

    filteredLogs.forEach((log) => {
      const date = log.timestamp.split(' ')[0] || log.timestamp;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
    });

    return groups;
  }, [filteredLogs]);

  const getMaterialName = (materialId: string) => {
    if (materialId === 'system') return '系统操作';
    const material = getMaterialById(materialId);
    return material?.name || '未知材料';
  };

  return (
    <div className="animate-fadeIn">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-[#0F2B4D] mb-1">
          历史记录
        </h1>
        <p className="text-sm text-gray-500">
          查看所有操作记录，用于社区公示前复盘和接手同事解释
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <StatCard
          label="总操作数"
          value={stats.total}
          icon={History}
          color="bg-[#0F2B4D] text-white"
        />
        <StatCard
          label="创建"
          value={stats.create}
          icon={FileText}
          color="bg-blue-500 text-white"
        />
        <StatCard
          label="批注"
          value={stats.annotate}
          icon={MessageSquare}
          color="bg-amber-500 text-white"
        />
        <StatCard
          label="确认"
          value={stats.confirm}
          icon={Check}
          color="bg-green-500 text-white"
        />
        <StatCard
          label="版本"
          value={stats.version_add}
          icon={Layers}
          color="bg-cyan-500 text-white"
        />
        <StatCard
          label="状态变更"
          value={stats.status_change}
          icon={ArrowLeftRight}
          color="bg-orange-500 text-white"
        />
        <StatCard
          label="导出"
          value={stats.export}
          icon={Download}
          color="bg-purple-500 text-white"
        />
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Filter className="w-5 h-5 text-[#0F2B4D]" />
          <span className="font-serif font-semibold text-[#0F2B4D]">操作类型筛选</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedAction('')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg transition-colors',
              selectedAction === ''
                ? 'bg-[#0F2B4D] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            全部
          </button>
          {allActions.map((action) => (
            <button
              key={action}
              onClick={() => setSelectedAction(action)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                selectedAction === action
                  ? 'bg-[#0F2B4D] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {actionLabels[action]}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-serif font-semibold text-[#0F2B4D] text-lg mb-6 pb-2 border-b border-gray-100">
          操作时间线
          <span className="text-sm font-normal text-gray-500 ml-2">
            共 {filteredLogs.length} 条记录
          </span>
        </h2>

        {Object.entries(groupedLogs).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedLogs).map(([date, logs]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#D4A853]" />
                  <h3 className="font-medium text-gray-700">{date}</h3>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400">{logs.length} 条操作</span>
                </div>

                <div className="space-y-3 ml-1">
                  {logs.map((log) => {
                    const Icon = actionIcons[log.action] || FileText;
                    const material =
                      log.materialId !== 'system'
                        ? getMaterialById(log.materialId)
                        : null;

                    return (
                      <div
                        key={log.id}
                        className="relative pl-8 pb-4 border-l-2 border-gray-100 last:border-transparent last:pb-0"
                      >
                        <div
                          className={cn(
                            'absolute left-0 top-0 w-8 h-8 -translate-x-1/2 rounded-full flex items-center justify-center',
                            actionColors[log.action] || 'bg-gray-100 text-gray-600'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100/70 transition-colors">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <span className="font-medium text-gray-800">
                                {actionLabels[log.action]}
                              </span>
                              {material && (
                                <button
                                  onClick={() => navigate(`/detail/${material.id}`)}
                                  className="ml-2 text-[#D4A853] hover:underline text-sm"
                                >
                                  {material.name}
                                </button>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {log.timestamp.split(' ')[1] || log.timestamp}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 mb-2">{log.description}</p>

                          {log.beforeChange && log.afterChange && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="px-2 py-1 bg-red-50 text-red-600 rounded">
                                {log.beforeChange}
                              </span>
                              <ArrowLeftRight className="w-3 h-3 text-gray-400" />
                              <span className="px-2 py-1 bg-green-50 text-green-600 rounded">
                                {log.afterChange}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <span>操作人: {log.operator}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">暂无操作记录</p>
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800 font-medium mb-1">
          📋 社区公示前复盘说明
        </p>
        <p className="text-xs text-amber-700">
          所有人工确认前后的变化都会记录在此历史中。当需要向接手同事解释或进行社区公示复盘时，
          可以通过此页面追溯每一次变更的原因和操作人，确保分账过程透明可查。
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className={cn('rounded-xl p-4 text-white', color)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold font-serif">{value}</p>
    </div>
  );
}
