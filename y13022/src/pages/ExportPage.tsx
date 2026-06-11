import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, FileText, FileDown, AlertCircle } from 'lucide-react';
import { useReconciliationStore } from '@/store/useReconciliationStore';
import { useFilterStore, applyFilter } from '@/store/useFilterStore';
import { StatusBadge } from '@/components/StatusBadge';
import { buildFilterLabel, exportToCsv, exportToPdf } from '@/utils/exporter';

export default function ExportPage() {
  const nav = useNavigate();
  const records = useReconciliationStore((s) => s.records);
  const screenshots = useReconciliationStore((s) => s.screenshots);
  const filter = useFilterStore();
  const filtered = useMemo(() => applyFilter(records, filter.snapshot()), [records, filter]);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const byStatus = useMemo(() => {
    const g: Record<string, number> = { confirmed: 0, pending: 0, returned: 0 };
    for (const r of filtered) g[r.status]++;
    return g;
  }, [filtered]);

  const confirmedRecords = useMemo(
    () => filtered.filter((r) => r.status === 'confirmed'),
    [filtered]
  );
  const pendingRecords = useMemo(
    () => filtered.filter((r) => r.status === 'pending'),
    [filtered]
  );
  const returnedRecords = useMemo(
    () => filtered.filter((r) => r.status === 'returned'),
    [filtered]
  );

  const relevantShots = useMemo(
    () => screenshots.filter((s) => filtered.some((r) => r.id === s.reconciliationId)),
    [screenshots, filtered],
  );

  const handlePdf = async (recs: typeof filtered, label: string) => {
    setErrMsg(null);
    setPdfBusy(true);
    try {
      const shots = screenshots.filter((s) => recs.some((r) => r.id === s.reconciliationId));
      await exportToPdf(recs, filter.snapshot(), shots);
    } catch (e: any) {
      setErrMsg(`PDF 导出失败 (${label}): ${e?.message || e}`);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink-700 bg-ink-900/60 px-8 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => nav(-1)}
            className="flex items-center gap-1.5 text-sm text-ink-300 hover:text-amber-gold"
          >
            <ArrowLeft size={15} />
            返回列表
          </button>
          <span className="text-ink-600">|</span>
          <h2 className="font-serif text-lg font-semibold text-ink-100">导出中心</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {errMsg && (
            <div className="flex items-center gap-2 rounded-sm border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errMsg}</span>
              <button onClick={() => setErrMsg(null)} className="ml-auto text-rose-400 hover:text-rose-200">&times;</button>
            </div>
          )}

          <div className="rounded-sm border border-ink-700 bg-ink-800/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-serif text-base font-semibold text-ink-100">
                  <Download size={16} className="text-amber-gold" />
                  当前筛选快照
                </h3>
                <p className="mt-1 text-xs text-ink-400">
                  导出数据与列表屏幕展示完全一致，不做字段转换
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => exportToCsv(filtered, filter.snapshot())}
                  disabled={!filtered.length}
                  className="flex items-center gap-1.5 rounded-sm border-2 border-amber-gold bg-amber-gold/10 px-5 py-2 text-sm font-medium text-amber-gold transition hover:bg-amber-gold/20 hover:shadow-glow-amber disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download size={14} />
                  导出 CSV
                </button>
                <button
                  onClick={() => handlePdf(filtered, '全部')}
                  disabled={!filtered.length || pdfBusy}
                  className="flex items-center gap-1.5 rounded-sm border-2 border-emerald-500 bg-emerald-500/10 px-5 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FileDown size={14} />
                  {pdfBusy ? '生成中…' : '导出 PDF（含截图附录）'}
                </button>
              </div>
            </div>
            <div className="rounded-sm border border-ink-700 bg-ink-900/50 p-4 font-mono-num text-sm text-ink-200">
              {buildFilterLabel(filter.snapshot())}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3 text-sm">
              <Stat label="已确认" value={byStatus.confirmed} tone="confirmed" />
              <Stat label="待补件" value={byStatus.pending} tone="pending" />
              <Stat label="退回" value={byStatus.returned} tone="returned" />
              <Stat label="合计" value={filtered.length} tone="ink" />
            </div>
            {relevantShots.length > 0 && (
              <div className="mt-3 rounded-sm border border-ink-700 bg-ink-900/50 px-4 py-2 text-xs text-ink-300">
                <FileText size={12} className="mr-1 inline text-amber-gold" />
                当前筛选范围内有 <span className="font-mono-num text-amber-gold">{relevantShots.length}</span> 条截图说明，将作为 PDF 附录一并导出
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatusGroup
              title="已确认导出"
              subtitle="可直接提交复核"
              tone="confirmed"
              records={confirmedRecords}
              screenshots={screenshots}
              pdfBusy={pdfBusy}
              filterSnap={filter.snapshot()}
              onExportCsv={() => exportToCsv(confirmedRecords, { ...filter.snapshot(), status: ['confirmed'] })}
              onExportPdf={() => handlePdf(confirmedRecords, '已确认')}
            />
            <StatusGroup
              title="待补件导出"
              subtitle="月底复核跟进"
              tone="pending"
              records={pendingRecords}
              screenshots={screenshots}
              pdfBusy={pdfBusy}
              filterSnap={filter.snapshot()}
              onExportCsv={() => exportToCsv(pendingRecords, { ...filter.snapshot(), status: ['pending'] })}
              onExportPdf={() => handlePdf(pendingRecords, '待补件')}
            />
            <StatusGroup
              title="退回导出"
              subtitle="问题记录追踪"
              tone="returned"
              records={returnedRecords}
              screenshots={screenshots}
              pdfBusy={pdfBusy}
              filterSnap={filter.snapshot()}
              onExportCsv={() => exportToCsv(returnedRecords, { ...filter.snapshot(), status: ['returned'] })}
              onExportPdf={() => handlePdf(returnedRecords, '退回')}
            />
          </div>

          <div className="rounded-sm border border-ink-700 bg-ink-800/50 p-6">
            <h3 className="mb-4 flex items-center gap-2 font-serif text-base font-semibold text-ink-100">
              <FileText size={16} className="text-amber-gold" />
              导出说明
            </h3>
            <ul className="space-y-2 text-sm text-ink-300">
              <li>· CSV 导出头包含筛选口径 JSON 元数据，方便月底复核时可还原当次筛选条件</li>
              <li>· PDF 导出包含数据表格 + 截图说明附录，截图自动按筛选范围收集</li>
              <li>· 税费、汇率等数值与屏幕显示保持一致，不做四舍五入或换算</li>
              <li>· 回款拆分记录保留标记列，方便与正常材料区分</li>
              <li>· 已确认、待补件、退回分类导出，月底复核清晰分离</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'confirmed' | 'pending' | 'returned' | 'ink' }) {
  const toneMap = {
    confirmed: 'text-emerald-400 border-emerald-500/30',
    pending: 'text-amber-400 border-amber-500/30',
    returned: 'text-rose-400 border-rose-500/30',
    ink: 'text-ink-100 border-ink-600',
  };
  return (
    <div className={'rounded-sm border bg-ink-900/50 p-3 text-center ' + toneMap[tone]}>
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <div className="mt-1 font-serif text-2xl font-semibold">{value}</div>
    </div>
  );
}

function StatusGroup({
  title,
  subtitle,
  tone,
  records,
  screenshots,
  pdfBusy,
  filterSnap,
  onExportCsv,
  onExportPdf,
}: {
  title: string;
  subtitle: string;
  tone: 'confirmed' | 'pending' | 'returned';
  records: any[];
  screenshots: any[];
  pdfBusy: boolean;
  filterSnap: any;
  onExportCsv: () => void;
  onExportPdf: () => void;
}) {
  const toneMap = {
    confirmed: 'border-emerald-500/30',
    pending: 'border-amber-500/30',
    returned: 'border-rose-500/30',
  };
  const shotCount = screenshots.filter((s: any) => records.some((r: any) => r.id === s.reconciliationId)).length;
  return (
    <div className={'rounded-sm border bg-ink-800/50 p-5 ' + toneMap[tone]}>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-serif text-base font-semibold text-ink-100">{title}</h4>
        <StatusBadge status={tone as any} />
      </div>
      <p className="mb-4 text-xs text-ink-400">{subtitle}</p>
      <div className="mb-4 max-h-40 overflow-y-auto space-y-1 text-xs">
        {records.length === 0 ? (
          <div className="text-ink-500">暂无记录</div>
        ) : (
          records.slice(0, 5).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between rounded-sm bg-ink-900/50 px-2 py-1">
              <span className="font-mono-num text-ink-300">{r.contractCode}</span>
              <span className="text-ink-500">{r.tradeDate}</span>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onExportCsv}
          disabled={!records.length}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-ink-600 bg-ink-800 px-3 py-1.5 text-sm text-ink-200 transition hover:border-amber-gold/60 hover:text-amber-gold disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download size={14} />
          CSV
        </button>
        <button
          onClick={onExportPdf}
          disabled={!records.length || pdfBusy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-emerald-600 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FileDown size={14} />
          PDF{shotCount > 0 ? ` (+${shotCount}图)` : ''}
        </button>
      </div>
    </div>
  );
}
