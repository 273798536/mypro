import { useMemo } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Clock, FileWarning } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getAttributionStats, exceptionStatusLabels, exceptionStatusColors, formatDate } from '@/utils/format';
import TrendChart from '@/components/TrendChart';
import AttributionCard from '@/components/AttributionCard';
import JumpModal from '@/components/JumpModal';
import type { SpeckleRecord, ExceptionStatus } from '@/types';

export default function Dashboard() {
  const records = useAppStore((s) => s.records);
  const exceptions = useAppStore((s) => s.exceptions);
  const viewMode = useAppStore((s) => s.viewMode);
  const openJumpModal = useAppStore((s) => s.openJumpModal);
  const currentScene = useAppStore((s) => s.currentScene);

  const attribution = useMemo(() => getAttributionStats(records), [records]);

  const exceptionCounts = useMemo(() => {
    const counts: Record<ExceptionStatus, number> = {
      resolved: 0,
      pending_material: 0,
      manual_overrule: 0,
    };
    exceptions.forEach((e) => {
      counts[e.status]++;
    });
    return counts;
  }, [exceptions]);

  const jumpRecords = useMemo(
    () => records.filter((r) => r.isJumpPoint),
    [records]
  );

  const handleJumpClick = (record: SpeckleRecord) => {
    openJumpModal(record);
  };

  // 设备工程师视角：精简版
  if (viewMode === 'engineer') {
    return (
      <div className="p-6 space-y-5">
        {/* 顶部标题区 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">设备工程师总览</h2>
            <p className="text-sm text-slate-400 mt-0.5">快速定位异常、查看样例、导出结果</p>
          </div>
        </div>

        {/* 三卡片：异常在哪 / 样例在哪 / 怎么导出 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5 hover:border-red-500/50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                <AlertTriangle size={22} />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400 font-mono">
                  {exceptions.length}
                </div>
                <div className="text-xs text-slate-400">待关注异常</div>
              </div>
            </div>
            <div className="text-sm text-slate-300 mb-2">
              异常在哪里？
            </div>
            <div className="text-xs text-slate-500">
              跳变点 {jumpRecords.length} 处 · 待补材料 {exceptionCounts.pending_material} 项
            </div>
            <button className="mt-3 w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded border border-red-500/30 transition-colors">
              查看异常列表
            </button>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5 hover:border-emerald-500/50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle size={22} />
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-400 font-mono">
                  {records.filter((r) => r.type === 'normal').length}
                </div>
                <div className="text-xs text-slate-400">条正常记录</div>
              </div>
            </div>
            <div className="text-sm text-slate-300 mb-2">
              样例在哪里？
            </div>
            <div className="text-xs text-slate-500">
              典型正常样例 · 可对比参考
            </div>
            <button className="mt-3 w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs rounded border border-emerald-500/30 transition-colors">
              查看典型样例
            </button>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5 hover:border-cyan-500/50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <TrendingUp size={22} />
              </div>
              <div>
                <div className="text-2xl font-bold text-cyan-400 font-mono">
                  一键
                </div>
                <div className="text-xs text-slate-400">导出报告</div>
              </div>
            </div>
            <div className="text-sm text-slate-300 mb-2">
              结果怎么导出？
            </div>
            <div className="text-xs text-slate-500">
              右上角「导出报告」按钮 · HTML 格式
            </div>
            <button className="mt-3 w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs rounded border border-cyan-500/30 transition-colors">
              立即导出
            </button>
          </div>
        </div>

        {/* 趋势图（精简） */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-200">误差趋势</h3>
            <span className="text-xs text-slate-500">
              {formatDate(currentScene.dateRange[0])} - {formatDate(currentScene.dateRange[1])}
            </span>
          </div>
          <div className="h-64">
            <TrendChart onJumpClick={handleJumpClick} />
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            红点为跳变点，点击查看原因
          </div>
        </div>

        {/* 快速提示 */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileWarning className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-amber-200/90">
              <div className="font-medium mb-1">老何接班提示</div>
              <div className="text-xs text-amber-200/70 leading-relaxed">
                1. 先看异常卡片找问题 → 2. 再看样例卡片做对比 → 3. 最后导出报告交班。
                不用读大段说明，三个卡片三秒上手。
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 项目经理视角：完整版
  return (
    <div className="p-6 space-y-5">
      {/* 顶部标题区 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">总览看板</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {currentScene.description}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-slate-400">
            数据范围：
            <span className="text-slate-200 ml-1">
              {formatDate(currentScene.dateRange[0])} - {formatDate(currentScene.dateRange[1])}
            </span>
          </div>
        </div>
      </div>

      {/* 趋势图 */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-200">误差趋势图</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-cyan-500" />
              <span className="text-slate-400">误差值</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-red-500 border-dashed" style={{ borderStyle: 'dashed' }} />
              <span className="text-slate-400">安全阈值</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-slate-400">跳变点</span>
            </div>
          </div>
        </div>
        <div className="h-72">
          <TrendChart onJumpClick={handleJumpClick} />
        </div>
      </div>

      {/* 归因分类 & 异常概览 */}
      <div className="grid grid-cols-3 gap-5">
        {/* 归因分类 */}
        <div className="col-span-2 space-y-4">
          <h3 className="text-sm font-medium text-slate-200">归因分类占比</h3>
          <div className="grid grid-cols-3 gap-3">
            <AttributionCard
              type="old_note"
              count={records.filter((r) => r.type === 'old_note').length}
              percentage={attribution.percentages.old_note}
              weight={attribution.byType.old_note}
            />
            <AttributionCard
              type="normal"
              count={records.filter((r) => r.type === 'normal').length}
              percentage={attribution.percentages.normal}
              weight={attribution.byType.normal}
            />
            <AttributionCard
              type="verbal"
              count={records.filter((r) => r.type === 'verbal').length}
              percentage={attribution.percentages.verbal}
              weight={attribution.byType.verbal}
            />
          </div>
          <p className="text-xs text-slate-500">
            * 基于影响权重计算占比，维修备注旧版和口头备注可信度较低
          </p>
        </div>

        {/* 异常概览 */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-200">异常概览</h3>
          <div className="space-y-2">
            {(['pending_material', 'manual_overrule', 'resolved'] as ExceptionStatus[]).map(
              (status) => (
                <div
                  key={status}
                  className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full ${exceptionStatusColors[status]}`}
                    />
                    <span className="text-sm text-slate-300">
                      {exceptionStatusLabels[status]}
                    </span>
                  </div>
                  <span
                    className={`text-lg font-bold font-mono ${
                      status === 'resolved' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {exceptionCounts[status]}
                  </span>
                </div>
              )
            )}
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">总计</span>
            <span className="text-base font-bold text-slate-200 font-mono">
              {exceptions.length}
            </span>
          </div>
        </div>
      </div>

      {/* 跳变点快速预览 */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-200">跳变点速览</h3>
          <span className="text-xs text-red-400">{jumpRecords.length} 处跳变</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {jumpRecords.map((record) => (
            <button
              key={record.id}
              onClick={() => handleJumpClick(record)}
              className="text-left p-3 bg-red-500/5 border border-red-500/20 rounded-lg hover:bg-red-500/10 hover:border-red-500/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">{formatDate(record.date)}</span>
                <span className="text-xs text-red-400 font-medium">跳变</span>
              </div>
              <div className="text-lg font-bold text-red-400 font-mono mb-1">
                {record.value}
                {record.unitChanged && record.unitAfter === 'nm' ? ' nm' : ' μm'}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {record.content.slice(0, 20)}...
              </div>
            </button>
          ))}
        </div>
      </div>

      <JumpModal />
    </div>
  );
}
