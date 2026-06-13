import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api';
import type { PointStatus, ReportOptions } from 'shared/types';
import { POINT_STATUS_LABEL } from 'shared/types';
import StatusBadge from '@/components/StatusBadge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileDown,
  FileText,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  SlidersHorizontal,
  Info,
  RotateCcw,
  Eye,
} from 'lucide-react';

const STATUS_OPTIONS: Array<{ v: PointStatus; label: string; Icon: any; color: string }> = [
  { v: 'pending', label: '待确认', Icon: AlertTriangle, color: 'text-status-pending' },
  { v: 'confirmed_anomaly', label: '已确认异常', Icon: AlertCircle, color: 'text-status-anomaly' },
  { v: 'dismissed', label: '已驳回', Icon: RotateCcw, color: 'text-gray-500' },
  { v: 'normal', label: '正常', Icon: CheckCircle, color: 'text-status-normal' },
];

export default function ReportExport() {
  const { initIfNeeded, anomalies, loading } = useAppStore();

  const [statuses, setStatuses] = useState<PointStatus[]>(['pending', 'confirmed_anomaly']);
  const [startId, setStartId] = useState('');
  const [endId, setEndId] = useState('');
  const [preview, setPreview] = useState<string>('');
  const [filename, setFilename] = useState<string>('');
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [reportError, setReportError] = useState<string>('');

  useEffect(() => {
    initIfNeeded();
  }, [initIfNeeded]);

  const opts: ReportOptions = useMemo(() => {
    const o: ReportOptions = { statuses };
    if (startId && endId) o.point_range = { start: startId, end: endId };
    return o;
  }, [statuses, startId, endId]);

  useEffect(() => {
    if (!autoRefresh) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      setReportError('');
      try {
        const r = await api.generateReport(opts);
        if (cancelled) return;
        setPreview(r.markdown);
        setFilename(r.filename);
        setCount(r.anomaly_count);
      } catch (e: any) {
        if (cancelled) return;
        console.error(e);
        setReportError(e?.message ?? '报告生成失败，请检查后端服务是否正常。');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opts, anomalies]);

  function toggleStatus(s: PointStatus) {
    setStatuses(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  async function manualRefresh() {
    setBusy(true);
    setReportError('');
    try {
      const r = await api.generateReport(opts);
      setPreview(r.markdown);
      setFilename(r.filename);
      setCount(r.anomaly_count);
    } catch (e: any) {
      console.error(e);
      setReportError(e?.message ?? '报告生成失败，请检查后端服务是否正常。');
    } finally {
      setBusy(false);
    }
  }

  const halfFilledRange = (startId && !endId) || (!startId && endId);

  return (
    <div className="space-y-4">
      {/* 顶栏 */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="flex items-center gap-2 font-semibold text-brand-800 text-base">
          <FileText className="w-5 h-5 text-brand-500" />
          Markdown 报告导出
        </h1>
        <span className="chip bg-brand-50 text-brand-600 border border-brand-200">
          共 {count} 个异常对象
        </span>
        <div className="ml-auto flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs text-brand-600 cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-brand-600"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
            />
            筛选变化实时预览
          </label>
          <button className="btn-secondary" onClick={manualRefresh} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            刷新预览
          </button>
          <button className="btn-primary" onClick={() => api.downloadReport(opts)} disabled={busy}>
            <FileDown className="w-4 h-4" /> 下载 .md
          </button>
        </div>
      </div>

      {reportError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-status-anomaly shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-status-anomaly">报告生成失败</div>
            <div className="text-[11.5px] text-red-700/90 break-all mt-0.5">{reportError}</div>
          </div>
          <button
            className="text-[11px] text-red-600 hover:text-red-800 underline shrink-0"
            onClick={() => setReportError('')}
          >
            关闭
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
        {/* 左侧筛选 */}
        <aside className="space-y-4">
          <div className="card-padded">
            <h2 className="text-sm font-semibold text-brand-800 mb-3 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-brand-500" />
              筛选条件
            </h2>

            <div className="mb-4">
              <div className="label">异常状态（多选）</div>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map(opt => {
                  const active = statuses.includes(opt.v);
                  return (
                    <button
                      key={opt.v}
                      onClick={() => toggleStatus(opt.v)}
                      className={
                        'px-3 py-2 rounded-md border text-left text-xs transition ' +
                        (active
                          ? 'bg-brand-50 border-brand-400 ring-1 ring-brand-400/60'
                          : 'bg-white border-brand-200 hover:bg-brand-50/60')
                      }
                    >
                      <div className={`flex items-center gap-1.5 font-medium ${active ? 'text-brand-700' : 'text-brand-500'}`}>
                        <opt.Icon className="w-3.5 h-3.5" />
                        {opt.label}
                      </div>
                      <div className="mt-1 text-[10px] font-mono text-brand-400">
                        {POINT_STATUS_LABEL[opt.v]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-4 space-y-2">
              <div className="label">点位范围（可选）</div>
              <div className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <div className="text-[11px] text-brand-500 mb-1">起始</div>
                  <input
                    className="input font-mono text-[12px]"
                    placeholder="如 A-01-01"
                    value={startId}
                    onChange={e => setStartId(e.target.value)}
                  />
                </div>
                <div>
                  <div className="text-[11px] text-brand-500 mb-1">结束</div>
                  <input
                    className="input font-mono text-[12px]"
                    placeholder="如 B-02-10"
                    value={endId}
                    onChange={e => setEndId(e.target.value)}
                  />
                </div>
              </div>
              {halfFilledRange ? (
                <div className="mt-2 rounded border border-amber-300 bg-amber-50 px-2.5 py-1.5 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-amber-800 leading-snug">
                    请同时填写起止点位，当前范围筛选<b>未生效</b>。
                  </div>
                </div>
              ) : null}
              {(startId || endId) ? (
                <button
                  className="text-[11px] text-brand-500 hover:text-brand-700 underline"
                  onClick={() => { setStartId(''); setEndId(''); }}
                >
                  清空范围
                </button>
              ) : null}
            </div>

            <div className="p-3 rounded-lg bg-brand-50/70 border border-brand-200 text-[11.5px] text-brand-600 leading-relaxed">
              <Info className="w-3.5 h-3.5 inline mr-1 align-middle -mt-0.5 text-brand-500" />
              报告内容始终包含 <b>空间位置 + 备注 + 原始来源（raw_values）</b>三项。运营主管在异常详情页修改备注后，回到本页「刷新预览」即可看到备注同步。
            </div>
          </div>

          {/* 快速操作：点选异常对象单独导出 */}
          <div className="card-padded">
            <h2 className="text-sm font-semibold text-brand-800 mb-2.5 flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-500" />
              单独导出一个异常对象
            </h2>
            <p className="text-[11.5px] text-brand-500 mb-3 leading-relaxed">
              点下方任意一个异常项，预览并导出其独立的 Markdown 片段 — 用于快速发给同事确认。
            </p>
            <div className="max-h-80 overflow-auto border border-brand-100 rounded-md divide-y divide-brand-100">
              {anomalies.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-brand-400">{loading ? '加载中…' : '暂无异常对象'}</div>
              ) : (
                anomalies.map(a => (
                  <button
                    key={a.id}
                    onClick={() => api.downloadSingleReport(a.id)}
                    className="w-full text-left px-3 py-2.5 hover:bg-brand-50/70 transition flex items-center gap-2"
                  >
                    <span className="font-mono text-[12.5px] text-brand-800 shrink-0 w-20">{a.point_id}</span>
                    <StatusBadge status={a.status} />
                    <span className="text-[11px] text-brand-600 truncate flex-1 min-w-0">
                      {a.detection_reason.description}
                    </span>
                    <FileDown className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* 右侧 Markdown 预览 */}
        <section className="card overflow-hidden flex flex-col max-h-[calc(100vh-180px)]">
          <div className="px-4 py-2.5 border-b border-brand-100 flex items-center gap-2 bg-brand-50/40 shrink-0">
            <FileText className="w-4 h-4 text-brand-500" />
            <span className="font-mono text-xs text-brand-700">{filename || 'report_preview.md'}</span>
            <span className="text-[11px] text-brand-400 ml-auto">
              {busy ? <><Loader2 className="w-3 h-3 inline mr-1 animate-spin" />生成中…</> : <>实时预览 · 与后端 JSON 同步</>}
            </span>
          </div>
          <div className="flex-1 overflow-auto">
            <div className="markdown-body p-5 max-w-[980px] mx-auto">
              {busy && !preview ? (
                <div className="text-center py-10 text-brand-400 text-sm">
                  <Loader2 className="w-6 h-6 inline mr-2 animate-spin" /> 正在生成报告…
                </div>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview || '_暂无内容_'}</ReactMarkdown>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
