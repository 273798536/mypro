import { useState } from 'react';
import { FileText, Download, Ship, AlertTriangle, Clock, Waves, Info, FileWarning } from 'lucide-react';
import { generateExportReport, downloadReport } from '../utils/reportExport';
import { mockErosionReport } from '../data/mockData';

export default function ReportExportPanel() {
  const [fleetPerspective, setFleetPerspective] = useState(true);
  const [includeCalculationDetails, setIncludeCalculationDetails] = useState(true);
  const [includeFormula, setIncludeFormula] = useState(true);
  const [highlightUnusable, setHighlightUnusable] = useState(true);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const report = mockErosionReport;

  const handleGeneratePreview = () => {
    const content = generateExportReport(report, {
      includeCalculationDetails,
      includeFormula,
      highlightUnusable,
      fleetPerspective,
    });
    setPreviewContent(content);
    setShowPreview(true);
  };

  const handleDownload = () => {
    const content = generateExportReport(report, {
      includeCalculationDetails,
      includeFormula,
      highlightUnusable,
      fleetPerspective,
    });
    downloadReport(content, `海岸侵蚀剖面报告_${report.reportDate}.txt`);
  };

  const unusableTotal = report.unavailableRecords.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-7 h-7 text-ocean-600" />
            报告导出
          </h2>
          <p className="text-slate-500 mt-1">船队视角：突出不可用记录与漂移拦截原因</p>
        </div>
      </div>

      {fleetPerspective && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Ship className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800">船队视角模式</h3>
              <p className="text-sm text-amber-700 mt-1">
                报告优先展示不可用记录、漂移拦截原因和受延迟影响的结论，让船队一眼就能看到哪些数据有问题
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">导出选项</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={fleetPerspective}
                  onChange={(e) => setFleetPerspective(e.target.checked)}
                  className="w-4 h-4 text-ocean-600 rounded"
                />
                <div>
                  <div className="text-sm font-medium text-slate-800">船队视角</div>
                  <div className="text-xs text-slate-500">优先展示问题记录</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={includeCalculationDetails}
                  onChange={(e) => setIncludeCalculationDetails(e.target.checked)}
                  className="w-4 h-4 text-ocean-600 rounded"
                />
                <div>
                  <div className="text-sm font-medium text-slate-800">计算详情</div>
                  <div className="text-xs text-slate-500">包含各断面详细计算结果</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={includeFormula}
                  onChange={(e) => setIncludeFormula(e.target.checked)}
                  className="w-4 h-4 text-ocean-600 rounded"
                />
                <div>
                  <div className="text-sm font-medium text-slate-800">公式说明</div>
                  <div className="text-xs text-slate-500">包含计算公式和适用范围</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={highlightUnusable}
                  onChange={(e) => setHighlightUnusable(e.target.checked)}
                  className="w-4 h-4 text-ocean-600 rounded"
                />
                <div>
                  <div className="text-sm font-medium text-slate-800">突出不可用记录</div>
                  <div className="text-xs text-slate-500">重点标注问题数据</div>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">报告概览</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">报告编号</span>
                <span className="text-sm font-mono text-slate-800">{report.reportId}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">报告日期</span>
                <span className="text-sm text-slate-800">{report.reportDate}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">监测断面</span>
                <span className="text-sm text-slate-800">{report.sectionName}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">监测周期</span>
                <span className="text-sm text-slate-800">
                  {report.reportPeriod.start} ~ {report.reportPeriod.end}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleGeneratePreview}
              className="w-full py-3 px-4 bg-ocean-600 text-white rounded-lg font-medium hover:bg-ocean-700 transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" />
              生成预览
            </button>
            <button
              onClick={handleDownload}
              className="w-full py-3 px-4 bg-white text-ocean-600 border border-ocean-200 rounded-lg font-medium hover:bg-ocean-50 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              下载报告
            </button>
          </div>
        </div>

        <div className="col-span-8 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4 bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <FileWarning className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-700">不可用记录</span>
              </div>
              <div className="text-3xl font-bold text-red-600">{unusableTotal}</div>
              <div className="text-xs text-red-500 mt-1">
                {report.unavailableRecords.map(r => r.type).join('、')}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Waves className="w-5 h-5 text-amber-500" />
                <span className="text-sm text-slate-600">漂移拦截</span>
              </div>
              <div className="text-3xl font-bold text-amber-600">
                {report.driftInterceptions.total}
              </div>
              <div className="text-xs text-slate-500 mt-1">条数据被拦截</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-orange-500" />
                <span className="text-sm text-slate-600">延迟日志</span>
              </div>
              <div className="text-3xl font-bold text-orange-600">
                {report.delayedLogImpact.delayedLogs.length}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                影响 {report.delayedLogImpact.affectedConclusions.length} 条结论
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              不可用记录汇总
            </h3>

            <div className="space-y-4">
              {report.unavailableRecords.map((category, idx) => (
                <div key={idx} className="bg-red-50 rounded-lg border border-red-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                        {category.type}
                      </span>
                      <span className="text-red-600 font-bold">{category.count} 条</span>
                    </div>
                    <span className="text-sm text-red-600">{category.reason}</span>
                  </div>
                  <div className="space-y-1.5">
                    {category.records.map((rec, ridx) => (
                      <div key={ridx} className="flex items-center gap-2 text-sm text-red-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0"></span>
                        <span className="text-red-500">{rec.time}</span>
                        <span>{rec.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Waves className="w-5 h-5 text-ocean-500" />
              漂移拦截说明（报告中可见）
            </h3>
            
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-3">
                即使只看导出的文本报告，也能明白每条漂移数据为什么被拦下来：
              </p>
              <div className="space-y-2">
                {report.driftInterceptions.interceptions.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="bg-white rounded p-3 border border-slate-200 text-sm">
                    <div className="font-medium text-slate-800">
                      {item.buoyId} · {item.timestamp}
                    </div>
                    <div className="text-amber-600 mt-1">
                      漂移 {item.driftDistance}km
                    </div>
                    <div className="text-slate-600 mt-1">
                      原因：{item.reason}
                    </div>
                    <div className="text-ocean-600 mt-1">
                      处理：{item.action}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              延迟日志影响的结论
            </h3>
            
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <p className="text-sm text-orange-700 mb-3">
                以下结论受养殖日志延迟影响，报告中会明确标注：
              </p>
              <ul className="space-y-2">
                {report.delayedLogImpact.affectedConclusions.map((conclusion, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-orange-800">
                    <span className="w-5 h-5 rounded-full bg-orange-200 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    {conclusion}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {report.monthlySummary && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-slate-500" />
                月度汇总：{report.monthlySummary.month}
              </h3>
              
              <div className="grid grid-cols-3 gap-3 mb-4">
                {report.monthlySummary.unusableRecordTypes.map((type, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-slate-800">{type.count}</div>
                    <div className="text-xs text-slate-500">{type.type}</div>
                    <div className="text-xs text-slate-400 mt-1">{type.percentage}%</div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="text-sm font-medium text-slate-700 mb-2">重点问题</div>
                <ul className="space-y-1.5">
                  {report.monthlySummary.keyIssues.map((issue, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0 mt-1.5"></span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">报告预览</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-ocean-600 text-white rounded-lg text-sm font-medium hover:bg-ocean-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  下载
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-slate-50">
              <pre className="font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed bg-white p-6 rounded-lg border border-slate-200 shadow-inner">
                {previewContent}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
