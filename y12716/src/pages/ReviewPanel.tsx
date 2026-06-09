import { useEffect, useMemo, useState } from 'react';
import { Copy, Play, Save, Trash2, AlertTriangle } from 'lucide-react';
import { SliderControl } from '@/components/SliderControl';
import { DiffCompareTable } from '@/components/DiffCompareTable';
import { FormulaCard } from '@/components/FormulaCard';
import { useAppStore } from '@/store/useAppStore';
import { useScheduleCalculator } from '@/hooks/useScheduleCalculator';

export default function ReviewPanel() {
  const {
    config,
    schedules,
    baselineSchedules,
    runCalculation,
    captureBaseline,
    clearBaseline,
    questions,
  } = useAppStore();
  const { previewWithConfig } = useScheduleCalculator();
  const [livePreview, setLivePreview] = useState(false);

  useEffect(() => {
    if (livePreview && questions.length > 0) {
      runCalculation();
    }
  }, [config, livePreview, questions.length, runCalculation]);

  const changedCount = useMemo(() => {
    if (!baselineSchedules || baselineSchedules.length === 0) return 0;
    const baseMap = new Map(baselineSchedules.map((s) => [s.questionId, s]));
    let count = 0;
    for (const s of schedules) {
      const b = baseMap.get(s.questionId);
      if (!b || b.rank !== s.rank || b.batch !== s.batch) count++;
    }
    return count;
  }, [schedules, baselineSchedules]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-[#2a4a73] bg-[#0f2138] p-4 text-white lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#d4a24c]" />
              <h3 className="font-serif text-sm font-semibold">复核工作流</h3>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={livePreview}
                onChange={(e) => setLivePreview(e.target.checked)}
                className="accent-[#d4a24c]"
              />
              参数调整时实时预览
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <button
              onClick={captureBaseline}
              className="flex items-center justify-center gap-2 rounded-md border border-[#4a8ec2]/40 bg-[#4a8ec2]/10 px-4 py-2.5 text-sm text-[#8ab8e0] transition-all hover:bg-[#4a8ec2]/20"
            >
              <Save className="h-4 w-4" />
              {baselineSchedules ? '重新捕获基准排期' : '捕获当前为基准排期'}
            </button>
            <button
              onClick={runCalculation}
              disabled={!livePreview && false}
              className="flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#d4a24c] to-[#b8873a] px-4 py-2.5 text-sm font-semibold text-[#0a1828] shadow transition-all hover:shadow-lg"
            >
              <Play className="h-4 w-4" />
              按当前参数计算排期
            </button>
            <button
              onClick={clearBaseline}
              disabled={!baselineSchedules}
              className="flex items-center justify-center gap-2 rounded-md border border-[#c85353]/30 bg-[#c85353]/5 px-4 py-2.5 text-sm text-[#e99090] transition-all hover:bg-[#c85353]/15 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
              清除基准
            </button>
          </div>

          <div className="mt-4 rounded-md border border-[#2a4a73] bg-[#12283f] px-4 py-3">
            <div className="mb-2 text-[11px] text-gray-500">
              工作流说明
            </div>
            <ol className="space-y-1 text-xs text-gray-300 list-decimal list-inside">
              <li>先用默认参数点击「捕获当前为基准排期」保存一份 baseline</li>
              <li>在右侧面板调整误差参数（权重、批次大小等）</li>
              <li>点击「按当前参数计算排期」生成新排期</li>
              <li>下方对比表会自动高亮位次/批次发生变化的题目</li>
              <li>若同分排序不稳定，微调 w₂（错题率权重）±0.01 即可观察 Q012/Q015 位次反转</li>
            </ol>
          </div>
        </div>

        <div className="rounded-lg border border-[#2a4a73] bg-[#0f2138] p-4 text-white">
          <div className="mb-3 flex items-center gap-2">
            <Copy className="h-4 w-4 text-[#d4a24c]" />
            <h3 className="font-serif text-sm font-semibold">变化统计</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-[11px] text-gray-400">
                <span>已捕获基准</span>
                <span className={`font-mono ${baselineSchedules ? 'text-[#2d936c]' : 'text-gray-500'}`}>
                  {baselineSchedules ? 'YES' : 'NO'}
                </span>
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[11px] text-gray-400">
                <span>参数较默认</span>
                <span className="font-mono text-[#d4a24c]">
                  {Math.abs(config.difficultyWeight - 0.35) > 0.001 ||
                  Math.abs(config.errorRateWeight - 0.3) > 0.001 ||
                  Math.abs(config.dependencyPenaltyWeight - 0.2) > 0.001 ||
                  Math.abs(config.chapterOrderWeight - 0.15) > 0.001 ||
                  config.batchSize !== 5 ||
                  config.daysPerBatch !== 3
                    ? '已调整'
                    : '未调整'}
                </span>
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[11px] text-gray-400">
                <span>排期变化题数</span>
                <span className={`font-mono ${changedCount > 0 ? 'text-[#4a8ec2]' : 'text-gray-500'}`}>
                  {changedCount}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#1e3a5f]">
                <div
                  className="h-full rounded-full bg-[#4a8ec2] transition-all"
                  style={{
                    width: `${questions.length ? (changedCount / questions.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <DiffCompareTable />
        </div>
        <div className="space-y-6">
          <SliderControl />
          <FormulaCard />
        </div>
      </div>
    </div>
  );
}
