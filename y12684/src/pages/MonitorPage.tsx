import { useState } from 'react';
import { useAppStore } from '../store';
import { exceptionTypeLabels, formatDateTime, paramRanges } from '../utils/constants';
import type { ExceptionType } from '../types';

export default function MonitorPage() {
  const exceptions = useAppStore((s) => s.exceptions);
  const selectedException = useAppStore((s) => s.selectedException);
  const selectException = useAppStore((s) => s.selectException);
  const resolveException = useAppStore((s) => s.resolveException);
  const resetCamera = useAppStore((s) => s.resetCamera);

  const [filter, setFilter] = useState<ExceptionType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  const filtered = exceptions.filter((e) => {
    if (filter !== 'all' && e.type !== filter) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    return true;
  });

  const selected = exceptions.find((e) => e.id === selectedException);

  const pendingByType: Record<string, number> = {};
  exceptions
    .filter((e) => e.status !== 'resolved')
    .forEach((e) => {
      pendingByType[e.type] = (pendingByType[e.type] ?? 0);
      pendingByType[e.type] += 1;
    });

  const getNextStepText = (type: ExceptionType): string => {
    switch (type) {
      case 'param_missing':
        return '下一步建议：请前往【参数配置】→【测量记录管理】，补录对应参数的实测数据；数据到位后，参数联动会自动更新，无需手动干预。';
      case 'param_exceed':
        return '下一步建议：请前往【参数配置】，调整超出范围的参数数值至建议区间（修改口径）；如该值确为实测，请在测量备注中记录原因，并评估对模拟结果的影响。';
      case 'camera_lost':
        return '下一步建议：直接点击下方"恢复默认视角"按钮，或在三维演示页左上角选择预设视角。视角恢复后，模拟可继续运行，已记录的异常可手动标记为已解决。';
      case 'calc_error':
        return '下一步建议：先检查参数配置是否存在不合理组合，然后在三维演示页停止并重新启动模拟；如持续报错，可在操作日志中查看详细上下文。';
      case 'export_fail':
        return '下一步建议：检查浏览器磁盘剩余空间和权限，确认浏览器未禁用文件下载功能；如仍失败，可尝试切换导出为其他格式。';
    }
  };

  const summaryItems: Array<{ type: ExceptionType; label: string; count: number; meta: (typeof exceptionTypeLabels)[string] }> = (
  Object.keys(exceptionTypeLabels) as ExceptionType[]
).map((t) => ({
  type: t,
  label: exceptionTypeLabels[t].label,
  count: pendingByType[t] ?? 0,
  meta: exceptionTypeLabels[t]
}));

  return (
    <div className="h-full overflow-hidden flex flex-col bg-sand-50">
      <header className="px-6 pt-6">
        <h1 className="text-2xl font-bold text-sand-800 mb-1">异常监控中心</h1>
        <p className="text-sm text-sand-600 mb-4">
          分类显示所有异常记录。不同于单纯的红色数字，每条异常都附带原因说明、影响范围、下一步操作建议，
          方便规划设计师明确判断是补材料还是改口径。
        </p>

        {/* 异常分类汇总卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {summaryItems.map((item) => (
            <div
              key={item.type}
              onClick={() => setFilter(filter === item.type ? 'all' : item.type)}
              className={`card cursor-pointer transition border-2 ${
                filter === item.type
                  ? 'border-amber'
                  : 'border-transparent hover:border-sand-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className={`badge ${item.meta.color} border`}>{item.label}</span>
                <span
                  className={`text-2xl font-bold ${
                    item.count > 0 ? 'text-red-600' : 'text-sand-400'
                  }`}
                >
                  {item.count}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-sand-500 leading-relaxed">
                {item.count > 0 ? item.meta.action : '暂无待处理'}
              </div>
            </div>
          ))}
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-6 overflow-hidden">
        {/* 左侧：异常列表 */}
        <div className="lg:col-span-2 card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-sand-800">异常记录列表</h2>
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as ExceptionType | 'all')}
                className="input text-sm py-1 px-2"
              >
                <option value="all">全部类型</option>
                {Object.entries(exceptionTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'all' | 'pending' | 'resolved')
                }
                className="input text-sm py-1 px-2"
              >
                <option value="all">全部状态</option>
                <option value="pending">待处理</option>
                <option value="processing">处理中</option>
                <option value="resolved">已解决</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filtered.length === 0 && (
              <div className="text-center py-12 text-sand-400">
                暂无符合条件的异常记录。
              </div>
            )}
            {filtered.map((e) => {
              const meta = exceptionTypeLabels[e.type];
              const isSelected = selectedException === e.id;
              return (
                <div
                  key={e.id}
                  onClick={() => selectException(e.id)}
                  className={`p-3 rounded-md border cursor-pointer transition ${
                    isSelected
                      ? 'border-amber bg-amber-50'
                      : 'border-sand-200 bg-white hover:border-sand-300'
                  } ${e.status === 'resolved' ? 'opacity-60' : ''
                }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`badge ${meta.color} border flex-shrink-0`}>
                        {meta.label}
                      </span>
                      <span className="text-sm font-medium text-sand-800 truncate">{e.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`badge text-[10px] ${
                          e.status === 'resolved'
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : e.status === 'processing'
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-red-50 text-red-700 border border-red-300'
                        } border`}
                      >
                        {e.status === 'resolved'
                          ? '已解决'
                          : e.status === 'processing'
                          ? '处理中'
                          : '待处理'}
                      </span>
                      <span className="text-[11px] text-sand-400 font-mono">
                        {formatDateTime(e.timestamp)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 text-xs text-sand-600 line-clamp-2">
                    {e.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右侧：异常详情 */}
        <div className="card flex flex-col overflow-hidden">
          <h2 className="text-lg font-semibold text-sand-800 mb-3">异常详情</h2>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sand-400 text-sm">
              请从左侧列表选择一条异常记录查看详情。
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 text-sm pr-1">
              <div>
                <div className="text-xs text-sand-500 mb-1">异常类型</div>
                <div className={`inline-block badge ${exceptionTypeLabels[selected.type].color} border`}>
                  {exceptionTypeLabels[selected.type].label}
                </div>
              </div>

              <div>
                <div className="text-xs text-sand-500 mb-1">标题</div>
                <div className="font-medium text-sand-800">{selected.title}</div>
              </div>

              <div>
                <div className="text-xs text-sand-500 mb-1">发生时间</div>
                <div className="font-mono text-sand-700">{formatDateTime(selected.timestamp)}</div>
              </div>

              <div>
                <div className="text-xs text-sand-500 mb-1">详细说明</div>
                <div className="text-sand-700 leading-relaxed bg-sand-50 p-2.5 rounded border border-sand-200">
                  {selected.description}
                </div>
              </div>

              <div>
                <div className="text-xs text-sand-500 mb-1">影响范围</div>
                <div className="text-sand-700 leading-relaxed bg-sand-50 p-2.5 rounded border border-sand-200">
                  {selected.impact}
                </div>
              </div>

              <div>
                <div className="text-xs text-sand-500 mb-1">处理建议</div>
                <div className="text-sand-700 leading-relaxed bg-amber-50 p-2.5 rounded border border-amber-200">
                  {selected.suggestion}
                </div>
              </div>

              {selected.relatedParams && selected.relatedParams.length > 0 && (
                <div>
                  <div className="text-xs text-sand-500 mb-1">关联参数</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.relatedParams.map((p) => {
                      const meta = paramRanges[p];
                      return (
                        <span
                          key={p}
                          className="badge bg-sand-100 text-sand-700 border border-sand-300"
                        >
                          {meta?.label ?? p}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 操作指导区 */}
              <div className="pt-3 border-t border-sand-200">
                <div className="text-xs font-semibold text-sand-600 mb-2">⬇ 操作指导</div>
                <div className="p-3 rounded-md bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 text-sand-800 leading-relaxed">
                  {getNextStepText(selected.type)}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {selected.type === 'camera_lost' && selected.status !== 'resolved' && (
                  <button
                    onClick={() => {
                      resetCamera();
                      resolveException(selected.id);
                    }}
                    className="btn btn-primary w-full"
                  >
                    恢复视角并标记已解决
                  </button>
                )}
                {selected.status !== 'resolved' && (
                  <button
                    onClick={() => resolveException(selected.id)}
                    className="btn btn-secondary w-full"
                  >
                    标记为已解决
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
