import { useState } from 'react';
import {
  X,
  Download,
  FileJson,
  FileText,
  Camera,
  Printer,
  History,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import {
  exportSamplesJson,
  exportHistoryJson,
  exportReportHtml,
  exportReportJson,
  buildReportSnapshot,
  captureElementScreenshot,
  triggerWindowPrint
} from '../utils/exporter';

type ExportStatus = { type: 'success' | 'error'; message: string; filename?: string } | null;

export function ExportPanel() {
  const {
    exportPanelVisible,
    samples,
    parameterSets,
    activeParamSetId,
    compareParamSetId,
    compareMode,
    selectedSampleId,
    currentResult,
    compareResult,
    history,
    operatorName,
    actions: { setExportPanelVisible, recordExport, setOperatorName }
  } = useAppStore();

  const [status, setStatus] = useState<ExportStatus>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [customName, setCustomName] = useState(operatorName);

  if (!exportPanelVisible) return null;

  const snapshot = buildReportSnapshot({
    samples,
    parameterSets,
    activeParamSetId,
    compareParamSetId,
    compareMode,
    selectedSampleId,
    result: currentResult,
    compareResult,
    history,
    operator: customName
  });

  const setOperator = (n: string) => {
    setCustomName(n);
    setOperatorName(n);
  };

  const doExport = async (label: string, fn: () => Promise<string> | string, id: string) => {
    if (busy) return;
    setBusy(id);
    setStatus(null);
    try {
      const filename = await fn();
      recordExport(`${label}：${filename}`);
      setStatus({ type: 'success', message: `${label}完成`, filename });
    } catch (e) {
      setStatus({ type: 'error', message: `${label}失败：${(e as Error).message || '未知错误'}` });
    } finally {
      setBusy(null);
    }
  };

  const captureMainArea = async () => {
    const el = document.querySelector('main') as HTMLElement | null;
    if (!el) throw new Error('未找到主内容区');
    return captureElementScreenshot(el);
  };

  const doPrint = () => {
    const fn = exportReportHtml(snapshot);
    recordExport(`打印报告：${fn}`);
    setTimeout(() => triggerWindowPrint(), 500);
    setStatus({ type: 'success', message: '报告已在新标签打开，请使用浏览器打印功能' });
  };

  const gapCount = samples.filter(s => s.type === 'gap').length;
  const boundaryCount = samples.filter(s => s.type === 'boundary').length;
  const normalCount = samples.length - gapCount - boundaryCount;

  const close = () => { setExportPanelVisible(false); setStatus(null); setBusy(null); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-scale-in flex flex-col">
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-cyan-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Download className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">导出复盘材料 / 生成报告</h2>
              <p className="text-xs text-slate-400">评审会前一键打包：样本、参数、归因、历史</p>
            </div>
          </div>
          <button
            onClick={close}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-4 gap-3">
            <StatCard icon={<Database className="w-4 h-4" />} label="样本总数" value={samples.length.toString()} accent="cyan" />
            <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="正常" value={normalCount.toString()} accent="emerald" />
            <StatCard icon={<AlertCircle className="w-4 h-4" />} label="边界" value={boundaryCount.toString()} accent="orange" />
            <StatCard icon={<AlertCircle className="w-4 h-4" />} label="缺口" value={gapCount.toString()} accent="yellow" />
          </div>

          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-200">当前快照概览</div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-24 bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500"
                  placeholder="操作人"
                />
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{snapshot.summary}</p>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span>参数组：<span className="text-cyan-300">{snapshot.activeParamSet.name} v{snapshot.activeParamSet.version}</span></span>
              {snapshot.compareMode && snapshot.compareParamSet && (
                <span>对照：<span className="text-violet-300">{snapshot.compareParamSet.name} v{snapshot.compareParamSet.version}</span></span>
              )}
              <span>历史记录：<span className="text-slate-300">{history.length} 条</span></span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-200">导出选项</div>
            <div className="grid grid-cols-2 gap-3">
              <ExportCard
                id="samples-json"
                busy={busy}
                icon={<FileJson className="w-5 h-5" />}
                title="样本 JSON"
                desc="包含所有样本 + 参数组配置，可再次导入"
                color="cyan"
                onClick={() => doExport(
                  '导出样本',
                  () => exportSamplesJson(samples, parameterSets),
                  'samples-json'
                )}
              />
              <ExportCard
                id="history-json"
                busy={busy}
                icon={<History className="w-5 h-5" />}
                title="历史记录 JSON"
                desc="变更时间线完整快照（含结果快照）"
                color="violet"
                onClick={() => doExport(
                  '导出历史记录',
                  () => exportHistoryJson(history),
                  'history-json'
                )}
              />
              <ExportCard
                id="report-html"
                busy={busy}
                icon={<FileText className="w-5 h-5" />}
                title="HTML 报告"
                desc="可打印/截图的完整归因报告"
                color="emerald"
                onClick={() => doExport(
                  '导出HTML报告',
                  () => exportReportHtml(snapshot),
                  'report-html'
                )}
              />
              <ExportCard
                id="report-json"
                busy={busy}
                icon={<FileJson className="w-5 h-5" />}
                title="报告快照 JSON"
                desc="完整 ReportSnapshot 对象存档"
                color="blue"
                onClick={() => doExport(
                  '导出报告快照',
                  () => exportReportJson(snapshot),
                  'report-json'
                )}
              />
              <ExportCard
                id="screenshot"
                busy={busy}
                icon={<Camera className="w-5 h-5" />}
                title="主内容区截图 (PNG)"
                desc="当前分析页主区域高清截图（2x）"
                color="pink"
                onClick={() => doExport('生成截图', captureMainArea, 'screenshot')}
              />
              <ExportCard
                id="print"
                busy={busy}
                icon={<Printer className="w-5 h-5" />}
                title="打印 / 存为PDF"
                desc="打开打印对话框，可导出PDF"
                color="amber"
                onClick={doPrint}
              />
            </div>
          </div>

          {status && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2 text-sm ${
                status.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-rose-500/10 border-rose-500/30'
              }`}
            >
              {status.type === 'success'
                ? <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${busy ? 'opacity-0' : 'text-emerald-400'}`} />
                : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
              }
              <div className="flex-1 min-w-0">
                <div className={status.type === 'success' ? 'text-emerald-300' : 'text-rose-300'}>
                  {status.message}
                </div>
                {status.filename && (
                  <div className={`text-xs mt-0.5 font-mono break-all ${
                    status.type === 'success' ? 'text-emerald-400/70' : 'text-rose-400/70'
                  }`}>
                    {status.filename}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 text-[11px] text-slate-400 leading-relaxed">
            <div className="font-medium text-slate-300 mb-1">评审会推荐操作</div>
            1. 先 <span className="text-cyan-300">导出 HTML 报告</span>（最完整，含样本表+误差分解+历史+参数）<br />
            2. 需要给微信群发快速结论时，用 <span className="text-pink-300">主内容区截图</span><br />
            3. 需要回传系统归档，用 <span className="text-emerald-300">报告快照 JSON</span>（可还原现场）<br />
            4. 所有导出操作都会进入变更历史，可在右侧时间线中看到操作人
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-700/50 bg-slate-800/30 flex justify-end">
          <button
            onClick={close}
            className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors text-sm font-medium"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

const ACCENT_COLORS: Record<string, string> = {
  cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-300 hover:border-cyan-400',
  emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-300 hover:border-emerald-400',
  violet: 'from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-300 hover:border-violet-400',
  orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-300 hover:border-orange-400',
  yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 text-yellow-300 hover:border-yellow-400',
  blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-300 hover:border-blue-400',
  pink: 'from-pink-500/20 to-pink-500/5 border-pink-500/30 text-pink-300 hover:border-pink-400',
  amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-300 hover:border-amber-400',
};

function StatCard({
  icon, label, value, accent
}: { icon: React.ReactNode; label: string; value: string; accent: keyof typeof ACCENT_COLORS }) {
  const color = ACCENT_COLORS[accent];
  const [fromTo, border, text] = color.split(' ');
  return (
    <div className={`rounded-lg p-3 bg-gradient-to-br ${fromTo} ${border} border`}>
      <div className={`flex items-center gap-1.5 text-[11px] ${text}`}>{icon}{label}</div>
      <div className={`mt-1 text-2xl font-bold font-mono ${text}`}>{value}</div>
    </div>
  );
}

function ExportCard({
  id, busy, icon, title, desc, color, onClick
}: {
  id: string;
  busy: string | null;
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: keyof typeof ACCENT_COLORS;
  onClick: () => void;
}) {
  const isBusy = busy === id;
  const anyBusy = !!busy && !isBusy;
  const colorClass = ACCENT_COLORS[color];
  const [fromTo, border, text] = colorClass.split(' ');
  return (
    <button
      onClick={onClick}
      disabled={anyBusy}
      className={`
        group p-4 rounded-xl border text-left bg-gradient-to-br ${fromTo} ${border}
        transition-all duration-200 flex items-start gap-3
        ${anyBusy ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01] hover:shadow-lg'}
      `}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-900/40 ${text}`}>
        {isBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${text}`}>{title}</div>
        <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </button>
  );
}
