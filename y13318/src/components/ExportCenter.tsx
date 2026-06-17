import { useMemo } from 'react';
import { X, FileJson, FileText, ShieldCheck, ShieldAlert, Download } from 'lucide-react';
import { useReviewStore } from '@/store/useReviewStore';
import { useReviewData } from '@/hooks/useReviewData';
import { RUN_BY_VERSION } from '@/data/samples';
import { EXPORT_OPTIONS, ERROR_CODES } from '@/lib/contract';
import { buildSnapshot, verifySnapshot } from '@/lib/export';
import type { ExportKey } from '@/types';

export function ExportCenter() {
  const open = useReviewStore((s) => s.exportOpen);
  const setOpen = useReviewStore((s) => s.setExportOpen);
  const version = useReviewStore((s) => s.version);
  const filter = useReviewStore((s) => s.filter);
  const versionNotes = useReviewStore((s) => s.versionNotes);
  const allSamples = useReviewStore((s) => s.samples);
  const runExport = useReviewStore((s) => s.runExport);

  const { visible, metrics } = useReviewData();

  const verify = useMemo(() => {
    const run = version === 'all' ? 'ALL-RUNS' : RUN_BY_VERSION[version] ?? version;
    const note = versionNotes.find((n) => n.version === version);
    const snap = buildSnapshot({ version, run, filter, samples: visible, metrics, versionNote: note, allSamples });
    return verifySnapshot(snap, visible);
  }, [visible, metrics, version, filter, versionNotes, allSamples]);

  if (!open) return null;

  const run = version === 'all' ? 'ALL-RUNS' : RUN_BY_VERSION[version] ?? version;
  const note = versionNotes.find((n) => n.version === version);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-2xl animate-slidein border border-graphite-700 bg-graphite-900 shadow-2xl">
        <header className="flex items-center gap-3 border-b border-graphite-700 p-4">
          <Download size={16} className="text-amberx-400" />
          <h2 className="font-display text-base uppercase tracking-wider">导出中心</h2>
          <span className="font-mono text-[11px] text-zinc-500">导出前自动校验页面状态与文件一致性</span>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto text-zinc-500 hover:text-zinc-200"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </header>

        <div className="p-4">
          <div className="grid grid-cols-4 gap-px border border-graphite-700 bg-graphite-700 font-mono text-xs">
            <Cell k="版本" v={version} />
            <Cell k="批次" v={run} />
            <Cell k="筛选" v={filter} />
            <Cell k="可见样本" v={String(visible.length)} />
          </div>

          <div
            className={`mt-3 flex items-center gap-2 border p-3 font-mono text-xs ${
              verify.ok
                ? 'border-pass/40 bg-pass/5 text-pass'
                : 'border-fail/50 bg-fail/5 text-fail'
            }`}
          >
            {verify.ok ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
            <span className="font-bold">
              {verify.ok ? '状态一致性校验通过' : ERROR_CODES.EXPORT_MISMATCH}
            </span>
            <span className="text-zinc-400">
              {verify.ok
                ? '· 页面状态字段与导出文件一一对应'
                : `· ${verify.diff.slice(0, 2).join('；')}`}
            </span>
          </div>

          {!note && (
            <p className="mt-3 border border-amberx-500/30 bg-amberx-500/5 p-2 font-mono text-[11px] text-amberx-400">
              当前版本暂无版本说明，导出文件中将不含「改变判断」清单。
            </p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-3">
            {EXPORT_OPTIONS.map((opt) => {
              const Icon = opt.key === 'json' ? FileJson : FileText;
              const disabled = !verify.ok;
              return (
                <div key={opt.key} className="panel flex flex-col p-4">
                  <Icon size={20} className="text-amberx-400" />
                  <h3 className="mt-2 font-display text-sm uppercase tracking-wide">{opt.label}</h3>
                  <p className="mt-1 flex-1 text-xs text-zinc-500">
                    {opt.key === 'json'
                      ? '导出当前筛选结果的结构化数据，含重复标记与影响值字段。'
                      : '导出页面可见状态的截图说明，状态字段与页面显示一致。'}
                  </p>
                  <button
                    disabled={disabled}
                    onClick={() => runExport(opt.key as ExportKey)}
                    className={`btn mt-3 ${disabled ? 'cursor-not-allowed opacity-40' : 'btn-amber'}`}
                  >
                    <Download size={14} /> 导出 {opt.label}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-graphite-850 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{k}</div>
      <div className="mt-0.5 truncate text-zinc-200">{v}</div>
    </div>
  );
}
