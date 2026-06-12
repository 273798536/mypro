import { forwardRef } from 'react';
import { ErrorRecord } from '@/types';
import AnomalyTag from './AnomalyTag';
import ConvexHullVisual from './ConvexHullVisual';

interface Props {
  record: ErrorRecord;
  rerunArea?: number | null;
}

const ScreenshotCard = forwardRef<HTMLDivElement, Props>(({ record, rerunArea }, ref) => {
  const changedMaterials = record.materials.filter((m) => m.changedFromPrevious);
  return (
    <div
      ref={ref}
      className="bg-white border-2 border-ink-800 rounded-lg p-6 w-[640px] shadow-xl"
      style={{ fontFamily: '"JetBrains Mono", monospace' }}
    >
      <div className="flex items-center justify-between mb-4 border-b-2 border-ink-800 pb-3">
        <div>
          <div className="font-display text-2xl font-bold text-ink-900">凸包面积错题 · 复盘说明</div>
          <div className="text-xs text-ink-600 mt-1">样本 ID: {record.sampleId}</div>
        </div>
        <AnomalyTag type={record.anomalyType} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] text-ink-600 mb-1 tracking-wide">样例输入</div>
          <pre className="text-xs bg-paper-50 border border-paper-200 rounded p-2 whitespace-pre-wrap">
            {record.rawInput}
          </pre>
          <div className="mt-3">
            <div className="text-[11px] text-ink-600 mb-1 tracking-wide">凸包可视化</div>
            {record.inputPoints && record.inputPoints.length > 0 ? (
              <ConvexHullVisual points={record.inputPoints} hull={record.inputPoints} width={270} height={180} />
            ) : (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-3 text-center">
                空集合 — 无点可绘制
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-ink-600 mb-1 tracking-wide">结果对比</div>
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr className="border-b border-paper-200">
                <td className="py-1.5 text-ink-600">期望面积</td>
                <td className="py-1.5 text-right font-bold text-ink-900">
                  {record.expectedArea ?? '—'}
                </td>
              </tr>
              <tr className="border-b border-paper-200">
                <td className="py-1.5 text-ink-600">原始实际结果</td>
                <td className={`py-1.5 text-right font-bold ${Number.isNaN(record.actualArea) ? 'text-amber-600' : 'text-ink-900'}`}>
                  {Number.isNaN(record.actualArea) ? 'NaN (除零)' : record.actualArea ?? '—'}
                </td>
              </tr>
              <tr className="border-b border-paper-200 bg-emerald-50">
                <td className="py-1.5 text-ink-600">重跑结果</td>
                <td className="py-1.5 text-right font-bold text-emerald-700">
                  {rerunArea === undefined ? '未重跑' : rerunArea === null ? '异常' : rerunArea}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-ink-600">提交次数</td>
                <td className="py-1.5 text-right font-mono text-ink-900">{record.submittedCount} 次（已去重）</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-3">
            <div className="text-[11px] text-ink-600 mb-1 tracking-wide">关键线索</div>
            <ul className="text-[11px] space-y-1">
              {record.anomalyDetail && (
                <li className="flex gap-1.5"><span className="text-amber-600">▸</span> {record.anomalyDetail}</li>
              )}
              {changedMaterials.length > 0 && (
                <li className="flex gap-1.5 text-amber-700">
                  <span>▸</span> {changedMaterials.length} 份材料口径已变更
                </li>
              )}
              {record.submittedCount > 1 && (
                <li className="flex gap-1.5 text-ink-700">
                  <span>▸</span> 幂等：同一样本被重复提交 {record.submittedCount} 次，仅计 1 条
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-paper-200 flex justify-between text-[10px] text-ink-600">
        <span>生成时间：{new Date().toLocaleString('zh-CN')}</span>
        <span>凸包面积错题复盘 · 沟通用截图说明</span>
      </div>
    </div>
  );
});

ScreenshotCard.displayName = 'ScreenshotCard';
export default ScreenshotCard;
