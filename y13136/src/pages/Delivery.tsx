import { useState } from 'react';
import { Download, FileText, Clock, Table, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { useVerificationStore } from '@/store/useVerificationStore';
import { formatDateTime, formatNumber } from '@/utils/common';
import { exportToCSV, exportDeliveryPackage } from '@/utils/csv';
import type { VerificationRecord } from '@/types';

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded border border-slate-700/50 bg-slate-800/20 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{icon}</span>
          <span className="text-sm font-medium text-slate-200">{title}</span>
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-500" strokeWidth={1.8} />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500" strokeWidth={1.8} />
        )}
      </button>
      {open && <div className="border-t border-slate-700/30">{children}</div>}
    </div>
  );
}

export default function Delivery() {
  const { versions, currentVersionId } = useVerificationStore();
  const [selectedId, setSelectedId] = useState<string>(currentVersionId || versions[0]?.id || '');

  const selectedVersion = versions.find((v) => v.id === selectedId);

  const handleExportCSV = () => {
    if (!selectedVersion) return;
    const dateStr = new Date(selectedVersion.createdAt).toISOString().slice(0, 10);
    exportToCSV(selectedVersion.verificationResults, `交付_${selectedVersion.version}_${dateStr}.csv`);
  };

  const handleExportPackage = () => {
    if (!selectedVersion) return;
    const dateStr = new Date(selectedVersion.createdAt).toISOString().slice(0, 10);
    exportDeliveryPackage(selectedVersion, `交付包_${selectedVersion.version}_${dateStr}.json`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-16 flex-shrink-0 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-100">交付视图</h2>
          <p className="text-xs text-slate-500">参数表 + 处理记录 + CSV明细，一站式交付</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!selectedVersion}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileText className="w-3.5 h-3.5" strokeWidth={1.8} />
            导出 CSV
          </button>
          <button
            onClick={handleExportPackage}
            disabled={!selectedVersion}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Package className="w-3.5 h-3.5" strokeWidth={1.8} />
            导出完整交付包
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400">选择交付版本：</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="px-3 py-1.5 text-sm rounded border border-slate-700 bg-slate-800 text-slate-200 focus:outline-none focus:border-amber-500/50 min-w-[300px]"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.version} — {v.description}
              </option>
            ))}
          </select>
        </div>

        {selectedVersion && (
          <>
            <Section title="参数表（原始数据）" icon={<Table className="w-4 h-4" strokeWidth={1.8} />}>
              <div className="p-4">
                <div className="text-xs text-slate-400 mb-3">
                  来源文件：<span className="font-mono text-slate-300">{selectedVersion.rawRecords[0]?.sourceFile || '未知'}</span>
                  <span className="mx-2 text-slate-700">|</span>
                  共 <span className="font-mono text-slate-300">{selectedVersion.rawRecords.length}</span> 条记录
                  <span className="mx-2 text-slate-700">|</span>
                  保留原始值，未做清洗
                </div>
                <div className="overflow-x-auto max-h-64 overflow-y-auto rounded border border-slate-700/40">
                  <table className="w-full text-xs table-fixed-header">
                    <thead>
                      <tr className="bg-slate-800 text-slate-400">
                        <th className="px-3 py-2 text-left font-medium w-12">#</th>
                        <th className="px-3 py-2 text-left font-medium">状态</th>
                        <th className="px-3 py-2 text-right font-medium">原始权重</th>
                        <th className="px-3 py-2 text-right font-medium">原始概率</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {selectedVersion.rawRecords.map((r, idx) => (
                        <tr key={r.id} className="hover:bg-slate-800/30">
                          <td className="px-3 py-1.5 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="px-3 py-1.5 text-slate-300">{r.rawData.state || r.rawData['状态'] || '-'}</td>
                          <td className="px-3 py-1.5 text-right text-amber-400 font-mono">{r.rawData.weight || r.rawData['权重'] || '-'}</td>
                          <td className="px-3 py-1.5 text-right text-amber-400 font-mono">{r.rawData.probability || r.rawData['转移概率'] || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>

            <Section title="处理记录" icon={<Clock className="w-4 h-4" strokeWidth={1.8} />}>
              <div className="p-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded bg-slate-800/30 border border-slate-700/40">
                      <div className="text-xs text-slate-500">版本号</div>
                      <div className="text-lg font-mono text-slate-200 mt-1">{selectedVersion.version}</div>
                    </div>
                    <div className="p-3 rounded bg-slate-800/30 border border-slate-700/40">
                      <div className="text-xs text-slate-500">操作人</div>
                      <div className="text-lg text-slate-200 mt-1">{selectedVersion.operatorName}</div>
                    </div>
                    <div className="p-3 rounded bg-slate-800/30 border border-slate-700/40">
                      <div className="text-xs text-slate-500">创建时间</div>
                      <div className="text-sm font-mono text-slate-200 mt-1">
                        {formatDateTime(selectedVersion.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded bg-slate-800/30 border border-slate-700/40">
                    <div className="text-xs text-slate-500 mb-1">变更说明</div>
                    <div className="text-sm text-slate-300">{selectedVersion.description}</div>
                  </div>

                  {selectedVersion.changes.length > 0 && (
                    <div>
                      <div className="text-xs text-slate-500 mb-2">变更明细</div>
                      <div className="space-y-1.5">
                        {selectedVersion.changes.map((c, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-2 text-xs rounded bg-slate-800/30 border border-slate-700/30"
                          >
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] ${
                                c.changeType === 'weight'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                  : c.changeType === 'parameter'
                                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {c.changeType === 'weight' ? '权重' : c.changeType === 'parameter' ? '参数' : '判断'}
                            </span>
                            <span className="text-slate-300 font-mono">{c.field}</span>
                            <span className="text-rose-400 font-mono">{String(c.oldValue) || '(空)'}</span>
                            <span className="text-slate-600">→</span>
                            <span className="text-emerald-400 font-mono">{String(c.newValue) || '(空)'}</span>
                            {c.reason && <span className="text-slate-500 ml-auto">原因：{c.reason}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Section>

            <Section title="CSV 明细（校验结果）" icon={<FileText className="w-4 h-4" strokeWidth={1.8} />}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-slate-400">
                    共 <span className="font-mono text-slate-300">{selectedVersion.verificationResults.length}</span> 条校验结果
                    <span className="mx-2 text-slate-700">|</span>
                    含除零来源标记、单位换算、解析/计算错误
                  </div>
                  <button
                    onClick={handleExportCSV}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" strokeWidth={1.8} />
                    下载 CSV
                  </button>
                </div>
                <div className="overflow-x-auto max-h-64 overflow-y-auto rounded border border-slate-700/40">
                  <table className="w-full text-xs table-fixed-header">
                    <thead>
                      <tr className="bg-slate-800 text-slate-400">
                        <th className="px-3 py-2 text-left font-medium">状态</th>
                        <th className="px-3 py-2 text-center font-medium w-16">单位</th>
                        <th className="px-3 py-2 text-right font-medium w-20">权重</th>
                        <th className="px-3 py-2 text-right font-medium w-20">转移概率</th>
                        <th className="px-3 py-2 text-right font-medium w-20">行和</th>
                        <th className="px-3 py-2 text-center font-medium w-28">除零来源</th>
                        <th className="px-3 py-2 text-center font-medium w-16">边界</th>
                        <th className="px-3 py-2 text-center font-medium w-16">错误</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {selectedVersion.verificationResults.map((r) => {
                        const rowSum = r.weight + r.transitionProbability;
                        const unitConvs = r.unitConversions || [];
                        const zeroSrcs = r.zeroDivisionSources || [];
                        const hasErr = !!r.parseError || !!r.computeError;
                        return (
                          <tr key={r.id} className={`${r.isZeroDivision ? 'bg-amber-500/5' : hasErr ? 'bg-rose-500/5' : 'hover:bg-slate-800/30'}`}>
                            <td className="px-3 py-1.5 text-slate-300">{r.stateName}</td>
                            <td className="px-3 py-1.5 text-center">
                              {unitConvs.length > 0 ? (
                                <div
                                  className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-violet-500/10 text-violet-300 border border-violet-500/30"
                                  title={unitConvs.map((u) => `${u.appliedField === 'weight' ? '权重' : '概率'}: ${u.valueBefore}${u.fromUnit}→${formatNumber(u.valueAfter)} (×${u.factor})`).join('\n')}
                                >
                                  {unitConvs.length}×
                                </div>
                              ) : (
                                <span className="text-slate-600 text-[10px]">—</span>
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-300">
                              {isNaN(r.weight) ? 'N/A' : formatNumber(r.weight, 4)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-300">
                              {isNaN(r.transitionProbability) ? 'N/A' : formatNumber(r.transitionProbability, 4)}
                            </td>
                            <td className={`px-3 py-1.5 text-right font-mono ${
                              r.boundaryStatus === 'normal' ? 'text-emerald-400' :
                              r.boundaryStatus === 'boundary' ? 'text-amber-400' : 'text-rose-400'
                            }`}>
                              {isNaN(rowSum) ? 'N/A' : formatNumber(rowSum, 4)}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              {zeroSrcs.length > 0 ? (
                                <div
                                  className="inline-flex flex-wrap gap-0.5 justify-center"
                                  title={zeroSrcs.map((s) => s).join('\n')}
                                >
                                  {zeroSrcs.slice(0, 2).map((s, i) => {
                                    const label = s === 'weight_raw_zero' ? 'W=0'
                                      : s === 'probability_raw_zero' ? 'P=0'
                                      : s === 'transition_count_sum' ? 'ΣCnt'
                                      : s === 'steady_state_denominator' ? '1-W'
                                      : s === 'weight_normalize_sum' ? 'ΣW' : s;
                                    return (
                                      <span
                                        key={i}
                                        className="px-1 py-0.5 rounded text-[9px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30"
                                      >
                                        {label}
                                      </span>
                                    );
                                  })}
                                  {zeroSrcs.length > 2 && (
                                    <span className="text-[9px] text-amber-400">+{zeroSrcs.length - 2}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-600 text-[10px]">—</span>
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <span className={`text-[10px] ${
                                r.boundaryStatus === 'normal' ? 'text-emerald-400' :
                                r.boundaryStatus === 'boundary' ? 'text-amber-400' : 'text-rose-400'
                              }`}>
                                {r.boundaryStatus === 'normal' ? '正常' : r.boundaryStatus === 'boundary' ? '边界' : '异常'}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              {hasErr ? (
                                <div
                                  className="text-[10px]"
                                  title={[r.parseError && `解析: ${r.parseError}`, r.computeError && `计算: ${r.computeError}`].filter(Boolean).join('\n')}
                                >
                                  {r.parseError && <span className="text-rose-400 mr-0.5" title={r.parseError}>解</span>}
                                  {r.computeError && <span className="text-orange-400" title={r.computeError}>算</span>}
                                </div>
                              ) : (
                                <span className="text-slate-600 text-[10px]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>
          </>
        )}

        {!selectedVersion && (
          <div className="py-16 text-center text-sm text-slate-500">暂无版本可交付</div>
        )}
      </div>
    </div>
  );
}
