import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  FileText,
  Table2,
  CheckCircle2,
  AlertOctagon,
  FileSpreadsheet,
  File as FileIcon,
  RefreshCw,
  Quote,
  Music,
  ChevronDown,
  ChevronUp,
  Eye,
  Send,
  Image,
  Target,
} from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { useReviewStore } from '../store/reviewStore';
import {
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  VOICE_LABELS,
  VOICE_COLORS,
  VoiceType,
} from '../types';
import { formatSeconds } from '../data/mockData';

export default function ExportPage() {
  const batches = useReviewStore((s) => s.batches);
  const activeBatchId = useReviewStore((s) => s.activeBatchId);
  const runConsistencyCheck = useReviewStore((s) => s.runConsistencyCheck);
  const consistencyChecks = useReviewStore((s) => s.consistencyChecks);
  const selectException = useReviewStore((s) => s.selectException);
  const openDrawer = useReviewStore((s) => s.openDrawer);

  const [exportOptions, setExportOptions] = useState({
    exceptions: true,
    historySummary: true,
    calcCriteria: true,
    screenshots: false,
  });
  const [showDiff, setShowDiff] = useState(false);
  const [expandedEx, setExpandedEx] = useState<Record<string, boolean>>({});

  const batch = batches.find((b) => b.id === activeBatchId);
  const check = activeBatchId ? consistencyChecks[activeBatchId] : undefined;

  useEffect(() => {
    if (activeBatchId && !check) {
      runConsistencyCheck(activeBatchId);
    }
  }, [activeBatchId, check, runConsistencyCheck]);

  const sortedExceptions = useMemo(() => {
    if (!batch) return [];
    return [...batch.exceptions].sort((a, b) => {
      const rank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
      if (rank[a.severity] !== rank[b.severity]) return rank[a.severity] - rank[b.severity];
      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
      return 0;
    });
  }, [batch]);

  const historySummary = useMemo(() => {
    if (!batch) return [];
    const notes: Array<{ song: string; content: string; author: string; time: string }> = [];
    batch.songs.forEach((s) => {
      s.history.forEach((h) => {
        if (h.noteContent) {
          notes.push({ song: s.name, content: h.noteContent, author: h.operator, time: h.timestamp });
        }
      });
    });
    return notes.slice(-12);
  }, [batch]);

  if (!batch) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-ink-500">请先选择一个复核批次</p>
      </div>
    );
  }

  const toggleExpand = (id: string) =>
    setExpandedEx((prev) => ({ ...prev, [id]: !prev[id] }));

  const exportPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 50;
    let y = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Choir Review Summary', margin, y);
    y += 30;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Batch: ${batch.name}`, margin, y); y += 16;
    doc.text(`Folder: ${batch.folderPath}`, margin, y); y += 16;
    doc.text(`Generated: ${new Date().toLocaleString('zh-CN')}`, margin, y); y += 28;

    if (exportOptions.calcCriteria) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('Calculation Criteria', margin, y); y += 20;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      [
        `Algorithm Version: ${batch.calcCriteria.algorithmVersion}`,
        `Energy Threshold: ${batch.calcCriteria.energyThreshold.toFixed(2)}`,
        `Freq Deviation: ${batch.calcCriteria.frequencyDeviation} cents`,
        `Baseline Date: ${batch.calcCriteria.baselineDate}`,
        `Diff vs Prev: ${batch.calcCriteria.diffFromPrevious}`,
      ].forEach((l) => { doc.text(l, margin + 8, y); y += 14; });
      y += 12;
    }

    if (exportOptions.exceptions) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(`Exception List (${sortedExceptions.length} items)`, margin, y); y += 20;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      sortedExceptions.slice(0, 22).forEach((e, i) => {
        const song = batch.songs.find((s) => s.id === e.songId);
        const line = `${i + 1}. [${SEVERITY_LABELS[e.severity]}] ${song?.name} - ${e.humanReason}`;
        const parts = doc.splitTextToSize(line, 495);
        doc.text(parts, margin + 8, y);
        y += parts.length * 12 + 2;
        if (y > 780) { doc.addPage(); y = margin; }
      });
    }

    if (exportOptions.historySummary && historySummary.length > 0) {
      if (y > 680) { doc.addPage(); y = margin; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(`Notes History Summary (${historySummary.length} items)`, margin, y); y += 20;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      historySummary.slice(0, 15).forEach((n, i) => {
        const line = `${i + 1}. ${n.song} - ${n.author}@${n.time.slice(5, 16)}: "${n.content}"`;
        const parts = doc.splitTextToSize(line, 495);
        doc.text(parts, margin + 8, y);
        y += parts.length * 12 + 2;
        if (y > 780) { doc.addPage(); y = margin; }
      });
    }
    doc.save(`review-${batch.id}-summary.pdf`);
  };

  const exportXLSX = () => {
    const wb = XLSX.utils.book_new();
    if (exportOptions.exceptions) {
      const rows = sortedExceptions.map((e, i) => {
        const song = batch.songs.find((s) => s.id === e.songId);
        const vt = song?.voiceTracks.find((v) => v.id === e.voiceTrackId)?.voiceType;
        return {
          No: i + 1,
          Severity: SEVERITY_LABELS[e.severity],
          Song: song?.name,
          Voice: vt ? VOICE_LABELS[vt as VoiceType] : '',
          Time: formatSeconds(e.timePosition),
          Metric: e.metric,
          Deviation: e.deviation,
          'Human Reason': e.humanReason,
          'Possible Cause': e.possibleCause,
          Reference: e.referenceVersion,
          'File Path': e.relatedFilePath,
          Resolved: e.resolved ? 'Yes' : 'No',
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Exceptions');
    }
    if (exportOptions.historySummary) {
      const ws = XLSX.utils.json_to_sheet(
        historySummary.map((n, i) => ({
          No: i + 1, Song: n.song, Author: n.author,
          Time: n.time, Note: n.content,
        }))
      );
      XLSX.utils.book_append_sheet(wb, ws, 'Notes');
    }
    if (exportOptions.calcCriteria) {
      const ws = XLSX.utils.json_to_sheet([{
        'Algorithm Version': batch.calcCriteria.algorithmVersion,
        'Energy Threshold': batch.calcCriteria.energyThreshold,
        'Frequency Deviation (cents)': batch.calcCriteria.frequencyDeviation,
        'Baseline Date': batch.calcCriteria.baselineDate,
        'Diff From Previous': batch.calcCriteria.diffFromPrevious,
      }]);
      XLSX.utils.book_append_sheet(wb, ws, 'Criteria');
    }
    XLSX.writeFile(wb, `review-${batch.id}-summary.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* 一致性校验条 */}
      <div
        className={`rounded-2xl border-2 p-5 transition-all ${
          check?.passed
            ? 'border-forest-300 bg-gradient-to-r from-forest-50 to-emerald-50'
            : 'border-copper-300 bg-gradient-to-r from-copper-50 to-yellow-50'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-xl ${
              check?.passed ? 'bg-forest-500/15' : 'bg-copper-500/15 animate-pulseRing'
            }`}
          >
            {check?.passed ? (
              <CheckCircle2 size={24} className="text-forest-600" />
            ) : (
              <AlertOctagon size={24} className="text-copper-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-serif text-lg font-bold text-ink-900">
                  {check?.passed
                    ? '页面状态与文件记录完全一致'
                    : `发现 ${check?.mismatches.length ?? 0} 处状态不一致，导出前请确认`}
                </h3>
                <p className="text-sm text-ink-600 mt-0.5">
                  {check?.passed
                    ? '页面上看到的"已完成""已处理"等状态与文件系统中实际记录完全吻合，可以放心导出交付给演出/发行同事'
                    : '导出前系统对"页面显示值"和"文件实际值"做了对比，差异项展开可见'}
                  <span className="ml-3 text-xs text-ink-500">
                    校验时间：{check?.checkedAt}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {check && !check.passed && (
                  <button
                    onClick={() => setShowDiff((v) => !v)}
                    className="btn-secondary !py-2 !px-4 !text-xs"
                  >
                    {showDiff ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {showDiff ? '收起差异' : '展开差异项'}
                  </button>
                )}
                <button
                  onClick={() => runConsistencyCheck(activeBatchId!)}
                  className="btn-ghost !py-2 !px-3 !text-xs"
                >
                  <RefreshCw size={14} /> 重新校验
                </button>
              </div>
            </div>
            {check && !check.passed && showDiff && (
              <div className="mt-4 space-y-2">
                {check.mismatches.map((m, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-12 gap-3 p-3 rounded-xl bg-white/80 border border-copper-200 text-xs"
                  >
                    <div className="col-span-3 flex items-center gap-2 font-medium text-ink-800">
                      <Target size={12} className="text-copper-500" />
                      {m.field}
                    </div>
                    <div className="col-span-4 p-2 rounded-lg bg-forest-50 border border-forest-200">
                      <p className="text-[10px] text-forest-600 mb-0.5">👀 页面显示值</p>
                      <p className="font-medium text-ink-900">{m.displayValue}</p>
                    </div>
                    <div className="col-span-1 flex items-center justify-center text-copper-500">≠</div>
                    <div className="col-span-4 p-2 rounded-lg bg-copper-50 border border-copper-200">
                      <p className="text-[10px] text-copper-700 mb-0.5">📁 文件实际值</p>
                      <p className="font-medium text-ink-900">{m.fileValue}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 人化异常清单 */}
      <div className="page-card">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h3 className="section-title mb-0">
              <Quote size={18} className="text-copper-500" />
              人话异常清单 · 给演出/发行同事看的
            </h3>
            <p className="text-[11px] text-ink-500 mt-1 ml-7">
              每条异常都用自然语言描述，不是技术参数。点击卡片可查看详情回溯
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`tag ${STATUS_COLORS[batch.status]}`}>
              {STATUS_LABELS[batch.status]}
            </span>
            <span className="text-xs text-ink-500">
              共 {sortedExceptions.length} 条 ·{' '}
              {sortedExceptions.filter((e) => e.resolved).length} 已处理
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {sortedExceptions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-2">🎶</div>
              <p className="font-serif text-ink-700">本批次零异常，完美～</p>
            </div>
          ) : (
            sortedExceptions.map((e, i) => {
              const song = batch.songs.find((s) => s.id === e.songId);
              const vt = song?.voiceTracks.find((v) => v.id === e.voiceTrackId)?.voiceType;
              const expanded = expandedEx[e.id];
              return (
                <button
                  key={e.id}
                  onClick={() => toggleExpand(e.id)}
                  className={`w-full text-left rounded-xl border transition-all group ${
                    e.resolved
                      ? 'bg-forest-50/30 border-forest-100 opacity-80'
                      : 'bg-white/80 border-ink-100 hover:border-copper-200 hover:shadow-md'
                  }`}
                >
                  <div className="p-4 flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-serif font-bold ${
                        e.resolved
                          ? 'bg-forest-100 text-forest-700'
                          : 'bg-gradient-to-br from-copper-100 to-yellow-50 text-copper-700'
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap mb-1.5">
                        <span
                          className={`tag ${SEVERITY_COLORS[e.severity]} !text-[10px]`}
                        >
                          {SEVERITY_LABELS[e.severity]}
                        </span>
                        <span className="tag bg-ink-50 text-ink-600 border-ink-200 !text-[10px]">
                          《{song?.name}》
                        </span>
                        {vt && (
                          <span
                            className="tag !text-[10px] text-white border-0"
                            style={{ backgroundColor: VOICE_COLORS[vt] }}
                          >
                            {VOICE_LABELS[vt]}
                          </span>
                        )}
                        {e.resolved && (
                          <span className="tag bg-forest-50 text-forest-700 border-forest-200 !text-[10px]">
                            ✓ 已处理
                          </span>
                        )}
                      </div>
                      <blockquote className="font-serif text-ink-800 leading-relaxed text-sm italic border-l-4 border-copper-300 pl-3 py-0.5">
                        "{e.humanReason}"
                      </blockquote>
                      <div className="mt-2 flex items-center gap-3 flex-wrap text-[11px] text-ink-500">
                        <span>⏱ {formatSeconds(e.timePosition)}</span>
                        <span>·</span>
                        <span>
                          📁 <span className="font-mono">{e.relatedFilePath.slice(-42)}</span>
                        </span>
                        <span className="ml-auto flex items-center gap-1 text-forest-600 opacity-0 group-hover:opacity-100 transition-all">
                          <Eye size={12} /> {expanded ? '收起详情' : '查看详情'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {expanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-ink-100/60 ml-14 mr-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
                        {[
                          { k: '指标异常', v: `${e.metric} ${e.deviation}` },
                          { k: '可能原因', v: e.possibleCause },
                          { k: '参考版本', v: e.referenceVersion },
                          { k: '算法口径', v: batch.calcCriteria.algorithmVersion },
                        ].map((x) => (
                          <div key={x.k} className="p-3 rounded-xl bg-ink-50 border border-ink-100">
                            <p className="text-ink-500 text-[10px] mb-1">{x.k}</p>
                            <p className="font-medium text-ink-800 leading-snug">{x.v}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            selectException(e.id);
                            openDrawer('exception');
                          }}
                          className="btn-secondary !py-2 !px-3 !text-xs"
                        >
                          <Eye size={12} /> 打开完整回溯面板
                        </button>
                      </div>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 历史备注摘要 */}
      {historySummary.length > 0 && (
        <div className="page-card">
          <h3 className="section-title">
            <Music size={18} className="text-forest-500" />
            历史备注摘要（来自音频文件夹的老师留言）
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {historySummary.map((n, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-gradient-to-br from-copper-50/70 to-transparent border border-copper-100"
              >
                <div className="flex items-center gap-2 mb-2 text-[11px] text-ink-500">
                  <span className="font-medium text-forest-700">《{n.song}》</span>
                  <span>·</span>
                  <span>{n.author}</span>
                  <span>·</span>
                  <span>{n.time.slice(5, 16)}</span>
                </div>
                <p className="font-serif text-sm text-ink-800 italic leading-relaxed">
                  "{n.content}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 导出面板 */}
      <div className="page-card !bg-gradient-to-br !from-ink-50/80 !to-white">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="flex-1 min-w-[280px]">
            <h3 className="section-title mb-1">
              <Download size={18} className="text-forest-500" />
              一键导出交接摘要
            </h3>
            <p className="text-sm text-ink-600 mb-4 leading-relaxed">
              把当前批次的复核结果打包成文件，阿蓝拿去给演出或发行同事交接。
              建议导出 PDF（给人看）和 Excel（给系统导入）各一份。
            </p>
            <div className="space-y-2 mb-5">
              <p className="text-[11px] text-ink-500 uppercase tracking-wider mb-2">
                选择导出内容
              </p>
              {[
                { k: 'exceptions', l: '异常清单（含人话原因）', ico: FileText },
                { k: 'historySummary', l: '老师备注与历史摘要', ico: Quote },
                { k: 'calcCriteria', l: '本次计算口径说明', ico: Target },
                { k: 'screenshots', l: '历史截图附件（PDF 模式嵌入）', ico: Image },
              ].map((x) => {
                const Ico = x.ico;
                const checked = (exportOptions as any)[x.k];
                return (
                  <label
                    key={x.k}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/60 transition-all cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(ev) =>
                        setExportOptions((p) => ({ ...p, [x.k]: ev.target.checked }))
                      }
                      className="w-4 h-4 rounded-md border-ink-300 text-forest-500 focus:ring-forest-300"
                    />
                    <Ico size={15} className="text-ink-500 shrink-0" />
                    <span className="text-sm text-ink-700">{x.l}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={exportPDF}
                disabled={!check?.passed}
                className="btn-primary !py-3 !px-5"
              >
                <FileIcon size={16} /> 导出 PDF
              </button>
              <button onClick={exportXLSX} className="btn-secondary !py-3 !px-5">
                <FileSpreadsheet size={16} /> 导出 Excel
              </button>
              {!check?.passed && (
                <span className="text-xs text-copper-700 flex items-center gap-1">
                  <AlertOctagon size={12} /> 状态不一致，建议先处理差异项再导出 PDF
                </span>
              )}
            </div>
          </div>
          <div className="w-64 shrink-0 p-5 rounded-2xl bg-gradient-to-br from-forest-500 to-forest-700 text-white shadow-cardHover">
            <div className="flex items-center gap-2 mb-3">
              <Send size={16} />
              <p className="font-serif font-bold">交接清单预览</p>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="opacity-75">复核批次</span>
                <span className="font-medium">{batch.songs.length} 首</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-75">声部队数</span>
                <span className="font-medium">{batch.songs.length * 4}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-75">异常条目</span>
                <span className="font-medium">{sortedExceptions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-75">其中已处理</span>
                <span className="font-medium">
                  {sortedExceptions.filter((e) => e.resolved).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-75">历史备注</span>
                <span className="font-medium">{historySummary.length}</span>
              </div>
              <div className="h-px bg-white/15 my-2" />
              <div className="flex justify-between text-[11px]">
                <span className="opacity-75">状态校验</span>
                <span className="font-medium">
                  {check?.passed ? '✓ 一致' : '⚠ 有差异'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
