import { GitCompare, Clock, User, ChevronRight, Save, Layers, Activity } from 'lucide-react';
import { useScheduleStore } from '@/store';
import { useState } from 'react';

export default function History() {
  const versions = useScheduleStore((state) => state.versions);
  const volunteers = useScheduleStore((state) => state.volunteers);
  const positions = useScheduleStore((state) => state.positions);
  const stages = useScheduleStore((state) => state.stages);
  const timeSlots = useScheduleStore((state) => state.timeSlots);
  const createVersion = useScheduleStore((state) => state.createVersion);

  const [newVersionName, setNewVersionName] = useState('');

  const handleCreateVersion = () => {
    if (newVersionName.trim()) {
      createVersion(newVersionName, '活动统筹');
      setNewVersionName('');
    }
  };

  const getChangeLabel = (type: string) => {
    const labels: Record<string, string> = {
      add: '新增',
      remove: '删除',
      update: '更新',
      swap: '换班'
    };
    return labels[type] || type;
  };

  const getChangeColor = (type: string) => {
    const colors: Record<string, string> = {
      add: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      remove: 'text-red-600 bg-red-50 border-red-200',
      update: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      swap: 'text-orange-600 bg-orange-50 border-orange-200'
    };
    return colors[type] || 'text-slate-600 bg-slate-50 border-slate-200';
  };

  const formatEntityType = (entityType: string) => {
    const map: Record<string, string> = {
      entry: '排班记录',
      volunteer: '志愿者',
      stage: '舞台',
      timeSlot: '时段',
      position: '岗位'
    };
    return map[entityType] || entityType;
  };

  const describeChange = (change: {
    type: string;
    entityType: string;
    newValue?: unknown;
    oldValue?: unknown;
  }) => {
    try {
      if (change.entityType === 'entry') {
        const data =
          (change.type === 'remove' ? (change.oldValue as Record<string, unknown>) : null) ||
          (change.type === 'add' ? (change.newValue as Record<string, unknown>) : null) ||
          (change.oldValue as Record<string, unknown>) ||
          {};
        const volunteerName =
          volunteers.find((v) => v.id === (data.volunteerId as string))?.name ||
          (data.volunteerId as string);
        const position = positions.find((p) => p.id === (data.positionId as string));
        const timeSlot = timeSlots.find((t) => t.id === (data.timeSlotId as string));
        const stage = stages.find((s) => s.id === (data.stageId as string));
        const posName = position?.name || '岗位';
        const slotLabel = timeSlot?.label || '';
        const stageName = stage?.name || '';
        if (change.type === 'add') {
          return `分配 「${volunteerName || '志愿者'}」 到 ${stageName}·${slotLabel} ${posName}`;
        }
        if (change.type === 'remove') {
          return `取消 ${stageName}·${slotLabel} ${posName} 的「${volunteerName || '志愿者'}」`;
        }
        if (change.type === 'update') {
          return `调整 ${stageName}·${slotLabel} ${posName} 排班状态`;
        }
      }
      if (change.entityType === 'volunteer') {
        const data = (change.oldValue || change.newValue) as Record<string, unknown>;
        const name = (data?.name as string) || '志愿者';
        if (change.type === 'add') return `新增志愿者「${name}」`;
        if (change.type === 'remove') return `移除志愿者「${name}」`;
        if (change.type === 'update') return `更新志愿者「${name}」资料`;
      }
      if (change.entityType === 'stage') {
        const data = (change.oldValue || change.newValue) as Record<string, unknown>;
        const name = (data?.name as string) || '舞台';
        if (change.type === 'add') return `新增舞台「${name}」`;
        if (change.type === 'remove') return `删除舞台「${name}」`;
        if (change.type === 'update') return `更新舞台「${name}」配置`;
      }
      if (change.entityType === 'position') {
        const data = (change.oldValue || change.newValue) as Record<string, unknown>;
        const name = (data?.name as string) || '岗位';
        if (change.type === 'add') return `新增岗位「${name}」`;
        if (change.type === 'remove') return `删除岗位「${name}」`;
        if (change.type === 'update') return `调整岗位「${name}」需求`;
      }
      if (change.entityType === 'timeSlot') {
        const data = (change.oldValue || change.newValue) as Record<string, unknown>;
        const label = (data?.label as string) || '时段';
        if (change.type === 'add') return `新增时段「${label}」`;
        if (change.type === 'remove') return `删除时段「${label}」`;
        if (change.type === 'update') return `调整时段「${label}」时间`;
      }
    } catch {
      /* ignore */
    }
    return `${getChangeLabel(change.type)} ${formatEntityType(change.entityType)}`;
  };

  const renderChanges = (changes: unknown[]) => {
    if (!changes || changes.length === 0) {
      return (
        <p className="text-sm text-slate-400 py-4 text-center italic">
          暂无变更记录
        </p>
      );
    }
    const list = changes as Array<{
      type: string;
      entityType: string;
      timestamp: string;
      newValue?: unknown;
      oldValue?: unknown;
    }>;
    return (
      <div className="space-y-2">
        {list.slice(0, 10).map((change, cIdx) => (
          <div
            key={cIdx}
            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
          >
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded border ${getChangeColor(
                change.type
              )}`}
            >
              {getChangeLabel(change.type)}
            </span>
            <span className="text-xs text-slate-400 border-r border-slate-100 pr-3">
              {formatEntityType(change.entityType)}
            </span>
            <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">
              {describeChange(change)}
            </span>
            <span className="text-xs text-slate-400 flex-shrink-0">
              {new Date(change.timestamp).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          </div>
        ))}
        {list.length > 10 && (
          <p className="text-sm text-slate-400 text-center py-2">
            还有 {list.length - 10} 条变更...
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">历史记录</h1>
          <p className="text-sm text-slate-500 mt-1">
            查看排班版本历史和换班记录 · 每次修正都会生成审计轨迹
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="版本名称..."
            value={newVersionName}
            onChange={(e) => setNewVersionName(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            onClick={handleCreateVersion}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
          >
            <Save className="w-4 h-4" />
            保存版本
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {versions.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">暂无版本，先进行排班操作或手动保存一个版本</p>
          </div>
        )}

        {versions.map((version, idx) => {
          const isAutoWorking = version.id.startsWith('ver-working');
          const isCurrentSnapshot = idx === 0 && !isAutoWorking;
          return (
            <div
              key={version.id}
              className={`rounded-2xl border shadow-sm overflow-hidden transition-colors ${
                isAutoWorking
                  ? 'bg-gradient-to-br from-indigo-50 to-white border-indigo-100'
                  : 'bg-white border-slate-100'
              }`}
            >
              <div className="p-6 border-b border-slate-100/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isAutoWorking
                          ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white'
                          : 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
                      }`}
                    >
                      {isAutoWorking ? (
                        <Activity className="w-6 h-6" />
                      ) : (
                        <GitCompare className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-800">
                          {isAutoWorking ? '工作区 · 实时审计' : version.name}
                        </h3>
                        {isAutoWorking && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            实时同步
                          </span>
                        )}
                        {isCurrentSnapshot && !isAutoWorking && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                            当前版本
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(version.timestamp).toLocaleString('zh-CN')}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {version.createdBy}
                        </div>
                        <div>
                          {isAutoWorking
                            ? `${version.changes.length} 条审计记录`
                            : `${version.snapshot.entries.length} 条排班 · ${version.changes.length} 条变更`}
                        </div>
                      </div>
                    </div>
                  </div>
                  {!isAutoWorking && (
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">
                      对比差异
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 bg-slate-50/60">
                <p className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  {isAutoWorking ? '操作审计轨迹' : '版本变更记录'}
                </p>
                {renderChanges(version.changes)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
