import { useMemo } from 'react';
import { Filter, AlertTriangle, Lightbulb } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { exceptionStatusLabels } from '@/utils/format';
import ExceptionBoard from '@/components/ExceptionBoard';

export default function Queue() {
  const exceptions = useAppStore((s) => s.exceptions);
  const viewMode = useAppStore((s) => s.viewMode);

  const stats = useMemo(() => {
    const resolved = exceptions.filter((e) => e.status === 'resolved').length;
    const pending = exceptions.filter((e) => e.status === 'pending_material').length;
    const overruled = exceptions.filter((e) => e.status === 'manual_overrule').length;
    return { total: exceptions.length, resolved, pending, overruled };
  }, [exceptions]);

  // 设备工程师视角：精简版
  if (viewMode === 'engineer') {
    return (
      <div className="p-6 h-full flex flex-col">
        {/* 顶部 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">异常队列</h2>
            <p className="text-sm text-slate-400 mt-0.5">快速查看哪些需要处理</p>
          </div>
        </div>

        {/* 重点提示：待补材料 */}
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-amber-300">
                有 {stats.pending} 项待补材料
              </div>
              <div className="text-xs text-amber-200/70 mt-0.5">
                这些是需要你核实补充的记录，处理完可以标记为已处理
              </div>
            </div>
          </div>
        </div>

        {/* 三栏看板 */}
        <div className="flex-1 min-h-0">
          <ExceptionBoard />
        </div>

        {/* 操作提示 */}
        <div className="mt-4 p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
          <div className="flex items-start gap-2.5">
            <Lightbulb size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-400">
              <div className="text-slate-300 font-medium mb-1">老何操作指南</div>
              <ol className="space-y-0.5 list-decimal list-inside">
                <li>先看「待补材料」栏，这些是需要你处理的</li>
                <li>处理完的移到「已处理」，需要确认的移到「人工改判」</li>
                <li>鼠标悬停卡片右上角有快捷移动按钮</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 项目经理视角：完整版
  return (
    <div className="p-6 h-full flex flex-col">
      {/* 顶部标题区 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">异常队列</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            三栏分类管理：已处理 / 待补材料 / 人工改判
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Filter size={14} />
            <span>共 {stats.total} 项异常</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              已处理 {stats.resolved}
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              待补材料 {stats.pending}
            </span>
            <span className="flex items-center gap-1.5 text-purple-400">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              人工改判 {stats.overruled}
            </span>
          </div>
        </div>
      </div>

      {/* 安全阈值提示 */}
      <div className="mb-4 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
        <div className="flex items-center gap-2.5">
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300">
            涉及安全阈值变动的异常已单独标记，请注意审核
          </span>
        </div>
      </div>

      {/* 三栏看板 */}
      <div className="flex-1 min-h-0">
        <ExceptionBoard />
      </div>

      {/* 底部说明 */}
      <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
        <span>悬停卡片可快速移动状态</span>
        <span>异常队列与场景标注、侧边说明数据口径一致</span>
      </div>
    </div>
  );
}
