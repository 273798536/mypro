import { useEffect, useMemo, useState } from "react";
import {
  History,
  Download,
  Search,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Share2,
  FileCheck2,
  ChevronDown,
  ChevronRight,
  Eye,
} from "lucide-react";
import Timeline from "@/components/Timeline/Timeline";
import { useAppStore } from "@/store/useAppStore";
import { StatusTag, SourceTag } from "@/components/StatusTag/StatusTag";
import { formatDate, downloadJSON, actionTypeLabel } from "@/utils/helpers";
import { reviewService } from "@/services/reviewService";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
  const init = useAppStore((s) => s.init);
  const data = useAppStore((s) => s.data);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [scrollToExport, setScrollToExport] = useState(false);
  const exportAnchor = "export-section";

  useEffect(() => {
    init();
    const hash = window.location.hash.replace("#", "");
    if (hash === exportAnchor) {
      setScrollToExport(true);
      setTimeout(() => {
        document.getElementById(exportAnchor)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 200);
    }
  }, [init]);

  const records = useMemo(() => data.review_records, [data.review_records]);

  const ordersWithChanges = useMemo(() => {
    const map = new Map<string, typeof data.review_records>();
    data.review_records.forEach((r) => {
      if (!map.has(r.order_id)) map.set(r.order_id, []);
      map.get(r.order_id)!.push(r);
    });
    let list = Array.from(map.entries())
      .map(([orderId, recs]) => ({
        order: data.work_orders.find((o) => o.id === orderId)!,
        records: recs.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      }))
      .filter((x) => x.order);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        ({ order, records }) =>
          order.title.toLowerCase().includes(q) ||
          records.some(
            (r) =>
              r.note.toLowerCase().includes(q) ||
              r.operator.toLowerCase().includes(q)
          )
      );
    }
    return list.sort(
      (a, b) =>
        new Date(b.records[0].created_at).getTime() -
        new Date(a.records[0].created_at).getTime()
    );
  }, [data, search]);

  const operatorStats = useMemo(() => {
    const map: Record<string, number> = {};
    data.review_records.forEach(
      (r) => (map[r.operator] = (map[r.operator] ?? 0) + 1)
    );
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [data.review_records]);

  const actionStats = useMemo(() => {
    const map: Record<string, number> = { confirm: 0, revoke: 0, modify: 0 };
    data.review_records.forEach(
      (r) => (map[r.action_type] = (map[r.action_type] ?? 0) + 1)
    );
    return map;
  }, [data.review_records]);

  const doExport = () => {
    setExporting(true);
    try {
      const pkg = reviewService.exportReviewPackage();
      const ts = new Date();
      const tsStr = `${ts.getFullYear()}${(ts.getMonth() + 1)
        .toString()
        .padStart(2, "0")}${ts.getDate().toString().padStart(2, "0")}`;
      downloadJSON(pkg, `客服摘要人工改判-复盘材料包-${tsStr}.json`);
    } finally {
      setTimeout(() => setExporting(false), 800);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <p className="text-sm text-navy-500">社区公示前复盘 · 给算法值班人看的解释材料</p>
          <h2 className="mt-1 text-2xl font-serif font-semibold text-navy-800">
            历史追溯 · 改判前后对比
          </h2>
          <p className="mt-1 text-sm text-navy-600">
            人工确认前后的变化全部进历史，什么时候、谁、改了什么，一眼可见。
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400"
            strokeWidth={1.75}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
            className="input-field !pl-9 text-sm"
            placeholder="搜索工单标题 / 操作人 / 备注..."
          />
        </div>
      </header>

      {/* 概览小卡 */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          {
            label: "改判操作总数",
            value: records.length,
            unit: "次",
            color: "from-navy-50 to-white",
            icon: History,
          },
          {
            label: "涉及工单数",
            value: ordersWithChanges.length,
            unit: "条",
            color: "from-moss-50 to-white",
            icon: FileCheck2,
          },
          {
            label: "撤回率",
            value: records.length
              ? Math.round((actionStats.revoke / records.length) * 100)
              : 0,
            unit: "%",
            color: "from-crimson-50 to-white",
            icon: AlertTriangle,
          },
          {
            label: "参与操作人",
            value: operatorStats.length,
            unit: "人",
            color: "from-amber-50 to-white",
            icon: Share2,
          },
        ].map((m, i) => (
          <div
            key={m.label}
            className={cn(
              `card card-hover p-4 animate-fade-in-up bg-gradient-to-br stagger-${i +
                1}`,
              m.color
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium text-navy-500/80 uppercase tracking-wide">
                  {m.label}
                </p>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span className="text-2xl font-serif font-semibold text-navy-800">
                    {m.value}
                  </span>
                  <span className="text-xs text-navy-500">{m.unit}</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-white/70 flex items-center justify-center shadow-sm">
                <m.icon
                  className="w-4 h-4 text-navy-600"
                  strokeWidth={1.75}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 操作人 & 操作类型 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 animate-fade-in-up stagger-1">
          <h3 className="font-serif font-semibold text-navy-800 text-base mb-4 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-navy-600" strokeWidth={1.75} />
            操作人分布
          </h3>
          <ul className="space-y-3">
            {operatorStats.map(([op, cnt]) => {
              const pct = Math.round((cnt / records.length) * 100);
              return (
                <li key={op}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-navy-700">{op}</span>
                    <span className="text-navy-500 font-mono">
                      {cnt} 次 · {pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-navy-50 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-navy-400 to-navy-600 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="card p-5 animate-fade-in-up stagger-2">
          <h3 className="font-serif font-semibold text-navy-800 text-base mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-navy-600" strokeWidth={1.75} />
            操作类型分布
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { k: "confirm", n: actionStats.confirm, cls: "moss" },
              { k: "modify", n: actionStats.modify, cls: "navy" },
              { k: "revoke", n: actionStats.revoke, cls: "crimson" },
            ].map((row) => {
              const pct = records.length
                ? Math.round((row.n / records.length) * 100)
                : 0;
              return (
                <div
                  key={row.k}
                  className={cn(
                    "rounded-xl p-4 border",
                    row.cls === "moss" && "bg-moss-50 border-moss-100",
                    row.cls === "navy" && "bg-navy-50 border-navy-100",
                    row.cls === "crimson" && "bg-crimson-50 border-crimson-100"
                  )}
                >
                  <p className="text-2xl font-serif font-semibold text-navy-800">
                    {row.n}
                  </p>
                  <p className="text-[11px] text-navy-600 mt-0.5">
                    {actionTypeLabel(row.k)}
                  </p>
                  <p className="mt-1.5 text-xs font-mono text-navy-500">
                    {pct}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div
          id={exportAnchor}
          className={cn(
            "card overflow-hidden animate-fade-in-up stagger-3",
            scrollToExport && "ring-2 ring-moss-400 ring-offset-2"
          )}
        >
          <div className="h-1.5 bg-gradient-to-r from-moss-400 via-moss-500 to-moss-600" />
          <div className="p-5">
            <h3 className="font-serif font-semibold text-navy-800 text-lg mb-1 flex items-center gap-2">
              <Download className="w-5 h-5 text-moss-600" strokeWidth={1.75} />
              社区公示复盘导出区
            </h3>
            <p className="text-xs text-navy-500 mb-4">
              算法值班人接手：无需问你，直接到这里点导出，即可得到解释材料包。
            </p>
            <div className="rounded-xl bg-gradient-to-br from-moss-50 to-white border border-moss-100 p-4 mb-4 space-y-2">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-moss-600" strokeWidth={1.75} />
                <span className="text-sm font-medium text-navy-700">
                  导出格式：.json 材料包
                </span>
              </div>
              <ul className="text-xs text-navy-600 space-y-1 pl-6 list-disc leading-relaxed">
                <li>生成时间 + 摘要说明（今日改判量、确认率等）</li>
                <li>全部 {data.work_orders.length} 条工单（含阈值标记、影响权重）</li>
                <li>全部 {data.review_records.length} 条改判历史（含操作人、改判理由）</li>
                <li>全部 {data.screenshots.length} 张截图说明关联</li>
              </ul>
            </div>
            <button
              onClick={doExport}
              disabled={exporting}
              className="btn-success w-full !py-2.5"
            >
              <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
              {exporting ? "正在生成材料包..." : "一键导出复盘材料（JSON）"}
            </button>
            <p className="mt-3 text-[11px] text-center text-navy-400">
              用于社区公示前复盘，可直接解释给算法值班人。
            </p>
          </div>
        </div>
      </div>

      {/* 全局时间线 */}
      <section className="card p-6 animate-fade-in-up stagger-4">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-serif font-semibold text-navy-800 text-xl flex items-center gap-2">
              <History className="w-5 h-5 text-navy-600" strokeWidth={1.75} />
              全局改判时间线
            </h3>
            <p className="mt-1 text-xs text-navy-500">
              改判前后高亮对比，操作说明清晰标注。
            </p>
          </div>
          <div className="chip bg-navy-50 text-navy-600">共 {records.length} 条操作</div>
        </header>
        <Timeline records={records} />
      </section>

      {/* 按工单分组 */}
      <section className="space-y-3 animate-fade-in-up stagger-5">
        <header className="flex items-center justify-between">
          <div>
            <h3 className="font-serif font-semibold text-navy-800 text-lg">
              按工单分组查看
            </h3>
            <p className="mt-1 text-xs text-navy-500">
              共 {ordersWithChanges.length} 条工单有变更记录 · 点开展开该工单下的所有操作
            </p>
          </div>
        </header>

        {ordersWithChanges.length === 0 && (
          <div className="card p-10 text-center text-sm text-navy-400">
            没有匹配的历史记录
          </div>
        )}

        <div className="space-y-3">
          {ordersWithChanges.map(({ order, records: recs }) => {
            const expanded = expandedOrderId === order.id;
            return (
              <article
                key={order.id}
                className={cn(
                  "card overflow-hidden transition-shadow",
                  expanded && "shadow-card-hover"
                )}
              >
                <header
                  onClick={() =>
                    setExpandedOrderId(expanded ? null : order.id)
                  }
                  className="p-4 flex items-start gap-3 cursor-pointer hover:bg-navy-50/40 transition"
                >
                  <div
                    className={cn(
                      "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5",
                      recs[0].action_type === "revoke"
                        ? "bg-crimson-50 text-crimson-600"
                        : recs[0].action_type === "modify"
                        ? "bg-navy-50 text-navy-600"
                        : "bg-moss-50 text-moss-600"
                    )}
                  >
                    {expanded ? (
                      <ChevronDown className="w-4 h-4" strokeWidth={2} />
                    ) : (
                      <ChevronRight className="w-4 h-4" strokeWidth={2} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <StatusTag status={order.status} />
                      <SourceTag source={order.source_type} />
                      {order.threshold_affected && (
                        <span className="chip bg-amber-50 text-amber-700 border border-amber-200/60">
                          <AlertTriangle
                            className="w-3 h-3"
                            strokeWidth={2}
                          />
                          阈值影响
                        </span>
                      )}
                      <span className="chip bg-navy-50 text-navy-600">
                        {recs.length} 次变更
                      </span>
                    </div>
                    <p className="font-medium text-navy-800 text-sm leading-snug">
                      {order.title}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-navy-400">最近变更</p>
                    <p className="text-xs text-navy-600 font-medium">
                      {formatDate(recs[0].created_at)}
                    </p>
                    <p className="text-[10px] text-navy-400 mt-0.5">
                      by {recs[0].operator}
                    </p>
                  </div>
                </header>
                {expanded && (
                  <div className="px-4 pb-5 pl-16 animate-slide-in">
                    <Timeline records={recs} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
