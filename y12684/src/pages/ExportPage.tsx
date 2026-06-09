import { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { formatDateTime, formatTimestamp, exceptionTypeLabels, paramRanges } from '../utils/constants';
import type { RunRecord, ExportConfig } from '../types';

function buildReportHtml(run: RunRecord, config: ExportConfig): string {
  const paramRows = Object.entries(run.params)
    .map(([k, v]) => {
      const meta = paramRanges[k];
      return `<tr><td class="px-3 py-2 border">${meta?.label ?? k}</td><td class="px-3 py-2 border font-mono">${v} ${meta?.unit ?? ''}</td></tr>`;
    })
    .join('');

  const exceptionRows = run.exceptions
    .map((e) => {
      const meta = exceptionTypeLabels[e.type];
      return `
        <div style="margin-bottom:16px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="background:${meta.color.includes('red') ? '#fee2e2' : meta.color.includes('orange') ? '#ffedd5' : '#fef3c7'};color:#78350f;padding:2px 8px;border-radius:999px;font-size:12px;">${meta.label}</span>
            <span style="font-weight:600;color:#1f2937;">${e.title}</span>
            <span style="margin-left:auto;font-size:12px;color:#6b7280;font-family:monospace;">${formatDateTime(e.timestamp)}</span>
          </div>
          <div style="font-size:13px;color:#374151;margin-bottom:4px;"><strong>说明：</strong>${e.description}</div>
          <div style="font-size:13px;color:#374151;margin-bottom:4px;"><strong>影响：</strong>${e.impact}</div>
          <div style="font-size:13px;color:#374151;"><strong>建议：</strong>${e.suggestion}</div>
        </div>`;
    })
    .join('');

  const logRows = run.logs
    .slice(0, 50)
    .map((l) => {
      const color = l.level === 'error' ? '#dc2626' : l.level === 'warn' ? '#d97706' : '#2563eb';
      return `<tr><td class="px-3 py-1 border font-mono text-xs">${formatDateTime(l.timestamp)}</td><td class="px-3 py-1 border text-xs" style="color:${color};">${l.level.toUpperCase()}</td><td class="px-3 py-1 border text-xs">${l.message}</td></tr>`;
    })
    .join('');

  const cameraLostExceptions = run.exceptions.filter((e) => e.type === 'camera_lost');
  const blockingReasonSection =
    cameraLostExceptions.length > 0
      ? `
      <section style="margin-top:24px;padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
        <h3 style="margin:0 0 8px;font-size:16px;color:#991b1b;">⚠ 运行拦截说明：相机视角丢失</h3>
        <p style="margin:0 0 8px;font-size:13px;color:#7f1d1d;line-height:1.6;">
          本次运行中检测到 <strong>${cameraLostExceptions.length}</strong> 次相机视角丢失事件。
          该异常会被系统自动标记为"需关注"，原因如下：
        </p>
        <ol style="margin:0 0 8px;padding-left:20px;font-size:13px;color:#7f1d1d;line-height:1.8;">
          <li>相机位置或目标变为无效值（NaN 或 Infinity），三维视图无法正确显示沙丘体素；</li>
          <li>基于无效视角渲染的截图和视角参数失去参考价值，不能作为工程依据；</li>
          <li>风蚀模拟的可视结果可能与实际计算状态不一致，影响演示和决策。</li>
        </ol>
        <p style="margin:0;font-size:13px;color:#7f1d1d;line-height:1.6;">
          <strong>处理建议：</strong>在三维演示页点击"恢复默认视角"或从预设视角中重新选择后，再导出正式报告。
        </p>
      </section>`
      : '';

  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>沙丘风蚀体素演示 - 运行报告</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif; color: #1f2937; padding: 24px; max-width: 900px; margin: 0 auto; line-height: 1.6; }
  h1 { color: #78350f; border-bottom: 2px solid #d97706; padding-bottom: 8px; }
  h2 { color: #78350f; margin-top: 28px; font-size: 18px; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; }
  .border { border: 1px solid #d1d5db; }
  th { background: #f5e6d3; padding: 8px 12px; text-align: left; font-size: 13px; }
  .summary-card { background: linear-gradient(135deg, #fef3c7, #fde68a); padding: 16px; border-radius: 8px; }
  .kv { display: inline-block; min-width: 140px; margin: 4px 12px 4px 0; font-size: 13px; }
  .kv strong { color: #78350f; }
</style></head><body>
<h1>沙丘风蚀体素演示 - 运行报告</h1>
<p style="color:#6b7280;font-size:12px;font-family:monospace;">报告编号：${run.id} · 生成时间：${formatDateTime(Date.now())}</p>

<section class="summary-card">
  <h2 style="margin-top:0;">运行摘要</h2>
  <div>
    <span class="kv"><strong>运行 ID：</strong>${run.id}</span>
    <span class="kv"><strong>开始时间：</strong>${formatDateTime(run.startTime)}</span>
    <span class="kv"><strong>结束时间：</strong>${run.endTime > 0 ? formatDateTime(run.endTime) : '运行中'}</span>
    <span class="kv"><strong>总异常数：</strong>${run.exceptions.length}</span>
    <span class="kv"><strong>待处理异常：</strong>${run.exceptions.filter((e) => e.status !== 'resolved').length}</span>
    <span class="kv"><strong>测量记录：</strong>${run.measurements.length}</span>
  </div>
</section>

${blockingReasonSection}

${config.includeParams ? `
<section>
  <h2>参数配置</h2>
  <table><thead><tr><th class="border">参数</th><th class="border">数值</th></tr></thead><tbody>${paramRows}</tbody></table>
  <p style="font-size:12px;color:#6b7280;margin-top:4px;">说明：参数间存在联动关系，详见参数配置页的联动面板。</p>
</section>` : ''}

${config.includeExceptions ? `
<section>
  <h2>异常汇总（${run.exceptions.length} 条）</h2>
  ${run.exceptions.length === 0 ? '<p style="color:#6b7280;">本次运行无异常记录。</p>' : exceptionRows}
</section>` : ''}

${config.includeLogs ? `
<section>
  <h2>操作日志（最近 50 条）</h2>
  <table><thead><tr><th class="border">时间</th><th class="border">级别</th><th class="border">内容</th></tr></thead><tbody>${logRows}</tbody></table>
</section>` : ''}

<hr style="margin-top:32px;border-color:#e5e7eb;" />
<p style="text-align:center;color:#9ca3af;font-size:12px;">本报告由沙丘风蚀体素演示系统自动生成，仅供规划设计与运维组参考。</p>
</body></html>`;
}

export default function ExportPage() {
  const runHistory = useAppStore((s) => s.runHistory);
  const currentRun = useAppStore((s) => s.currentRun);
  const exportRunData = useAppStore((s) => s.exportRunData);
  const [selectedId, setSelectedId] = useState<string | null>(runHistory[0]?.id ?? null);
  const [config, setConfig] = useState<ExportConfig>({
    includeScreenshots: true,
    includeParams: true,
    includeExceptions: true,
    includeLogs: true,
    format: 'html'
  });

  const allRuns = useMemo(() => {
    const list = [...runHistory];
    if (currentRun) list.unshift(currentRun);
    return list;
  }, [runHistory, currentRun]);

  const selectedRun = allRuns.find((r) => r.id === selectedId) ?? allRuns[0] ?? null;

  const getFileName = (run: RunRecord, fmt: string): string =>
    `dune_erosion_${formatTimestamp(run.startTime)}_${run.id.substring(0, 8)}.${fmt}`;

  const download = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExport = () => {
    if (!selectedRun) return;
    if (config.format === 'json') {
      const { fileName, content } = exportRunData(selectedRun.id);
      if (content) download(content, fileName, 'application/json');
    } else {
      const html = buildReportHtml(selectedRun, config);
      download(html, getFileName(selectedRun, 'html'), 'text/html;charset=utf-8');
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-sand-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-sand-800 mb-1">结果导出</h1>
          <p className="text-sm text-sand-600">
            导出报告按时间戳 + 运行 ID 命名，可清楚区分每次运行。导出内容包含异常原因、影响和处理建议，
            即使运维组只读报告，也能理解"相机视角丢失"等异常为何被标记为需关注。
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 历史版本 */}
          <div className="card lg:col-span-1">
            <h2 className="text-lg font-semibold text-sand-800 mb-3">运行历史</h2>
            <p className="text-xs text-sand-500 mb-3">
              文件名格式：<code className="bg-sand-100 px-1 rounded">dune_erosion_[时间戳]_[运行ID前8位].[格式]</code>
            </p>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {allRuns.length === 0 && (
                <div className="text-center py-8 text-sand-400 text-sm">
                  暂无运行记录。请先在三维演示页启动一次模拟。
                </div>
              )}
              {allRuns.map((r) => {
                const pending = r.exceptions.filter((e) => e.status !== 'resolved').length;
                const hasCameraLost = r.exceptions.some((e) => e.type === 'camera_lost');
                const isCurrent = currentRun?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`p-3 rounded-md border cursor-pointer transition ${
                      selectedId === r.id
                        ? 'border-amber bg-amber-50'
                        : 'border-sand-200 bg-white hover:border-sand-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-sand-600">
                        #{r.id.substring(0, 8)}
                      </span>
                      {isCurrent && (
                        <span className="badge bg-blue-100 text-blue-700 border border-blue-300 text-[10px]">
                          运行中
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-sand-800">
                      {formatDateTime(r.startTime)}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className={`badge text-[10px] border ${pending > 0 ? 'bg-red-50 text-red-700 border-red-300' : 'bg-green-50 text-green-700 border-green-300'}`}>
                        {pending > 0 ? `${pending} 条待处理异常` : '无待处理异常'}
                      </span>
                      {hasCameraLost && (
                        <span className="badge bg-red-100 text-red-800 border border-red-300 text-[10px]">
                          含视角丢失
                        </span>
                      )}
                      <span className="badge bg-sand-100 text-sand-700 border border-sand-300 text-[10px]">
                        {r.measurements.length} 条测量
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 预览与配置 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <h2 className="text-lg font-semibold text-sand-800 mb-3">导出配置</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {[
                  { key: 'includeParams', label: '包含参数详情' },
                  { key: 'includeExceptions', label: '包含异常说明' },
                  { key: 'includeLogs', label: '包含操作日志' },
                  { key: 'includeScreenshots', label: '包含截图占位' }
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 p-2 rounded border border-sand-200 bg-sand-50 cursor-pointer hover:bg-sand-100 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={(config as unknown as Record<string, boolean>)[key]}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, [key]: e.target.checked }))
                      }
                      className="w-4 h-4 text-amber"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-sand-600">格式：</span>
                  <select
                    value={config.format}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, format: e.target.value as ExportConfig['format'] }))
                    }
                    className="input py-1.5"
                  >
                    <option value="html">HTML 报告</option>
                    <option value="json">JSON 数据</option>
                  </select>
                </div>

                {selectedRun && (
                  <div className="text-sm text-sand-500">
                    <span>文件名将为：</span>
                    <code className="ml-1 bg-sand-100 px-1.5 py-0.5 rounded text-sand-800">
                      {getFileName(selectedRun, config.format)}
                    </code>
                  </div>
                )}

                <button
                  onClick={handleExport}
                  disabled={!selectedRun}
                  className="btn btn-primary ml-auto disabled:opacity-50"
                >
                  下载报告
                </button>
              </div>
            </div>

            {/* 报告预览：相机视角丢失拦截原因 */}
            {selectedRun && (
              <div className="card">
                <h2 className="text-lg font-semibold text-sand-800 mb-3">报告预览 · 异常拦截说明</h2>
                <p className="text-xs text-sand-500 mb-3">
                  以下内容将直接出现在导出报告中，确保运维组不使用系统也能理解异常为何被标记为需要关注。
                </p>

                {selectedRun.exceptions.filter((e) => e.type === 'camera_lost').length > 0 ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                      <span>⚠</span> 运行拦截说明：相机视角丢失
                    </h3>
                    <p className="text-sm text-red-700 leading-relaxed mb-2">
                      本次运行中检测到{' '}
                      <strong>{selectedRun.exceptions.filter((e) => e.type === 'camera_lost').length}</strong>{' '}
                      次相机视角丢失事件。该异常被系统自动标记为"需关注"，原因：
                    </p>
                    <ol className="text-sm text-red-700 list-decimal list-inside space-y-1 leading-relaxed">
                      <li>相机位置或目标变为无效值（NaN 或 Infinity），三维视图无法正确显示沙丘体素；</li>
                      <li>基于无效视角渲染的截图和视角参数失去参考价值，不能作为工程依据；</li>
                      <li>风蚀模拟的可视结果可能与实际计算状态不一致，影响演示和决策。</li>
                    </ol>
                    <p className="text-sm text-red-700 leading-relaxed mt-2">
                      <strong>处理建议：</strong>
                      在三维演示页点击"恢复默认视角"或从预设视角中重新选择后，再导出正式报告。
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="text-sm text-green-800">
                      ✓ 本次运行未检测到相机视角丢失，所有异常均已标记或无异常，报告可直接用于运维审核。
                    </div>
                  </div>
                )}

                {selectedRun.exceptions.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-sand-700 mb-2">异常明细（共 {selectedRun.exceptions.length} 条）</h3>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {selectedRun.exceptions.map((e) => {
                        const meta = exceptionTypeLabels[e.type];
                        return (
                          <div
                            key={e.id}
                            className="p-2.5 rounded border border-sand-200 bg-white text-xs"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`badge ${meta.color} border`}>{meta.label}</span>
                              <span className="font-medium text-sand-800">{e.title}</span>
                              <span className="ml-auto text-sand-400 font-mono">
                                {formatDateTime(e.timestamp)}
                              </span>
                            </div>
                            <div className="text-sand-600 mb-0.5">
                              <strong>说明：</strong>{e.description}
                            </div>
                            <div className="text-sand-600">
                              <strong>建议：</strong>{e.suggestion}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
