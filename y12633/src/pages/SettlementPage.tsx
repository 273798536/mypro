import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  FileSpreadsheet,
  FileJson,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Undo2,
  RotateCcw,
  Target,
  MapPin,
  Home,
  Download,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useInspectionStore } from '../store/inspectionStore';
import {
  statusLabel,
  statusChipClass,
  hitDetectionLabel,
  hitDetectionChipClass,
  calculateInspectionProgress,
  buildExportReport,
} from '../utils/helpers';
import {
  exportToPDF,
  exportToExcel,
  exportToJSON,
} from '../utils/exportUtils';
import { useState } from 'react';

export default function SettlementPage() {
  const navigate = useNavigate();
  const {
    inspection,
    past,
    future,
    completeInspection,
  } = useInspectionStore();

  const [exporting, setExporting] = useState<string | null>(null);

  const report = buildExportReport(inspection);
  const progress = calculateInspectionProgress(inspection.drainPoints);

  const hasUndoHistory = past.length > 0 || inspection.undoPerformed;

  const handleExport = async (type: 'pdf' | 'excel' | 'json') => {
    setExporting(type);
    await new Promise((r) => setTimeout(r, 300));
    try {
      if (type === 'pdf') exportToPDF(inspection);
      if (type === 'excel') exportToExcel(inspection);
      if (type === 'json') exportToJSON(inspection);
    } finally {
      setExporting(null);
    }
  };

  const handleComplete = () => {
    completeInspection();
  };

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <header className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/level')}
              className="btn-ghost flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <Home className="w-4 h-4" />
            </button>
            <div className="h-6 w-px bg-gray-200" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                巡检结算
              </h1>
              <p className="text-xs text-gray-500">
                {inspection.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`chip ${
                inspection.status === 'completed'
                  ? 'chip-inspected'
                  : 'chip-pending'
              }`}
            >
              {inspection.status === 'completed' ? '已完成' : '进行中'}
            </span>
            {inspection.status !== 'completed' && (
              <button
                onClick={handleComplete}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                标记完成
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <section className="mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" />
                巡检摘要
              </h2>
              <span className="text-xs text-gray-400">
                界面摘要与导出文件完全一致
              </span>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 font-medium">
                  整体完成度
                </span>
                <span className="text-sm font-semibold text-primary-600">
                  {progress}%
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">雨水口总数</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {report.totalPoints}
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-500">已通过</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {report.inspectedCount}
                </p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-gray-500">待巡检</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">
                  {report.pendingCount}
                </p>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-500">需整改</span>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {report.failedCount}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    report.hitCount > 0
                      ? 'bg-green-100'
                      : 'bg-gray-100'
                  }`}
                >
                  <Target
                    className={`w-5 h-5 ${
                      report.hitCount > 0
                        ? 'text-green-600'
                        : 'text-gray-400'
                    }`}
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-500">命中检测</p>
                  <p className="text-sm font-semibold text-gray-900">
                    命中 {report.hitCount} / 未命中 {report.missCount}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    inspection.boundaryFailTriggered
                      ? 'bg-red-100'
                      : 'bg-gray-100'
                  }`}
                >
                  <AlertTriangle
                    className={`w-5 h-5 ${
                      inspection.boundaryFailTriggered
                        ? 'text-red-600'
                        : 'text-gray-400'
                    }`}
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-500">边界失败</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {inspection.boundaryFailTriggered
                      ? '已触发（有讲解备注）'
                      : '未触发'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    hasUndoHistory
                      ? 'bg-blue-100'
                      : 'bg-gray-100'
                  }`}
                >
                  <Undo2
                    className={`w-5 h-5 ${
                      hasUndoHistory
                        ? 'text-blue-600'
                        : 'text-gray-400'
                    }`}
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-500">撤销/重开</p>
                  <p className="text-sm font-semibold text-gray-900">
                    撤销 {past.length} 步 / 重做 {future.length} 步
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {inspection.boundaryFailTriggered && (
          <section className="mb-8">
            <div className="card p-6 border-l-4 border-l-red-400">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    边界失败事件 · 讲解备注
                  </h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-3">
                    <p className="text-sm text-gray-800">
                      {inspection.boundaryNotes ||
                        '标注越出了巡检范围的有效边界（5%-95%区域外）'}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>
                      <span className="font-medium text-gray-700">
                        说明：
                      </span>{' '}
                      此事件已记录并将在导出报告中体现，用于赛事运营的教学演示与复盘。
                    </p>
                    <p>
                      <span className="font-medium text-gray-700">
                        处理建议：
                      </span>{' '}
                      点击顶部「撤销」可回退到边界失败前的状态，或使用「重开关卡」重新开始。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {hasUndoHistory && (
          <section className="mb-8">
            <div className="card p-6 border-l-4 border-l-blue-400">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    撤销/重开记录 · 过程回溯
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-600 font-medium mb-0.5">
                        撤销步数
                      </p>
                      <p className="text-lg font-bold text-blue-700">
                        {past.length}
                      </p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-600 font-medium mb-0.5">
                        重做队列
                      </p>
                      <p className="text-lg font-bold text-blue-700">
                        {future.length}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    撤销重做区域作为赛事运营的日常入口，每一步操作都记录在历史栈中，
                    随时可回溯到之前的标注草稿状态。
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary-500" />
                命中检测说明
              </h2>
              <span className="text-xs text-gray-400">月底或课前核对用</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`chip ${hitDetectionChipClass.hit}`}>
                    命中
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  点位状态标记为「已通过」时自动判定为命中。
                  表示雨水口巡检合格，符合赛事运营标准。
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`chip ${hitDetectionChipClass.miss}`}>
                    未命中
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  点位状态标记为「需整改」时自动判定为未命中。
                  表示需要进一步处理，列入整改清单。
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`chip ${hitDetectionChipClass.pending}`}>
                    待检测
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  点位状态为「待巡检」时为待检测。
                  后续更新状态后命中检测会同步刷新。
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="card overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-500" />
                雨水口明细
              </h2>
            </div>
            {inspection.drainPoints.length === 0 ? (
              <div className="p-12 text-center">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">暂无巡检点位数据</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        位置
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        巡检状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        命中检测
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        备注
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inspection.drainPoints.map((point) => (
                      <tr
                        key={point.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">
                            {point.address || '未命名点位'}
                          </p>
                          <p className="text-xs text-gray-400">
                            坐标 ({point.x.toFixed(1)}, {point.y.toFixed(1)})
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`chip ${statusChipClass[point.status]}`}>
                            {statusLabel[point.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`chip ${
                              hitDetectionChipClass[
                                point.hitDetection || 'pending'
                              ]
                            }`}
                          >
                            {hitDetectionLabel[point.hitDetection || 'pending']}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-gray-600 text-sm truncate">
                            {point.notes || (
                              <span className="text-gray-400 italic">—</span>
                            )}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Download className="w-5 h-5 text-primary-500" />
                导出报告
              </h2>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                导出内容与上方摘要完全一致
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleExport('pdf')}
                disabled={exporting !== null}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all group disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                  <FileText className="w-6 h-6 text-red-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">导出 PDF</p>
                  <p className="text-xs text-gray-500">
                    适合打印与正式归档
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleExport('excel')}
                disabled={exporting !== null}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all group disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <FileSpreadsheet className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">导出 Excel</p>
                  <p className="text-xs text-gray-500">
                    包含摘要与明细两个 Sheet
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleExport('json')}
                disabled={exporting !== null}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all group disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <FileJson className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">导出 JSON</p>
                  <p className="text-xs text-gray-500">
                    可重新导入继续补录
                  </p>
                </div>
              </button>
            </div>
            {exporting && (
              <p className="text-sm text-primary-600 mt-4 text-center">
                正在生成{exporting.toUpperCase()}文件...
              </p>
            )}
          </div>
        </section>

        <section className="mb-8">
          <div className="card p-6 bg-gradient-to-br from-primary-50 to-blue-50">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <X className="w-5 h-5 text-red-500" />
              常见问题 · 一致性校验
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700">
                  <span className="font-medium">导出一致性：</span>
                  所有导出格式（PDF / Excel / JSON）共用同一份{' '}
                  <code className="bg-white px-1.5 py-0.5 rounded text-xs">
                    buildExportReport
                  </code>{' '}
                  数据源，界面摘要与文件内容不会出现矛盾。
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700">
                  <span className="font-medium">状态一致性：</span>
                  命中检测完全由巡检状态推导（已通过→命中，需整改→未命中，待巡检→待检测），
                  不会出现手动改状态但命中检测没同步的情况。
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700">
                  <span className="font-medium">导入去重：</span>
                  重新导入 JSON 草稿时，按点位 ID 合并，同一件事不会出现两份结论。
                  已有的最新数据不会被旧数据覆盖。
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
