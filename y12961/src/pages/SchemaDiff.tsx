import { Link } from "react-router-dom";
import {
  GitCompareArrows,
  Plus,
  Minus,
  Pencil,
  Equal,
  ArrowRight,
  ShieldAlert,
  Columns3,
} from "lucide-react";
import { useCheckStore } from "@/store/useCheckStore";
import { schemaRows } from "@/data/selectors";
import { Panel, SectionTitle, EmptyState } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { SchemaRow } from "@/data/selectors";

function fmtTime(iso: string) {
  return iso.replace("T", " ").replace(/\+08:00$/, "");
}

const CHANGE_META: Record<
  SchemaRow["change"],
  { icon: typeof Plus; tone: string; label: string; bg: string }
> = {
  added: { icon: Plus, tone: "text-emerald", label: "新增", bg: "bg-emerald/5 border-emerald/20" },
  removed: { icon: Minus, tone: "text-rose", label: "删除", bg: "bg-rose/5 border-rose/20" },
  modified: { icon: Pencil, tone: "text-amber", label: "修改", bg: "bg-amber/5 border-amber/20" },
  unchanged: { icon: Equal, tone: "text-ink-500", label: "不变", bg: "bg-transparent border-transparent" },
};

export default function SchemaDiff() {
  const { batch } = useCheckStore();
  const { before, after } = batch.schemaVersions;
  const rows = schemaRows(batch);
  const changed = rows.filter((r) => r.change !== "unchanged");
  const triggered = rows.filter((r) => r.overrideId);
  const override = triggered[0]?.overrideId
    ? batch.overrides.find((o) => o.id === triggered[0]!.overrideId)
    : undefined;

  return (
    <div className="space-y-4">
      {/* version header */}
      <Panel>
        <SectionTitle
          title="Schema 前后对比"
          subtitle={`表 ${after.table} · ${changed.length} 处差别${
            triggered.length ? ` · ${triggered.length} 处由权限越权触发` : ""
          }`}
          icon={<GitCompareArrows className="h-4 w-4" />}
          right={
            <div className="flex items-center gap-2">
              <span className="chip border-zinc-600 text-zinc-300">
                <Minus className="h-2.5 w-2.5" /> {before.version} · {fmtTime(before.capturedAt)}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-ink-500" />
              <span className="chip border-sky/40 text-sky-soft">
                <Plus className="h-2.5 w-2.5" /> {after.version} · {fmtTime(after.capturedAt)}
              </span>
            </div>
          }
        />

        {/* override callout */}
        {override && (
          <Link
            to="/audit"
            className="mb-4 flex items-center gap-3 rounded-lg border border-violet/30 bg-violet/5 p-3 transition-colors hover:border-violet/50"
          >
            <ShieldAlert className="h-4 w-4 shrink-0 text-violet" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-zinc-100">
                判断变更来源：权限越权 {override.id} 已复核通过
              </div>
              <p className="truncate text-[11px] text-ink-500">
                {override.change} · 申请人 {override.applicant} · 审批 {override.approver} · {override.why}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-violet" />
          </Link>
        )}

        {/* legend */}
        <div className="mb-3 flex flex-wrap gap-3">
          {(["added", "modified", "removed", "unchanged"] as SchemaRow["change"][]).map((c) => {
            const m = CHANGE_META[c];
            const Icon = m.icon;
            return (
              <span key={c} className={cn("chip", m.tone)}>
                <Icon className="h-2.5 w-2.5" /> {m.label} {rows.filter((r) => r.change === c).length}
              </span>
            );
          })}
        </div>

        {/* diff table */}
        {changed.length === 0 ? (
          <EmptyState
            title="本批次 Schema 无前后差别"
            hint={`${before.version} 与 ${after.version} 列结构一致，未发生变更。`}
            icon={<Columns3 className="h-8 w-8" />}
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-line">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-ink-850/60 font-mono text-[10px] uppercase tracking-wider text-ink-500">
                  <th className="px-3 py-2 font-medium"></th>
                  <th className="px-3 py-2 font-medium">列名</th>
                  <th className="px-3 py-2 font-medium">前 {before.version}</th>
                  <th className="px-3 py-2 font-medium"></th>
                  <th className="px-3 py-2 font-medium">后 {after.version}</th>
                  <th className="px-3 py-2 font-medium">说明 / 变更来源</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const m = CHANGE_META[r.change];
                  const Icon = m.icon;
                  const changedRow = r.change !== "unchanged";
                  return (
                    <tr
                      key={r.name}
                      className={cn(
                        "border-b border-line/60",
                        changedRow && m.bg,
                        changedRow && "border-l-2",
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <span className={cn("flex h-5 w-5 items-center justify-center rounded", m.tone)}>
                          <Icon className="h-3 w-3" />
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn("font-mono text-[12px]", changedRow ? "text-zinc-100" : "text-ink-500")}>
                          {r.name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn("font-mono text-[11px]", r.change === "removed" ? "text-rose-soft line-through" : r.before ? "text-ink-500" : "text-ink-600")}>
                          {r.before ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <ArrowRight className="h-3 w-3 text-ink-600" />
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn("font-mono text-[11px]", r.change === "added" ? "text-emerald-soft" : r.change === "modified" ? "text-amber-soft" : "text-ink-500")}>
                          {r.after ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[11px] text-ink-500">{r.note ?? "—"}</span>
                        {r.overrideId && (
                          <Link to="/audit" className="ml-2 chip border-violet/30 text-violet-soft hover:bg-violet/10">
                            <ShieldAlert className="h-2.5 w-2.5" /> {r.overrideId}
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
