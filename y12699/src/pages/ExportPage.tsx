import { useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { sliceFormulaInfo } from '@/utils/formulas';
import {
  FileDown, Printer, Clock, CheckCircle2, AlertTriangle,
  Sparkles, ShieldAlert, Scissors, FileText
} from 'lucide-react';

export default function ExportPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const {
    batchList, currentBatchId, sliceParams, outlierPoints,
    collisionFrames, anomalies, measurementRecords
  } = useAppStore();
  const current = batchList.find(b => b.id === currentBatchId);

  const handleExport = async () => {
    setExporting(true);
    await new Promise(r => setTimeout(r, 800));
    setExporting(false);
    alert(`报告已生成：${current?.materialCode ?? 'batch'}-避障训练报告.pdf\n\n（实际项目中此处会调用 html2canvas + jsPDF 生成真实PDF）`);
  };

  const reviewedOutliers = outlierPoints.filter(p => p.reviewed).length;
  const riskFrames = collisionFrames.filter(f => f.hasCollision).length;
  const resolvedAnomalies = anomalies.filter(a => a.resolved).length;

  return (
    <div className="h-full overflow-auto bg-industrial-900">
      <div className="sticky top-0 z-10 bg-industrial-800 border-b border-industrial-600 px-6 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-400" />
            避障训练导出报告
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">包含完整复核链，运维组仅阅读此报告也能理解全部处理过程与拦截原因</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="industrial-btn flex items-center gap-2">
            <Printer className="w-4 h-4" />
            打印
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="industrial-btn-primary flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            {exporting ? '生成中...' : '导出 PDF'}
          </button>
        </div>
      </div>

      <div ref={reportRef} className="max-w-4xl mx-auto p-8 bg-industrial-800 my-6 industrial-card">
        <div className="border-b border-industrial-600 pb-6 mb-6">
          <h1 className="font-mono text-2xl text-slate-100 font-semibold mb-2">柔性机械臂避障训练报告</h1>
          <div className="text-sm text-slate-400 flex items-center gap-4 flex-wrap">
            <span>批次编号：<span className="font-mono text-slate-200">{current?.materialCode}</span></span>
            <span>材料名称：<span className="text-slate-200">{current?.name}</span></span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              生成时间：{new Date().toLocaleString('zh-CN')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="text-center p-4 bg-industrial-900 rounded-industrial border border-industrial-600">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">切片参数</div>
            <div className={`text-xl font-mono ${sliceParams.isOutOfBounds ? 'text-alert-orange' : 'text-pass-green'}`}>
              {sliceParams.isOutOfBounds ? '异常' : '通过'}
            </div>
          </div>
          <div className="text-center p-4 bg-industrial-900 rounded-industrial border border-industrial-600">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">离群点复核</div>
            <div className="text-xl font-mono text-slate-200">
              {reviewedOutliers}/{outlierPoints.length}
            </div>
          </div>
          <div className="text-center p-4 bg-industrial-900 rounded-industrial border border-industrial-600">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">碰撞风险帧</div>
            <div className={`text-xl font-mono ${riskFrames > 0 ? 'text-alert-orange' : 'text-pass-green'}`}>
              {riskFrames}
            </div>
          </div>
          <div className="text-center p-4 bg-industrial-900 rounded-industrial border border-industrial-600">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">异常处理</div>
            <div className="text-xl font-mono text-slate-200">
              {resolvedAnomalies}/{anomalies.length}
            </div>
          </div>
        </div>

        <section className="mb-8">
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-4 pb-2 border-b border-industrial-600">
            <Scissors className="w-4 h-4 text-blue-400" />
            一、点云切片处理记录
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <div className="detail-label mb-1">切面位置 (X, Y, Z)</div>
              <div className="detail-value">
                ({sliceParams.planeX.toFixed(2)}, {sliceParams.planeY.toFixed(2)}, {sliceParams.planeZ.toFixed(2)}) mm
              </div>
            </div>
            <div>
              <div className="detail-label mb-1">法向量 (a, b, c)</div>
              <div className="detail-value">
                ({sliceParams.normalX.toFixed(4)}, {sliceParams.normalY.toFixed(4)}, {sliceParams.normalZ.toFixed(4)})
              </div>
            </div>
            <div>
              <div className="detail-label mb-1">切片厚度 t</div>
              <div className="detail-value">{sliceParams.thickness_mm.toFixed(2)} mm</div>
            </div>
            <div>
              <div className="detail-label mb-1">切片间距</div>
              <div className="detail-value">{sliceParams.spacing_mm.toFixed(2)} mm</div>
            </div>
          </div>

          <div className="formula-block mb-4">
            <div className="mb-1 text-slate-500">使用公式：</div>
            <div className="text-slate-200">{sliceFormulaInfo.formula}</div>
            <div className="mt-2 mb-1 text-slate-500">单位：</div>
            <div className="text-slate-300 text-xs">{sliceFormulaInfo.units}</div>
            <div className="mt-2 mb-1 text-slate-500">适用范围：</div>
            <div className="text-slate-300 text-xs">{sliceFormulaInfo.range}</div>
          </div>

          {sliceParams.isOutOfBounds ? (
            <div className="p-4 bg-alert-orange/10 border border-alert-orange/40 rounded-industrial">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-alert-orange flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-alert-orange mb-1">剖切面越界 — 已被拦截</div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    {sliceParams.outOfBoundReason}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    <strong className="text-slate-300">为什么拦：</strong>公式要求切面与点云有有效交集，切面完全在点云外时切片结果为空集，无法进行后续分析。
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    <strong className="text-slate-300">怎么改：</strong>将切面位置参数向点云中心方向调整，或减小法向量对应维度上的偏移。
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-pass-green/10 border border-pass-green/40 rounded-industrial flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-pass-green" />
              <span className="text-sm text-pass-green">切片参数校验通过，切面与点云有有效交集</span>
            </div>
          )}
        </section>

        <section className="mb-8">
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-4 pb-2 border-b border-industrial-600">
            <Sparkles className="w-4 h-4 text-amber-400" />
            二、离群点漂浮检测与复核（同一轮）
          </h3>

          <div className="mb-4 text-xs text-slate-500">
            本轮复核同时纳入：三维模型点云数据 · {measurementRecords.length} 条测量记录 · {outlierPoints.length} 个离群点
          </div>

          <div className="space-y-3">
            {outlierPoints.map(p => (
              <div key={p.id} className="p-4 bg-industrial-900 rounded-industrial border border-industrial-600">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {p.reviewed
                      ? <CheckCircle2 className="w-4 h-4 text-pass-green" />
                      : <AlertTriangle className="w-4 h-4 text-alert-orange" />
                    }
                    <span className="font-mono text-sm text-slate-100">#{p.id.toUpperCase()}</span>
                    <span className="px-2 py-0.5 text-xs font-mono rounded bg-alert-orange/20 text-alert-orange">
                      {p.deviationSigma.toFixed(2)}σ
                    </span>
                    <span className={`text-xs ${p.reviewed ? 'text-pass-green' : 'text-alert-orange'}`}>
                      {p.reviewed ? '已复核' : '待复核'}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-slate-400">
                    ({p.x_mm.toFixed(1)}, {p.y_mm.toFixed(1)}, {p.z_mm.toFixed(1)}) mm
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="detail-label mb-0.5">疑似原因</div>
                    <div className="text-slate-300">{p.suspectedCause}</div>
                  </div>
                  <div>
                    <div className="detail-label mb-0.5">处理建议</div>
                    <div className="text-slate-300">{p.suggestion}</div>
                  </div>
                </div>
              </div>
            ))}
            {outlierPoints.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-sm border border-dashed border-industrial-600 rounded-industrial">
                本批次未检测到离群点
              </div>
            )}
          </div>
        </section>

        <section className="mb-8">
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-4 pb-2 border-b border-industrial-600">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            三、连续碰撞检测结果（时间轴逐帧，非一次性判断）
          </h3>

          <div className="mb-4 grid grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-industrial-900 rounded-industrial border border-industrial-600">
              <div className="detail-label mb-1">检测总帧数</div>
              <div className="detail-value">{collisionFrames.length} 帧</div>
            </div>
            <div className="p-3 bg-industrial-900 rounded-industrial border border-industrial-600">
              <div className="detail-label mb-1">时间步长 Δt</div>
              <div className="detail-value">0.5 s</div>
            </div>
            <div className="p-3 bg-industrial-900 rounded-industrial border border-industrial-600">
              <div className="detail-label mb-1">碰撞风险帧</div>
              <div className={`detail-value ${riskFrames > 0 ? 'text-alert-orange' : 'text-pass-green'}`}>
                {riskFrames} 帧
              </div>
            </div>
          </div>

          {riskFrames > 0 && (
            <div className="p-4 bg-alert-orange/10 border border-alert-orange/40 rounded-industrial mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-alert-orange flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-alert-orange mb-2">
                    以下时间帧检测到碰撞风险（关节与障碍物最小距离 {'<'} 5mm 安全阈值）
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {collisionFrames.filter(f => f.hasCollision).map(f => (
                      <div key={f.id} className="px-2 py-1 bg-alert-orange/20 rounded text-xs font-mono text-alert-orange">
                        t={f.timeSecond.toFixed(1)}s · {f.minDistance_mm.toFixed(2)}mm
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mb-8">
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-4 pb-2 border-b border-industrial-600">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            四、异常分类与处理记录
          </h3>

          <div className="space-y-3">
            {anomalies.map(a => (
              <div key={a.id} className="p-4 bg-industrial-900 rounded-industrial border border-industrial-600">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      a.category === 'missing_data' ? 'bg-blue-500/20 text-blue-400' :
                      a.category === 'param_error' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {a.categoryLabel}
                    </span>
                    <span className={`text-xs ${a.resolved ? 'text-pass-green' : 'text-alert-orange'}`}>
                      {a.resolved ? '已解决' : '待处理'}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-slate-500">{a.id.toUpperCase()}</span>
                </div>
                <div className="text-sm text-slate-300 mb-2">{a.description}</div>
                <div className="text-xs">
                  <span className="text-slate-500">下一步操作：</span>
                  <span className={`font-medium ${a.nextAction === '补材料' ? 'text-blue-400' : 'text-amber-400'}`}>
                    {a.nextAction}
                  </span>
                </div>
              </div>
            ))}
            {anomalies.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-sm border border-dashed border-industrial-600 rounded-industrial">
                本批次无异常
              </div>
            )}
          </div>
        </section>

        <section className="pt-4 border-t border-industrial-600">
          <div className="text-xs text-slate-500 text-center">
            — 本报告由柔性机械臂避障训练计算工具自动生成 —
          </div>
        </section>
      </div>
    </div>
  );
}
