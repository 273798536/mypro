import { X, Download, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  generateReportContent,
  generateReportFilename,
  downloadReport,
} from '@/utils/reportGenerator';
import { reviewStatusColor, reviewStatusLabel } from '@/utils/validation';
import { formatTimestamp, nowIso } from '@/utils/timestamp';

export const ExportDialog = () => {
  const {
    showExportDialog,
    setShowExportDialog,
    records,
    savedViewpoints,
    reviewState,
    currentRun,
  } = useAppStore();

  if (!showExportDialog) return null;

  const filename = generateReportFilename(currentRun);
  const generatedAt = nowIso();

  const normal = records.filter((r) => r.status === 'normal').length;
  const pending = records.filter((r) => r.status === 'pending').length;
  const invalid = records.filter((r) => r.status === 'invalid').length;
  const blocking = records.flatMap((r) =>
    r.validationIssues.filter((v) => v.severity === 'error'),
  );

  const handleExport = () => {
    const content = generateReportContent({
      records,
      viewpoints: savedViewpoints,
      reviewState,
      currentRun,
      generatedAt,
    });
    downloadReport(filename, content);
    setShowExportDialog(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[520px] rounded-2xl border border-slate-700/60 bg-[#0B1026] shadow-[0_0_60px_rgba(34,211,238,0.1)]">
        <div className="flex items-center justify-between border-b border-slate-700/50 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-violet-500/20 border border-cyan-400/30">
              <FileText className="h-4.5 w-4.5 text-cyan-300" />
            </div>
            <div>
              <h2
                className="text-sm font-bold text-slate-100"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                导出复核报告
              </h2>
              <p className="text-[10px] text-slate-500">
                生成带运行标识的 Markdown 格式报告
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowExportDialog(false)}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-lg border border-slate-700/50 bg-[#0F172A]/60 p-3.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              输出文件名
            </div>
            <div
              className="mt-1 rounded-md bg-[#050814] px-3 py-2 font-mono text-[12px] text-cyan-300"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {filename}
            </div>
            <p className="mt-1.5 text-[10px] text-slate-500">
              文件名包含运行标识和时间戳，可区分本次与上次运行结果。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-slate-700/50 bg-[#0F172A]/60 p-3">
              <div className="text-[10px] text-slate-500">运行标识</div>
              <div
                className="mt-0.5 font-mono text-[11px] font-bold text-slate-200"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {currentRun.id}
              </div>
            </div>
            <div className="rounded-lg border border-slate-700/50 bg-[#0F172A]/60 p-3">
              <div className="text-[10px] text-slate-500">报告生成时间</div>
              <div
                className="mt-0.5 font-mono text-[11px] text-slate-300"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatTimestamp(generatedAt)}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700/50 bg-[#0F172A]/60 p-3.5">
            <div className="mb-2.5 text-[10px] uppercase tracking-wider text-slate-500">
              内容清单
            </div>
            <div className="space-y-2">
              {[
                { label: `数据概览（共 ${records.length} 条记录）`, done: true },
                { label: `顺利记录 ${normal} 条`, done: true, color: '#34D399' },
                { label: `待确认记录 ${pending} 条`, done: true, color: '#A78BFA' },
                { label: `坏数据 ${invalid} 条（已标记拦截）`, done: true, color: '#F87171' },
                {
                  label: `已保存视角截图 ${savedViewpoints.length} 张`,
                  done: true,
                },
                {
                  label: '坐标系混用拦截说明（自解释）',
                  done: blocking.length > 0,
                  badge: blocking.length > 0 ? `${blocking.length} 项` : '无',
                  badgeColor: blocking.length > 0 ? '#F87171' : '#64748B',
                },
                { label: '每条记录明细与参数', done: true },
                { label: '风险备注与复核结论', done: true },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {item.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-slate-600" />
                  )}
                  <span
                    className="text-[11px] text-slate-300"
                    style={{ color: item.color ?? undefined }}
                  >
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      className="ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold"
                      style={{
                        backgroundColor: `${item.badgeColor ?? '#64748B'}22`,
                        color: item.badgeColor ?? '#64748B',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {blocking.length > 0 && (
            <div className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/5 p-3.5">
              <div className="mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-[#F87171]" />
                <span
                  className="text-[10.5px] font-bold text-[#F87171]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  坐标系拦截说明（甲方仅读报告也可理解）
                </span>
              </div>
              <p className="text-[10.5px] leading-relaxed text-slate-400">
                报告第 3 节将详细解释每一项拦截原因，包括 Native 空间未标准化、
                Talairach/MNI 混用等场景对组分析的具体影响（配准错误、图谱不匹配、纵向对比失效）。
              </p>
            </div>
          )}

          <div className="rounded-lg border border-slate-700/50 bg-[#0F172A]/60 p-3.5">
            <div className="mb-2.5 text-[10px] uppercase tracking-wider text-slate-500">
              复核状态
            </div>
            <div className="flex gap-1.5">
              {(['timeParamsConsistent', 'screenshotChecklistComplete', 'timelineSynchronized'] as const).map(
                (key) => {
                  const labels: Record<string, string> = {
                    timeParamsConsistent: '时间参数',
                    screenshotChecklistComplete: '截图清单',
                    timelineSynchronized: '时间轴',
                  };
                  const status = reviewState[key];
                  return (
                    <div
                      key={key}
                      className="flex-1 rounded-md border border-slate-700/40 bg-[#050814] px-2 py-1.5 text-center"
                    >
                      <div className="text-[9px] text-slate-500">{labels[key]}</div>
                      <div
                        className="mt-0.5 text-[10px] font-bold"
                        style={{
                          color: reviewStatusColor[status],
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {reviewStatusLabel[status]}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-700/50 px-5 py-3.5">
          <button
            onClick={() => setShowExportDialog(false)}
            className="rounded-md border border-slate-700/60 bg-transparent px-4 py-2 text-[11px] font-medium text-slate-300 transition-colors hover:bg-slate-800"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            取消
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-[11px] font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <Download className="h-3.5 w-3.5" />
            下载报告
          </button>
        </div>
      </div>
    </div>
  );
};
