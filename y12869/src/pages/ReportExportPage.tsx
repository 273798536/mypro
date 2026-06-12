import { useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { NEGATIVE_DEPTH_EXPLAIN_STEPS } from '@/utils/datumCalculator';
import { useAnomalyDisposal } from '@/hooks/useAnomalyDisposal';
import { FileDown, Printer, Info, AlertTriangle, QrCode, MapPin, BookOpen, ChevronRight } from 'lucide-react';
import { anomalyTypeToLabel } from '@/utils/colorScale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ReportExportPage() {
  const report = useAppStore(s => s.report);
  const anomalies = useAppStore(s => s.anomaly.list);
  const negativeAnomalies = anomalies.filter(a => a.type === 'negative_depth');
  const { stats } = useAnomalyDisposal();
  const printRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        windowWidth: 1400,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const pageH = 297;
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
        heightLeft -= pageH;
      }
      pdf.save(`${report?.reportId || 'report'}-航道淤积测量报告.pdf`);
    } finally {
      setExporting(false);
    }
  };

  if (!report) {
    return <div className="w-full h-full flex items-center justify-center text-channel-muted">加载报告数据中…</div>;
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-channel-panel">
      <div className="h-14 px-6 bg-channel-panel border-b border-channel-border flex items-center gap-4 shrink-0">
        <div>
          <div className="text-sm font-semibold text-white/95">报告预览与导出</div>
          <div className="text-[11px] text-channel-muted">课题组成员仅看导出报告也能明白深度为负为什么被拦下来</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => window.print()} className="btn-outline inline-flex items-center gap-2">
            <Printer className="w-4 h-4" /> 打印
          </button>
          <button onClick={handleExportPDF} disabled={exporting} className="btn-primary inline-flex items-center gap-2">
            <FileDown className="w-4 h-4" />
            {exporting ? '导出中…' : '导出 PDF'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin bg-ocean-950/80 p-8">
        <div ref={printRef} className="report-page mx-auto" style={{ boxShadow: '0 30px 80px -20px rgba(0,0,0,0.5)' }}>
          <header className="mb-6 pb-4 border-b-4 border-double border-slate-400">
            <div className="text-center">
              <div className="text-xs tracking-[0.5em] text-ocean-800 mb-2">CHINA MARITIME SAFETY ADMINISTRATION</div>
              <h1 className="report-h1 border-b-0 pb-0 mb-1 text-center tracking-wide">
                {report.channelName}
              </h1>
              <h2 className="text-xl font-serif font-semibold text-slate-800 text-center">{report.reportName}</h2>
              <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-600">
                <span>报告编号：<span className="font-mono text-slate-800">{report.reportId}</span></span>
                <span>版　　本：<span className="font-mono text-slate-800">{report.version}</span></span>
                <span>日　　期：<span className="font-mono text-slate-800">{report.reportDate}</span></span>
              </div>
            </div>
          </header>

          <section className="mb-6">
            <h2 className="report-h2">一、测量概况</h2>
            <p className="report-p drop-cap">
              本报告针对{report.channelName}开展航道淤积测量，测量航道里程范围
              <span className="font-mono mx-1 text-ocean-700">{(report.startMileage / 1000).toFixed(1)} km ~ {(report.endMileage / 1000).toFixed(1)} km</span>，
              总长度 <span className="font-semibold text-ocean-700">10.0 km</span>。测量基准面采用
              <span className="font-semibold">{report.datumPlane}</span>。
              共布置 <span className="font-mono font-bold text-ocean-700">{report.summary.totalSectionCount}</span> 个测量断面，
              采集有效测点 <span className="font-mono font-bold text-ocean-700">{report.summary.totalPointCount.toLocaleString()}</span> 个。
            </p>
            <table className="report-table">
              <thead>
                <tr>
                  <th className="report-th w-1/4">统计指标</th>
                  <th className="report-th w-1/4">数值</th>
                  <th className="report-th w-1/4">统计指标</th>
                  <th className="report-th">数值</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="report-td">平均水深</td>
                  <td className="report-td font-mono font-semibold">{report.summary.avgDepth.toFixed(2)} m</td>
                  <td className="report-td">最大水深</td>
                  <td className="report-td font-mono font-semibold">{report.summary.maxDepth.toFixed(2)} m</td>
                </tr>
                <tr>
                  <td className="report-td">最小水深</td>
                  <td className={`report-td font-mono font-semibold ${report.summary.minDepth < 0 ? 'text-red-600 bg-red-50' : ''}`}>
                    {report.summary.minDepth.toFixed(2)} m
                  </td>
                  <td className="report-td">淤积总量</td>
                  <td className="report-td font-mono font-semibold">{report.summary.siltationTotal.toLocaleString()} m³</td>
                </tr>
                <tr>
                  <td className="report-td">
                    <span className="text-red-600 font-semibold">⚠ 深度负值拦截</span>
                  </td>
                  <td className="report-td font-mono font-bold text-red-600 bg-red-50">
                    {report.summary.negativeDepthCount} 个测点
                  </td>
                  <td className="report-td">异常总数</td>
                  <td className="report-td font-mono font-bold">
                    <span className="text-red-600">{report.summary.anomalyCount.red}红</span>
                    <span className="mx-1">/</span>
                    <span className="text-amber-600">{report.summary.anomalyCount.orange}橙</span>
                    <span className="mx-1">/</span>
                    <span className="text-yellow-600">{report.summary.anomalyCount.yellow}黄</span>
                    <span className="mx-1">/</span>
                    <span className="text-blue-600">{report.summary.anomalyCount.blue}蓝</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="mb-6">
            <h2 className="report-h2 flex items-center gap-2">
              <Info className="w-6 h-6 text-red-600 inline-block" />
              <span className="text-red-700">二、深度负值拦截说明</span>
              <span className="chip-red text-[10px] ml-2 align-middle">课题组必读章节</span>
            </h2>
            <div className="p-5 rounded-lg bg-gradient-to-br from-red-50 to-amber-50 border-2 border-red-200 mb-5 relative overflow-hidden">
              <div className="absolute right-4 top-4 text-[72px] font-serif font-bold text-red-200/30 select-none">?</div>
              <h3 className="report-h3 text-red-800 mt-0">什么是"深度负值"？为什么要拦截？</h3>
              <p className="report-p">
                航道测量中，修正后深度 <span className="font-mono">correctedDepth</span> 表示相对于
                <span className="font-semibold">理论最低潮面</span>的水深。
                理论上，只要测点位于水面以下，修正后深度就应为正数。
                当修正后深度出现<span className="text-red-600 font-bold">负数</span>且超出测量不确定度范围时，
                意味着<span className="font-semibold">该测点"浮"在了基准面之上</span>，
                这在物理上不可能，通常由<span className="font-semibold">基准面换算错误、潮汐修正符号反了、
                GPS 天线高/吃水深度校准偏差</span>等系统性误差导致，
                <span className="text-red-600 font-bold">若参与淤积计算会严重歪曲结论</span>，
                因此必须予以<span className="font-bold underline decoration-wavy decoration-red-500">拦截（排除）</span>。
              </p>
            </div>

            <h3 className="report-h3">拦截链路五步走</h3>
            <div className="space-y-4">
              {NEGATIVE_DEPTH_EXPLAIN_STEPS.map((step, idx) => (
                <div key={idx} className="relative pl-12">
                  <div className="absolute left-0 top-0 w-9 h-9 rounded-full bg-ocean-700 text-white flex items-center justify-center font-serif font-bold text-base shadow-md ring-4 ring-white">
                    {idx + 1}
                  </div>
                  <div className="p-4 rounded-lg border border-slate-200 bg-white hover:shadow-md transition-shadow">
                    <div className="font-serif font-bold text-base text-slate-900 mb-1.5">{step.title}</div>
                    <div className="text-sm text-slate-700 leading-7">{step.description}</div>
                    {step.formula && (
                      <div className="mt-3 p-2.5 rounded bg-slate-100 font-mono text-sm text-ocean-800 border-l-4 border-ocean-500 inline-block">
                        {step.formula}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <h3 className="report-h3 mt-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>本报告实际案例：{negativeAnomalies.length} 处深度负值测点</span>
            </h3>
            <div className="p-4 rounded-lg border-2 border-amber-300 bg-amber-50">
              <p className="report-p mb-3">
                以<span className="font-mono text-red-600 font-bold"> SEC-002-LN2-P018 </span>
                测点为例，演示判别过程：
              </p>
              <table className="report-table mb-3">
                <thead>
                  <tr>
                    <th className="report-th">原始测深</th>
                    <th className="report-th">潮汐修正</th>
                    <th className="report-th">基准面换算</th>
                    <th className="report-th">σ（不确定度）</th>
                    <th className="report-th">修正后深度</th>
                    <th className="report-th">判别</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="report-td font-mono text-center">3.120 m</td>
                    <td className="report-td font-mono text-center text-ocean-700">+ 3.750 m</td>
                    <td className="report-td font-mono text-center text-ocean-700">- 0.120 m</td>
                    <td className="report-td font-mono text-center">± 0.15 m</td>
                    <td className="report-td font-mono text-center font-bold text-red-600 bg-red-50">- 0.720 m</td>
                    <td className="report-td text-center">
                      <span className="inline-block px-2 py-1 rounded bg-red-600 text-white text-xs font-bold">
                        ⛔ 拦截
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-slate-700 leading-6">
                <span className="font-semibold text-red-600">判别：</span>
                修正后深度 −0.720 m {'< 0'}，且 |−0.720| = 0.720 m {'>'} 3 × 0.15 = 0.450 m，
                超出测量不确定度 <span className="font-mono">3σ</span> 阈值，
                判定为<span className="font-bold text-red-600">深度负值异常</span>。
                该测点已自动<span className="font-bold underline">排除</span>出 SEC-002 断面淤积量统计。
                <span className="text-ocean-700 font-semibold ml-2">（处置方向：改口径，请复核潮汐修正符号与基准面参数）</span>
              </p>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="report-h2">三、断面淤积统计表</h2>
            <table className="report-table">
              <thead>
                <tr>
                  <th className="report-th w-28">断面编号</th>
                  <th className="report-th">桩号位置</th>
                  <th className="report-th w-24">宽度 (m)</th>
                  <th className="report-th w-32">淤积量 (m³)</th>
                  <th className="report-th w-24">测线条数</th>
                  <th className="report-th">备注</th>
                </tr>
              </thead>
              <tbody>
                {report.sections.map(sec => {
                  const anomCount = sec.surveyLines.reduce((s, l) => s + l.points.filter(p => p.isAnomaly).length, 0);
                  return (
                    <tr key={sec.sectionId}>
                      <td className="report-td font-mono font-semibold text-ocean-700">{sec.sectionId}</td>
                      <td className="report-td">K{(sec.mileage / 1000).toFixed(3)}</td>
                      <td className="report-td font-mono text-right">{sec.width}</td>
                      <td className="report-td font-mono text-right font-semibold">{sec.siltationVolume.toLocaleString()}</td>
                      <td className="report-td text-center">{sec.surveyLines.length}</td>
                      <td className="report-td">
                        {anomCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 text-xs">
                            <AlertTriangle className="w-3 h-3" /> {anomCount} 处异常
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="mb-6 break-before-page">
            <h2 className="report-h2 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-red-600" />
              <span className="text-red-700">四、异常处置说明（含"下一步"操作指引）</span>
            </h2>
            <p className="report-p">
              本报告共检出异常 <span className="font-bold">{stats.total}</span> 项，
              不同于旧版只显示一个红色数字，每一项异常都明确告知处置人员：
              <span className="mx-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">补材料</span>
              （缺水质报告/养殖日志/现场照片）
              还是
              <span className="mx-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">改口径</span>
              （阈值/坐标系/基准面参数调整），避免"手工补锅"。
            </p>
            <div className="grid grid-cols-1 gap-3">
              {anomalies.slice(0, 4).map(a => (
                <div key={a.anomalyId} className={`rounded-lg border-l-4 p-4 bg-white border border-slate-200
                  ${a.severity === 'red' ? 'border-l-red-500' : a.severity === 'orange' ? 'border-l-amber-500' : a.severity === 'yellow' ? 'border-l-yellow-500' : 'border-l-blue-500'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white
                      ${a.severity === 'red' ? 'bg-red-500' : a.severity === 'orange' ? 'bg-amber-500' : a.severity === 'yellow' ? 'bg-yellow-500 text-yellow-950' : 'bg-blue-500'}`}>
                      !
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs text-slate-500">{a.anomalyId}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold
                          ${a.severity === 'red' ? 'bg-red-100 text-red-700' : a.severity === 'orange' ? 'bg-amber-100 text-amber-700' : a.severity === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-700'}`}>
                          {a.severity === 'red' ? '严重' : a.severity === 'orange' ? '较重' : a.severity === 'yellow' ? '一般' : '提示'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                          {anomalyTypeToLabel(a.type)}
                        </span>
                        <span className={`ml-auto px-2 py-0.5 rounded text-xs font-semibold
                          ${a.disposalDirection === 'supplement_material' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {a.disposalDirection === 'supplement_material' ? '📋 补材料' : '⚙️ 改口径'}
                        </span>
                      </div>
                      <div className="font-serif font-semibold text-sm text-slate-900">{a.title}</div>
                      <div className="text-xs text-slate-600 mt-1 leading-6">{a.description}</div>
                      <div className="mt-2 text-xs">
                        <span className="text-slate-500">下一步：</span>
                        <span className="text-slate-800 font-medium">
                          {a.disposalSteps.find(s => !s.completed && s.required)?.instruction
                            || a.disposalSteps[0]?.instruction || '无'}
                        </span>
                      </div>
                      {a.relatedPointIds.length > 0 && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="text-slate-500">关联测点：</span>
                          {a.relatedPointIds.slice(0, 2).map(pid => (
                            <span key={pid} className="font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{pid}</span>
                          ))}
                          {a.relatedPointIds.length > 2 && <span className="text-slate-400">+{a.relatedPointIds.length - 2}</span>}
                          <span className="ml-auto flex items-center gap-1 text-ocean-700">
                            <QrCode className="w-3 h-3" /> 扫码回查
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {anomalies.length > 4 && (
                <div className="text-center py-3 text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  另有 <span className="font-bold text-ocean-700">{anomalies.length - 4}</span> 项异常详情请登录系统查看
                  <ChevronRight className="w-4 h-4 inline align-text-bottom" />
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="report-h2">五、审计链附录</h2>
            <table className="report-table">
              <thead>
                <tr>
                  <th className="report-th w-48">审计项</th>
                  <th className="report-th">版本 / 内容</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="report-td">潮汐表版本</td>
                  <td className="report-td font-mono">TIDE-V20260611-03（发布 2026-06-11 20:00）
                    <span className="ml-3 text-amber-700 font-semibold">⚠ 距当前延迟 3h，3 项结论为临时值</span>
                  </td>
                </tr>
                <tr>
                  <td className="report-td">轨迹清洗规则链</td>
                  <td className="report-td font-mono">CHAIN-DEFAULT-001：野值剔除(3σ) → 滑动平均(5点) → 卡尔曼(关) → 人工复核</td>
                </tr>
                <tr>
                  <td className="report-td">导出操作人</td>
                  <td className="report-td">海事安全员 · 陈工　（账号 MS-ChenG）</td>
                </tr>
                <tr>
                  <td className="report-td">导出时间戳</td>
                  <td className="report-td font-mono">{new Date().toLocaleString('zh-CN', { hour12: false })}</td>
                </tr>
                <tr>
                  <td className="report-td">系统版本</td>
                  <td className="report-td font-mono">channel-report v1.0.3 / build 20260612.02</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-8 pt-6 border-t border-slate-300 text-center">
              <div className="inline-block">
                <div className="text-xs text-slate-400 mb-1">— 报告结束 · 海事局专用章骑缝处 —</div>
                <div className="w-40 h-16 mx-auto border-2 border-dashed border-slate-400 rounded flex items-center justify-center text-[10px] text-slate-400">
                  盖章处
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
