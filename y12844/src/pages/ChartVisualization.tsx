import React from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useSampleStore } from '@/store/useSampleStore';
import { useAnalysisStore } from '@/store/useAnalysisStore';
import { MOCK_SAMPLES } from '@/data/mockSamples';
import MigrationChart from '@/components/MigrationChart';
import StatusBadge from '@/components/StatusBadge';
import type { Sample } from '@/types';

interface ChartVisualizationProps {
  sample?: Sample;
  onBack?: () => void;
  onNavigate?: (page: string) => void;
}

const ChartVisualization: React.FC<ChartVisualizationProps> = ({ sample, onBack, onNavigate }) => {
  const { getSelectedSample } = useSampleStore();
  const { getLatestRun } = useAnalysisStore();

  const sampleFromStore = useSampleStore(state => {
    const selected = state.getSelectedSample();
    return selected ?? MOCK_SAMPLES[0];
  });
  const effectiveSample = sample ?? sampleFromStore;
  const latestRun = getLatestRun(effectiveSample.barcode);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => onBack?.()}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100"
              >
                <ArrowLeft size={20} />
                返回样本列表
              </button>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">图表可视化分析</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-slate-500 font-mono">{effectiveSample.barcode}</span>
                  <span className="text-sm text-slate-500">•</span>
                  <span className="text-sm text-slate-500">{effectiveSample.cellType}</span>
                  <StatusBadge status={effectiveSample.status} size="sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {effectiveSample.isBarcodeDuplicate && (
          <div className="mb-6 bg-rose-50 border-2 border-rose-300 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={24} className="text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-rose-800 text-lg mb-2">
                  ⚠️ 条码重复警告 - 图表数据仅供参考
                </h3>
                <p className="text-sm text-rose-700 mb-3">
                  本样本条码 <code className="bg-rose-100 px-2 py-0.5 rounded font-mono">{effectiveSample.barcode}</code>
                  与其他样本重复，系统已拦截。下方图表可能属于其他样本，请谨慎查看。
                </p>
                <div className="bg-white rounded-lg p-4 border border-rose-200">
                  <h4 className="text-xs font-semibold text-rose-600 uppercase mb-2">📚 学生学习提示</h4>
                  <p className="text-xs text-rose-700 leading-relaxed">
                    <strong>为什么图表旁边需要明细解释？</strong>
                    因为同样的颜色在不同样本上代表的含义可能不同！
                    如果只靠颜色（绿色/黄色/红色）判断，学生很容易猜错。
                    所以每个图表旁边都配有文字说明，明确标注：
                    每个数据点代表什么、颜色代表什么状态、临界值是多少、判断依据是什么。
                    这样即使是第一次看报告的学生也能明白。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!latestRun ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-16 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={36} className="text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-700 text-lg mb-2">暂无分析数据</h3>
            <p className="text-slate-500 text-sm">
              请先完成「分析计算」后再查看图表可视化
            </p>
            <button
              onClick={() => onNavigate?.('analysis')}
              className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm inline-flex items-center gap-2"
            >
              前往分析计算
            </button>
          </div>
        ) : latestRun.status === 'failed' ? (
          <div className="bg-red-50 rounded-xl border-2 border-red-200 p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={36} className="text-red-500" />
            </div>
            <h3 className="font-semibold text-red-700 text-lg mb-2">分析失败，无法生成图表</h3>
            <p className="text-red-600 text-sm mb-2">
              失败原因：{latestRun.failureReason?.description || '未知错误'}
            </p>
            <p className="text-xs text-red-500">
              请检查样本质量后重新运行分析
            </p>
          </div>
        ) : (
          <MigrationChart
            migrationData={latestRun.migrationData}
            qcResult={latestRun.qcResult}
            sampleBarcode={effectiveSample.barcode}
            isBarcodeDuplicate={effectiveSample.isBarcodeDuplicate}
            duplicateInfo={effectiveSample.duplicateWith
              ? `该条码与样本「${effectiveSample.duplicateWith}」重复，请确认数据归属`
              : undefined}
          />
        )}
      </div>
    </div>
  );
};

export default ChartVisualization;
