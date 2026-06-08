import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronRight,
  Home,
  Settings,
  MapPin,
  FileCheck,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Trash2,
  Edit3,
  GitCompare,
  ExternalLink,
  Clock,
  User,
  Hash,
  Inbox,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInspectionStore } from '@/store/inspectionStore';
import type { ChangeHistory, HistoryAction, HistoryTargetType } from '@shared/types';

const actionConfig: Record<
  HistoryAction,
  { label: string; icon: typeof Settings; dotClass: string }
> = {
  param_update: { label: '参数更新', icon: Settings, dotClass: 'bg-brand' },
  point_add: { label: '新增测点', icon: Plus, dotClass: 'bg-success' },
  point_delete: { label: '删除测点', icon: Trash2, dotClass: 'bg-alert' },
  point_revise: { label: '测点修正', icon: Edit3, dotClass: 'bg-brand' },
  conclusion_change: { label: '结论变更', icon: FileCheck, dotClass: 'bg-brand' },
  review_pass: { label: '复核通过', icon: ThumbsUp, dotClass: 'bg-success' },
  review_reject: { label: '驳回修改', icon: ThumbsDown, dotClass: 'bg-alert' },
};

const targetTypeLabels: Record<HistoryTargetType, string> = {
  params: '参数设置',
  measure_point: '测量点',
  conclusion: '结论',
};

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function InspectionHistory() {
  const { id } = useParams<{ id: string }>();
  const { history, currentDetail, fetchHistory, loading } = useInspectionStore();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (id) {
      fetchHistory(id);
    }
  }, [id, fetchHistory]);

  useEffect(() => {
    if (history.length > 0 && !selectedId) {
      setSelectedId(history[0].id);
    }
  }, [history, selectedId]);

  const projectName = currentDetail.inspection?.projectName || '检查记录';
  const selected = history.find((h) => h.id === selectedId);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-sm text-slate">
          <Link to="/inspections" className="hover:text-brand transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            检查记录
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to={`/inspections/${id}`} className="hover:text-brand transition-colors">
            {projectName}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-graphite font-medium">历史追溯</span>
        </div>
        <div className="card p-5 flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3 text-slate">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
            <span className="text-sm">加载历史记录中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-sm text-slate">
          <Link to="/inspections" className="hover:text-brand transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            检查记录
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to={`/inspections/${id}`} className="hover:text-brand transition-colors">
            {projectName}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-graphite font-medium">历史追溯</span>
        </div>
        <div className="card p-5">
          <h1 className="font-display text-xl font-bold text-graphite px-4 pt-3 pb-1">历史追溯</h1>
          <p className="text-sm text-slate px-4 pb-3">查看所有变更记录，点击节点查看详情</p>
        </div>
        <div className="card p-5 flex flex-col items-center justify-center min-h-[400px] text-center">
          <Inbox className="w-12 h-12 text-slate/30 mb-3" />
          <h3 className="font-display font-semibold text-graphite mb-1">暂无历史记录</h3>
          <p className="text-sm text-slate">该检查记录还没有任何变更操作</p>
        </div>
      </div>
    );
  }

  const actionInfo = selected ? actionConfig[selected.action] : null;

  const diffEntries = selected
    ? Object.keys({ ...selected.beforeValue, ...selected.afterValue })
        .filter((key) => key !== 'id' && key !== 'updatedAt')
        .map((key) => ({
          key,
          before: (selected.beforeValue as Record<string, unknown>)[key],
          after: (selected.afterValue as Record<string, unknown>)[key],
        }))
        .filter((e) => JSON.stringify(e.before) !== JSON.stringify(e.after))
    : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-slate">
        <Link to="/inspections" className="hover:text-brand transition-colors flex items-center gap-1">
          <Home className="w-3.5 h-3.5" />
          检查记录
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/inspections/${id}`} className="hover:text-brand transition-colors">
          {projectName}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-graphite font-medium">历史追溯</span>
      </div>

      <div className="card p-1">
        <h1 className="font-display text-xl font-bold text-graphite px-4 pt-3 pb-1">历史追溯</h1>
        <p className="text-sm text-slate px-4 pb-3">查看所有变更记录，点击节点查看详情</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 min-h-[600px]">
        <div className="lg:col-span-2 card p-5 overflow-y-auto scrollbar-thin max-h-[calc(100vh-16rem)]">
          <div className="relative">
            <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-slate/20" />

            <div className="space-y-1">
              {history.map((item) => {
                const info = actionConfig[item.action];
                const Icon = info.icon;
                const isSelected = selectedId === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      'relative w-full text-left pl-12 pr-3 py-3 rounded-sm-2 transition-all',
                      isSelected
                        ? 'bg-brand-50 border border-brand-200'
                        : 'hover:bg-slate/50 border border-transparent'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute left-2 top-3.5 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-md',
                        info.dotClass,
                        isSelected && 'ring-2 ring-brand ring-offset-2'
                      )}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-graphite">{info.label}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate/10 rounded text-slate font-mono">
                            {targetTypeLabels[item.targetType]}
                          </span>
                        </div>
                        <p className="text-xs text-slate mt-0.5 line-clamp-2">{item.reason}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate/70">
                          <span className="flex items-center gap-0.5">
                            <User className="w-3 h-3" />
                            {item.operator}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(item.createdAt)}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <ChevronRight className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-5">
          {selected && actionInfo ? (
            <>
              <div className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const ActionIcon = actionInfo.icon;
                      return (
                        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', actionInfo.dotClass)}>
                          <ActionIcon className="w-5 h-5 text-white" />
                        </div>
                      );
                    })()}
                    <div>
                      <h3 className="font-display text-lg font-semibold text-graphite">
                        {actionInfo.label}
                      </h3>
                      <p className="text-sm text-slate">
                        {targetTypeLabels[selected.targetType]}
                      </p>
                    </div>
                  </div>
                  <Hash className="w-4 h-4 text-slate" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-y border-slate/10">
                  <div>
                    <div className="text-xs text-slate mb-1 flex items-center gap-1">
                      <User className="w-3 h-3" /> 操作人
                    </div>
                    <div className="text-sm font-medium text-graphite">{selected.operator}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 操作时间
                    </div>
                    <div className="text-sm font-medium text-graphite">{formatDateTime(selected.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate mb-1 flex items-center gap-1">
                      <Hash className="w-3 h-3" /> 批次号
                    </div>
                    <div className="text-sm font-mono text-brand">{selected.batchId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate mb-1">变更原因</div>
                    <div className="text-sm text-graphite">{selected.reason}</div>
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <h4 className="font-display text-base font-semibold text-graphite mb-4 flex items-center gap-2">
                  <GitCompare className="w-4 h-4 text-brand" />
                  变更内容对比
                </h4>

                {diffEntries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="table-th">字段</th>
                          <th className="table-th">变更前</th>
                          <th className="table-th">变更后</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diffEntries.map((entry) => {
                          const hasDiff = JSON.stringify(entry.before) !== JSON.stringify(entry.after);
                          return (
                            <tr key={entry.key}>
                              <td className="table-td font-medium text-slate">{entry.key}</td>
                              <td
                                className={cn(
                                  'table-td font-mono text-sm',
                                  hasDiff && entry.before !== undefined ? 'text-alert line-through' : ''
                                )}
                              >
                                {entry.before !== undefined ? String(entry.before) : (
                                  <span className="text-slate/40">—</span>
                                )}
                              </td>
                              <td
                                className={cn(
                                  'table-td font-mono text-sm',
                                  hasDiff ? 'text-success font-semibold' : ''
                                )}
                              >
                                {entry.after !== undefined ? String(entry.after) : (
                                  <span className="text-slate/40">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate text-sm">
                    暂无字段级变更详情
                  </div>
                )}
              </div>

              {selected.targetType === 'measure_point' && (
                <div className="card p-5">
                  <h4 className="font-display text-base font-semibold text-graphite mb-3">关联信息</h4>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      to={`/inspections/${id}`}
                      className="btn-secondary text-sm"
                    >
                      <MapPin className="w-4 h-4" />
                      查看关联测量点
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-slate px-3 py-2 bg-slate/5 rounded-sm-2">
                      <FileCheck className="w-4 h-4 text-brand" />
                      <span>处理意见: 已记录</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card p-5 flex items-center justify-center min-h-[400px]">
              <div className="text-center text-slate">
                <Inbox className="w-10 h-10 text-slate/30 mx-auto mb-2" />
                <p className="text-sm">请选择左侧记录查看详情</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
