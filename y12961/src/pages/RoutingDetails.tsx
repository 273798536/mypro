import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Waypoints,
  Filter,
  ChevronRight,
  FileSearch,
  KeyRound,
  Database,
} from "lucide-react";
import { useCheckStore } from "@/store/useCheckStore";
import { KIND_LABEL, KIND_COLOR, materialById } from "@/data/selectors";
import { Panel, SectionTitle, EmptyState } from "@/components/ui/Card";
import { StatusBadge, MaterialChip } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { RouteStatus } from "@/data/types";

const STATUS_OPTS: { key: RouteStatus | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "pass", label: "通过" },
  { key: "warn", label: "告警" },
  { key: "fail", label: "阻断" },
];

export default function RoutingDetails() {
  const { batch } = useCheckStore();
  const [status, setStatus] = useState<RouteStatus | "all">("all");
  const [db, setDb] = useState<string>("all");
  const [kind, setKind] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const dbs = useMemo(
    () => Array.from(new Set(batch.routes.map((r) => r.targetDb))).sort(),
    [batch],
  );
  const kinds = useMemo(
    () => Array.from(new Set(batch.materials.map((m) => m.kind))),
    [batch],
  );

  const rows = batch.routes.filter(
    (r) =>
      (status === "all" || r.status === status) &&
      (db === "all" || r.targetDb === db) &&
      (kind === "all" || materialById(batch, r.materialId)?.kind === kind),
  );

  return (
    <div className="space-y-4">
      <Panel>
        <SectionTitle
          title="路由明细"
          subtitle={`共 ${batch.routes.length} 条 · 与图表 / 下载同源`}
          icon={<Waypoints className="h-4 w-4" />}
          right={
            <span className="chip">
              <Filter className="h-3 w-3" /> 筛选 {rows.length}/{batch.routes.length}
            </span>
          }
        />

        {/* Filters */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <FilterGroup label="状态">
            {STATUS_OPTS.map((o) => (
              <FilterPill key={o.key} active={status === o.key} onClick={() => setStatus(o.key)}>
                {o.label}
              </FilterPill>
            ))}
          </FilterGroup>
          <FilterGroup label="库">
            <FilterPill active={db === "all"} onClick={() => setDb("all")}>全部</FilterPill>
            {dbs.map((d) => (
              <FilterPill key={d} active={db === d} onClick={() => setDb(d)}>
                {d}
              </FilterPill>
            ))}
          </FilterGroup>
          <FilterGroup label="材料">
            <FilterPill active={kind === "all"} onClick={() => setKind("all")}>全部</FilterPill>
            {kinds.map((k) => (
              <FilterPill key={k} active={kind === k} onClick={() => setKind(k)}>
                {KIND_LABEL[k]}
              </FilterPill>
            ))}
          </FilterGroup>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink-500">
                <th className="py-2 pr-2 font-medium"></th>
                <th className="py-2 pr-3 font-medium">路由</th>
                <th className="py-2 pr-3 font-medium">逻辑表</th>
                <th className="py-2 pr-3 font-medium">分片键</th>
                <th className="py-2 pr-3 font-medium">规则</th>
                <th className="py-2 pr-3 font-medium">目标库表</th>
                <th className="py-2 pr-3 font-medium">依据材料</th>
                <th className="py-2 pr-3 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const m = materialById(batch, r.materialId);
                const open = expanded === r.id;
                return (
                  <>
                    <tr
                      key={r.id}
                      onClick={() => setExpanded(open ? null : r.id)}
                      className={cn(
                        "cursor-pointer border-b border-line/60 transition-colors hover:bg-ink-850/60",
                        open && "bg-ink-850/60",
                      )}
                    >
                      <td className="py-2.5 pr-2">
                        <ChevronRight className={cn("h-3.5 w-3.5 text-ink-500 transition-transform", open && "rotate-90")} />
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[12px] text-sky">{r.id}</td>
                      <td className="py-2.5 pr-3 text-[12px] text-zinc-200">{r.logicTable}</td>
                      <td className="py-2.5 pr-3">
                        <span className="chip border-violet/30 text-violet-soft">
                          <KeyRound className="h-2.5 w-2.5" /> {r.shardKey}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-ink-500">{r.rule}</td>
                      <td className="py-2.5 pr-3">
                        <span className="font-mono text-[11px] text-zinc-300">
                          <span className="text-sky">{r.targetDb}</span>.{r.targetTable}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        {m && <MaterialChip kind={m.kind} />}
                      </td>
                      <td className="py-2.5 pr-3"><StatusBadge status={r.status} /></td>
                    </tr>
                    {open && m && (
                      <tr key={r.id + "-x"} className="bg-ink-900/40">
                        <td></td>
                        <td colSpan={7} className="pb-4 pr-3 pt-1">
                          <div className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-ink-850/50 p-4 md:grid-cols-2">
                            <div>
                              <div className="mb-1.5 flex items-center gap-2">
                                <FileSearch className="h-3.5 w-3.5 text-sky" />
                                <span className="text-[12px] font-semibold text-zinc-100">检查依据</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MaterialChip kind={m.kind} name={m.name} />
                              </div>
                              <div className="mt-2 font-mono text-[11px] text-ink-500">
                                口径：{m.caliber}
                              </div>
                              {r.evidenceLine && (
                                <div className="mt-1 font-mono text-[11px] text-amber-soft">
                                  证据行：{r.evidenceLine}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="mb-1.5 flex items-center gap-2">
                                <Database className="h-3.5 w-3.5 text-sky" />
                                <span className="text-[12px] font-semibold text-zinc-100">问题说明</span>
                              </div>
                              <p className="text-[12px] leading-relaxed text-zinc-300">{r.issue}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <Link
                                  to="/audit"
                                  className="chip border-sky/30 text-sky-soft hover:bg-sky/10"
                                >
                                  查看审计追踪 →
                                </Link>
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ background: KIND_COLOR[m.kind] }}
                                />
                                <span className="font-mono text-[10px] text-ink-500">
                                  来自 {KIND_LABEL[m.kind]} 材料
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <EmptyState title="无匹配路由" hint="调整筛选条件后查看。" icon={<Filter className="h-8 w-8" />} />
          )}
        </div>
      </Panel>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-600">{label}</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors",
        active
          ? "border-sky/50 bg-sky/10 text-sky"
          : "border-line bg-ink-850/40 text-ink-500 hover:border-ink-500 hover:text-zinc-300",
      )}
    >
      {children}
    </button>
  );
}
