import { X, AlertTriangle, Gauge, Ruler, FileText } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatDate, jumpReasonLabels, recordTypeLabels } from '@/utils/format';

export default function JumpModal() {
  const showJumpModal = useAppStore((s) => s.showJumpModal);
  const selectedJumpRecord = useAppStore((s) => s.selectedJumpRecord);
  const closeJumpModal = useAppStore((s) => s.closeJumpModal);

  if (!showJumpModal || !selectedJumpRecord) return null;

  const reason = selectedJumpRecord.jumpReason;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeJumpModal}
      />

      {/* 弹窗内容 */}
      <div className="relative w-[560px] max-w-[90vw] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-red-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                跳变点分析
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatDate(selectedJumpRecord.date)} · {recordTypeLabels[selectedJumpRecord.type]}
              </p>
            </div>
          </div>
          <button
            onClick={closeJumpModal}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-5 space-y-5">
          {/* 数值展示 */}
          <div className="text-center py-4 bg-slate-950/50 rounded-lg border border-slate-800">
            <div className="text-4xl font-bold text-red-400 font-mono mb-1">
              {selectedJumpRecord.value}
              <span className="text-lg text-slate-500 ml-1">
                {selectedJumpRecord.unitChanged && selectedJumpRecord.unitAfter === 'nm'
                  ? ' nm'
                  : ' μm'}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              偏离正常范围约 {(selectedJumpRecord.value / 3.5 * 100 - 100).toFixed(0)}%
            </div>
          </div>

          {/* 跳变原因拆解 */}
          <div>
            <h4 className="text-sm font-medium text-slate-200 mb-3">原因拆解</h4>
            <div className="space-y-2">
              {/* 阈值变动 */}
              <div
                className={`p-3 rounded-lg border transition-all ${
                  reason === 'threshold'
                    ? 'bg-red-500/10 border-red-500/40'
                    : 'bg-slate-950/30 border-slate-800 opacity-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Gauge
                    size={16}
                    className={reason === 'threshold' ? 'text-red-400' : 'text-slate-500'}
                  />
                  <span
                    className={`text-sm font-medium ${
                      reason === 'threshold' ? 'text-red-300' : 'text-slate-500'
                    }`}
                  >
                    阈值变动
                  </span>
                  {reason === 'threshold' && (
                    <span className="ml-auto text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                      主要原因
                    </span>
                  )}
                </div>
                {reason === 'threshold' && selectedJumpRecord.isThresholdChanged && (
                  <div className="mt-2 text-xs text-slate-400 pl-7">
                    阈值从{' '}
                    <span className="text-slate-300 font-mono">
                      {selectedJumpRecord.thresholdBefore} μm
                    </span>{' '}
                    调整为{' '}
                    <span className="text-red-400 font-mono">
                      {selectedJumpRecord.thresholdAfter} μm
                    </span>
                    ，导致该记录在旧标准下判定为异常
                  </div>
                )}
              </div>

              {/* 单位变化 */}
              <div
                className={`p-3 rounded-lg border transition-all ${
                  reason === 'unit'
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : 'bg-slate-950/30 border-slate-800 opacity-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Ruler
                    size={16}
                    className={reason === 'unit' ? 'text-amber-400' : 'text-slate-500'}
                  />
                  <span
                    className={`text-sm font-medium ${
                      reason === 'unit' ? 'text-amber-300' : 'text-slate-500'
                    }`}
                  >
                    单位变化
                  </span>
                  {reason === 'unit' && (
                    <span className="ml-auto text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                      主要原因
                    </span>
                  )}
                </div>
                {reason === 'unit' && selectedJumpRecord.unitChanged && (
                  <div className="mt-2 text-xs text-slate-400 pl-7">
                    记录单位从{' '}
                    <span className="text-slate-300 font-mono">
                      {selectedJumpRecord.unitBefore}
                    </span>{' '}
                    变为{' '}
                    <span className="text-amber-400 font-mono">
                      {selectedJumpRecord.unitAfter}
                    </span>
                    ，换算后实际值约{' '}
                    <span className="text-slate-300 font-mono">
                      {selectedJumpRecord.value / 1000} μm
                    </span>
                  </div>
                )}
              </div>

              {/* 正常记录影响 */}
              <div
                className={`p-3 rounded-lg border transition-all ${
                  reason === 'normal_record'
                    ? 'bg-sky-500/10 border-sky-500/40'
                    : 'bg-slate-950/30 border-slate-800 opacity-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText
                    size={16}
                    className={reason === 'normal_record' ? 'text-sky-400' : 'text-slate-500'}
                  />
                  <span
                    className={`text-sm font-medium ${
                      reason === 'normal_record' ? 'text-sky-300' : 'text-slate-500'
                    }`}
                  >
                    正常记录突发
                  </span>
                  {reason === 'normal_record' && (
                    <span className="ml-auto text-xs px-2 py-0.5 bg-sky-500/20 text-sky-400 rounded">
                      主要原因
                    </span>
                  )}
                </div>
                {reason === 'normal_record' && (
                  <div className="mt-2 text-xs text-slate-400 pl-7">
                    设备自动采集的真实数据跳变，非人为记录问题，需排查设备本身原因
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 原始记录 */}
          <div className="pt-3 border-t border-slate-800">
            <h4 className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">
              原始记录内容
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              {selectedJumpRecord.content}
            </p>
            <div className="mt-2 text-xs text-slate-500">
              来源：{selectedJumpRecord.source}
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
          <button
            onClick={closeJumpModal}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            关闭
          </button>
          <button
            onClick={closeJumpModal}
            className="px-4 py-2 text-sm bg-cyan-500 hover:bg-cyan-400 text-white rounded transition-colors"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}
