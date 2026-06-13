import { useMemo } from 'react';
import { MapPin, AlertCircle, Gauge } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getThresholdChangedRecords } from '@/utils/format';
import RecordList from '@/components/RecordList';
import RecordDetail from '@/components/RecordDetail';
import JumpModal from '@/components/JumpModal';
import type { SpeckleRecord } from '@/types';

export default function Analysis() {
  const records = useAppStore((s) => s.records);
  const currentScene = useAppStore((s) => s.currentScene);
  const viewMode = useAppStore((s) => s.viewMode);
  const openJumpModal = useAppStore((s) => s.openJumpModal);

  const thresholdRecords = useMemo(
    () => getThresholdChangedRecords(records),
    [records]
  );

  const handleRecordSelect = (record: SpeckleRecord) => {
    if (record.isJumpPoint) {
      openJumpModal(record);
    }
  };

  // 设备工程师视角：精简版
  if (viewMode === 'engineer') {
    return (
      <div className="p-6 h-full flex flex-col">
        {/* 顶部 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">归因分析</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              记录溯源 · 快速定位问题
            </p>
          </div>
        </div>

        {/* 场景标注（简化） */}
        <div className="mb-4 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium mb-1">
            <MapPin size={14} />
            当前场景：{currentScene.title}
          </div>
          <p className="text-xs text-slate-400">{currentScene.description}</p>
        </div>

        {/* 阈值变动提示 */}
        {thresholdRecords.length > 0 && (
          <div className="mb-4 p-3 bg-orange-500/5 border border-orange-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-orange-400 text-sm font-medium mb-2">
              <Gauge size={14} />
              有 {thresholdRecords.length} 条记录涉及阈值变动
            </div>
            <p className="text-xs text-slate-400">
              安全阈值被改动过的记录已单独标出，注意区分新旧标准
            </p>
          </div>
        )}

        {/* 左右两栏 */}
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          <RecordList onSelect={handleRecordSelect} />
          <RecordDetail />
        </div>

        {/* 底部提示 */}
        <div className="mt-4 text-xs text-slate-500 flex items-center gap-2">
          <AlertCircle size={12} />
          <span>场景标注、侧边说明、异常队列使用同一套数据源，口径一致</span>
        </div>

        <JumpModal />
      </div>
    );
  }

  // 项目经理视角：完整版
  return (
    <div className="p-6 h-full flex flex-col">
      {/* 顶部标题区 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">归因分析</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            逐条溯源，分清谁影响了结论
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="text-slate-400">
            共 <span className="text-slate-200 font-medium">{records.length}</span> 条记录
          </div>
        </div>
      </div>

      {/* 场景标注区 */}
      <div className="mb-4 p-4 bg-gradient-to-r from-cyan-500/10 to-transparent border border-cyan-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 flex-shrink-0">
            <MapPin size={18} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-cyan-300 mb-1">
              场景标注：{currentScene.title}
            </h3>
            <p className="text-sm text-slate-300">{currentScene.description}</p>
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
              <span>
                时间范围：{currentScene.dateRange[0]} ~ {currentScene.dateRange[1]}
              </span>
              <span>涉及记录：{currentScene.records.length} 条</span>
            </div>
          </div>
        </div>
      </div>

      {/* 阈值变动警告 */}
      {thresholdRecords.length > 0 && (
        <div className="mb-4 p-4 bg-red-500/5 border border-red-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 flex-shrink-0">
              <Gauge size={18} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-300 mb-1">
                安全阈值变动记录（单独拎出）
              </h3>
              <p className="text-sm text-slate-400 mb-2">
                共 {thresholdRecords.length} 条记录涉及安全阈值修改，这些记录可能会影响结论判定，需特别注意
              </p>
              <div className="flex flex-wrap gap-2">
                {thresholdRecords.map((r) => (
                  <span
                    key={r.id}
                    className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded border border-red-500/20 font-mono"
                  >
                    {r.date}：{r.thresholdBefore} → {r.thresholdAfter} μm
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 主内容区：左侧列表 + 右侧详情 */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        <RecordList onSelect={handleRecordSelect} />
        <RecordDetail />
      </div>

      {/* 底部说明 */}
      <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-500 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          维修备注旧版权重低
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          正常记录可信度高
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          口头备注需核实
        </div>
        <div className="ml-auto">
          * 场景标注、侧边说明、异常队列数据口径一致
        </div>
      </div>

      <JumpModal />
    </div>
  );
}
