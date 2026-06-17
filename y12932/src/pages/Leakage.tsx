import { useMemo, useState } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { Badge } from "@/components/ui/Badge";
import { buildLeakageReadable, download } from "@/lib/exporters";
import {
  ShieldAlert,
  Database,
  GitMerge,
  Download,
  CheckCircle2,
  FileWarning,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Leakage() {
  const questionBanks = useDashboardStore((s) => s.questionBanks);
  const leakageRecords = useDashboardStore((s) => s.leakageRecords);
  const trainingSamples = useDashboardStore((s) => s.trainingSamples);
  const currentId = useDashboardStore((s) => s.currentVersionId);
  const reimportQuestionBank = useDashboardStore((s) => s.reimportQuestionBank);

  const [justReimported, setJustReimported] = useState<string | null>(null);

  const pairs = useMemo(() => {
    return questionBanks.map((qb) => ({
      qb,
      lr: leakageRecords.find((lr) => lr.questionBankId === qb.id),
    }));
  }, [questionBanks, leakageRecords]);

  const handleReimport = (qbId: string) => {
    reimportQuestionBank(qbId);
    setJustReimported(qbId);
    setTimeout(() => setJustReimported(null), 2600);
  };

  const handleExport = (qbId: string) => {
    const pair = pairs.find((p) => p.qb.id === qbId);
    if (!pair?.lr) return;
    const text = buildLeakageReadable(pair.lr, pair.qb, trainingSamples, currentId);
    download(`leakage-${qbId}-${currentId}.txt`, text);
  };

  return (
    <div className="mx-auto max-w-[1280px] animate-fade-in space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Training / Validation Leakage</div>
          <h1 className="mt-1 font-display text-3xl tracking-tightish text-cream">训练验证泄漏</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            同一评测题库二次导入按内容哈希去重，复用既有结论，不会出现两份互相打架的结论。
          </p>
        </div>
        <Badge tone="signal" dot>
          当前版本 {currentId}
        </Badge>
      </div>

      {/* Dedup principle banner */}
      <div className="card flex items-start gap-3 border-amber-500/30 p-4">
        <GitMerge className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <div>
          <div className="font-display text-cream">题库去重 · 结论统一</div>
          <p className="mt-1 text-sm text-muted">
            评测题库以内容哈希为唯一标识。同一题库再次导入时，系统复用首次建立的统一结论，
            记为一次"复跑"，不新建结论，因此同一批评测题库不会冒出两份互相打架的结论。
          </p>
        </div>
      </div>

      {/* Question bank cards */}
      <div className="space-y-4">
        {pairs.map(({ qb, lr }) => (
          <div key={qb.id} className="card overflow-hidden">
            {/* QB header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge2/50 bg-panel/30 p-4">
              <div className="flex items-center gap-3">
                <Database className="h-4 w-4 text-rose-300" />
                <div>
                  <div className="font-display text-base text-cream">{qb.name}</div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Hash className="h-3 w-3 text-faint" />
                    <span className="font-mono text-[0.7rem] text-faint">{qb.contentHash}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="muted">导入 {qb.importCount} 次</Badge>
                {qb.importCount > 1 ? (
                  <Badge tone="safe" dot>已合并</Badge>
                ) : (
                  <Badge tone="neutral">单次导入</Badge>
                )}
                {lr ? <Badge tone="critical" dot>存在泄漏</Badge> : <Badge tone="safe" dot>无泄漏</Badge>}
              </div>
            </div>

            {lr ? (
              <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
                {/* Unified conclusion + plain reason */}
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <div className="eyebrow">统一结论（不产生矛盾）</div>
                    <div className="mt-2 flex items-start gap-2 rounded-lg border border-edge2/50 bg-ink/40 p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <p className="text-sm leading-relaxed text-cream">{lr.unifiedConclusion}</p>
                    </div>
                  </div>
                  <div>
                    <div className="eyebrow">给业务方的解释（普通话）</div>
                    <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                      <p className="text-sm leading-relaxed text-cream/90">{lr.reasonPlain}</p>
                    </div>
                  </div>

                  {/* Affected training samples */}
                  <div>
                    <div className="eyebrow">受影响训练样本 · 处理意见</div>
                    <div className="mt-2 space-y-2">
                      {lr.affectedTrainingSampleIds.map((tid) => {
                        const t = trainingSamples.find((x) => x.id === tid);
                        if (!t) return null;
                        return (
                          <div
                            key={tid}
                            className="rounded-lg border border-edge2/50 bg-ink/30 p-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs text-rose-300">{t.id}</span>
                              <Badge tone="critical">{t.status}</Badge>
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed text-muted">{t.opinion}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Import runs timeline */}
                <div>
                  <div className="eyebrow">导入记录</div>
                  <ol className="relative mt-3 ml-2 border-l border-edge2/60 pl-4">
                    {lr.importRuns.map((r, i) => (
                      <li key={i} className="mb-3 last:mb-0">
                        <span
                          className={cn(
                            "absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2",
                            r.reusedConclusion
                              ? "border-emerald-400 bg-ink"
                              : "border-amber-400 bg-ink",
                          )}
                          style={{ left: "-5px" }}
                        />
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-cream">{r.versionId}</span>
                          {r.reusedConclusion ? (
                            <Badge tone="safe">复用结论</Badge>
                          ) : (
                            <Badge tone="signal">建立结论</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 font-mono text-[0.65rem] text-faint">{r.timestamp}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">{r.deltaNote}</p>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      onClick={() => handleReimport(qb.id)}
                      className="flex items-center justify-center gap-2 rounded-lg border border-edge2 px-3 py-2 text-sm text-muted transition-colors hover:border-amber-500/40 hover:text-cream"
                    >
                      <GitMerge className="h-4 w-4" />
                      模拟二次导入
                    </button>
                    {justReimported === qb.id && (
                      <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        已复用既有结论，未产生矛盾
                      </p>
                    )}
                    <button
                      onClick={() => handleExport(qb.id)}
                      className="flex items-center justify-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-200 transition-colors hover:bg-sky-500/20"
                    >
                      <Download className="h-4 w-4" />
                      导出可读说明
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 text-sm text-faint">
                <FileWarning className="h-4 w-4 text-emerald-400" />
                本题库未检测到训练验证泄漏，评测与训练数据无重合。
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Plain-language note */}
      <div className="card flex items-start gap-3 p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <p className="text-sm leading-relaxed text-muted">
          <span className="text-cream">说明：</span>导出的可读文件不使用字段名与缩写，
          而是用人话写清楚"哪道题漏给了模型、为什么、怎么处理"，可直接转给不懂代码的同事。
        </p>
      </div>
    </div>
  );
}
