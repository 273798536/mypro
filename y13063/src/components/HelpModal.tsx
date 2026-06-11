import { X, PlayCircle, RotateCcw, Table2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function HelpModal() {
  const setShowHelp = useAppStore((s) => s.setShowHelp);
  const resetAll = useAppStore((s) => s.resetAll);
  const _setActiveDetailTab = useAppStore((s) => s.setActiveDetailTab);

  function handleGoSample() {
    resetAll();
    setShowHelp(false);
  }

  function handleGoCsv() {
    _setActiveDetailTab('csv');
    setShowHelp(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/50 backdrop-blur-sm p-4"
      onClick={() => setShowHelp(false)}
    >
      <div
        className="bg-white rounded-sm shadow-xl max-w-md w-full overflow-hidden fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-brand-600 text-white px-5 py-3 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold">快速上手</h2>
          <button
            className="text-white/80 hover:text-white"
            onClick={() => setShowHelp(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <ol className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center shrink-0 text-sm">
                1
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-brand-800 font-medium mb-0.5">
                  <PlayCircle className="w-4 h-4 text-brand-600" />
                  放样例
                </div>
                <p className="text-sm text-brand-600">
                  一键载入内置示例数据，包含 15 个监测点位和 4 类异常标记。
                </p>
                <button
                  onClick={handleGoSample}
                  className="mt-2 text-xs text-brand-600 hover:text-brand-800 underline underline-offset-2"
                >
                  现在就试试 →
                </button>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center shrink-0 text-sm">
                2
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-brand-800 font-medium mb-0.5">
                  <RotateCcw className="w-4 h-4 text-brand-600" />
                  重跑
                </div>
                <p className="text-sm text-brand-600">
                  清除当前筛选和选中状态，重新从完整材料开始复核。
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center shrink-0 text-sm">
                3
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-brand-800 font-medium mb-0.5">
                  <Table2 className="w-4 h-4 text-brand-600" />
                  查看 CSV 明细
                </div>
                <p className="text-sm text-brand-600">
                  右侧切换到「CSV 明细」，异常行高亮显示，可一键导出带标记的 CSV。
                </p>
                <button
                  onClick={handleGoCsv}
                  className="mt-2 text-xs text-brand-600 hover:text-brand-800 underline underline-offset-2"
                >
                  打开 CSV 明细 →
                </button>
              </div>
            </li>
          </ol>

          <div className="pt-3 border-t border-brand-100">
            <div className="text-xs font-semibold text-accent-rust mb-2">
              🔴 坏材料来了先看这里
            </div>
            <ul className="text-xs text-brand-700 space-y-1">
              <li>• 左侧筛选优先勾选「异常类型」，缩小复核范围</li>
              <li>• 剖面图中橙色呼吸闪烁的点位就是异常，点进去看新旧坐标对比</li>
              <li>• 相邻合错会用红色虚线圆圈出两个挨在一起的点位</li>
              <li>• 导出的 CSV 里「异常标记」列会把所有问题写清楚</li>
            </ul>
          </div>
        </div>

        <div className="px-5 py-3 bg-brand-50/60 border-t border-brand-100 flex justify-end">
          <button className="btn-primary" onClick={() => setShowHelp(false)}>
            知道了，开始复核
          </button>
        </div>
      </div>
    </div>
  );
}
