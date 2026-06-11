import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  FileClock,
  FileSearch,
  Filter,
  History,
  Printer,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useAuditStore } from "@/store/auditStore";
import { AuditCredential } from "@/components/AuditCredential";
import { SectionTitle } from "@/components/FormulaCard";
import type { EntityStatus } from "@/types";

const FILTERS: { label: string; value: EntityStatus | "ALL" }[] = [
  { label: "全部", value: "ALL" },
  { label: "待确认", value: "PENDING_CONFIRM" },
  { label: "已通过", value: "APPROVED" },
  { label: "已驳回", value: "REJECTED" },
];

export default function AuditTrailCenter() {
  const { revisions, filterStatus, setFilterStatus, approveRevision, rejectRevision } =
    useAuditStore();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("timeline");

  const displayList = useMemo(() => {
    let list = revisions.slice();
    if (filterStatus !== "ALL") {
      list = list.filter((r) => r.approvalStatus === filterStatus);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.fieldName.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q) ||
          r.performedByName.toLowerCase().includes(q) ||
          r.newValue.toLowerCase().includes(q),
      );
    }
    return list;
  }, [revisions, filterStatus, search]);

  const counters = useMemo(() => {
    return {
      ALL: revisions.length,
      PENDING_CONFIRM: revisions.filter((r) => r.approvalStatus === "PENDING_CONFIRM")
        .length,
      APPROVED: revisions.filter((r) => r.approvalStatus === "APPROVED").length,
      REJECTED: revisions.filter((r) => r.approvalStatus === "REJECTED").length,
    };
  }, [revisions]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof displayList>();
    displayList.forEach((r) => {
      const day = r.performedAt.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(r);
    });
    return Array.from(map.entries());
  }, [displayList]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-slide-in-up">
      <SectionTitle
        title="修正留痕中心"
        subtitle="所有人工修改均生成不可删除的凭证，待确认→通过自动生成变更快照，前后变化清晰可追溯"
        icon={<ShieldCheck className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            <button className="btn-secondary !py-1.5 text-xs">
              <Printer className="w-3.5 h-3.5" />
              导出凭证 PDF
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "总修正凭证",
            value: counters.ALL,
            icon: FileClock,
            tone: "ocean",
          },
          {
            label: "待确认",
            value: counters.PENDING_CONFIRM,
            icon: Clock,
            tone: "amber",
          },
          {
            label: "已通过并生成快照",
            value: counters.APPROVED,
            icon: CheckCircle2,
            tone: "emerald",
          },
          {
            label: "已驳回",
            value: counters.REJECTED,
            icon: XCircle,
            tone: "red",
          },
        ].map((s, i) => {
          const toneMap = {
            ocean: "from-ocean-500 to-ocean-700",
            amber: "from-amber-500 to-amber-600",
            emerald: "from-emerald-500 to-emerald-600",
            red: "from-red-500 to-red-600",
          } as const;
          return (
            <div
              key={s.label}
              className="card overflow-hidden animate-slide-in-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className={`h-1 bg-gradient-to-r ${toneMap[s.tone]}`} />
              <div className="p-4 flex items-start gap-3">
                <div
                  className={`w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br ${toneMap[s.tone]} text-white flex items-center justify-center shadow`}
                >
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-ocean-500">{s.label}</div>
                  <div className="font-serif font-bold text-2xl text-ocean-800 mt-0.5">
                    {s.value}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-ocean-500" />
          <span className="text-xs font-semibold text-ocean-600">审批状态：</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`chip border transition-all ${
                filterStatus === f.value
                  ? "bg-ocean-800 text-white border-ocean-800 shadow-inner"
                  : "bg-white text-ocean-600 border-steel-200 hover:border-ocean-300"
              }`}
            >
              {f.label}
              <span
                className={`ml-1 px-1.5 rounded-full text-[10px] font-bold ${
                  filterStatus === f.value ? "bg-white/20" : "bg-steel-100 text-ocean-500"
                }`}
              >
                {counters[f.value]}
              </span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ocean-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索字段名/理由/操作人..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-steel-200 bg-white focus:ring-2 focus:ring-ocean-400 focus:outline-none min-w-[240px]"
            />
          </div>
          <div className="inline-flex rounded-md border border-steel-200 p-0.5 bg-white">
            <button
              onClick={() => setViewMode("list")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 ${
                viewMode === "list"
                  ? "bg-ocean-800 text-white"
                  : "text-ocean-600 hover:bg-ocean-50"
              }`}
            >
              <FileSearch className="w-3 h-3" />
              列表
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 ${
                viewMode === "timeline"
                  ? "bg-ocean-800 text-white"
                  : "text-ocean-600 hover:bg-ocean-50"
              }`}
            >
              <History className="w-3 h-3" />
              时间轴
            </button>
          </div>
        </div>
      </div>

      {displayList.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-steel-50 flex items-center justify-center mb-3">
            <History className="w-8 h-8 text-steel-300" />
          </div>
          <div className="font-serif font-semibold text-ocean-500">
            未找到匹配的修正凭证
          </div>
          <div className="text-sm text-ocean-400 mt-1">请调整筛选条件或搜索关键词</div>
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-3">
          {displayList.map((r, idx) => (
            <div
              key={r.id}
              className="animate-slide-in-up"
              style={{ animationDelay: `${idx * 25}ms` }}
            >
              <AuditCredential
                revision={r}
                showActions
                onApprove={() => approveRevision(r.id, "王海涛")}
                onReject={(reason) => rejectRevision(r.id, "王海涛", reason)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(([day, items]) => (
            <div key={day}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 shrink-0 rounded-full bg-ocean-800 text-white flex items-center justify-center text-xs font-bold shadow">
                  {day.slice(8)}
                </div>
                <div>
                  <div className="font-serif font-semibold text-ocean-800">
                    {day} · 周
                    {["日", "一", "二", "三", "四", "五", "六"][new Date(day).getDay()]}
                  </div>
                  <div className="text-xs text-ocean-500">
                    本日 {items.length} 条修正记录
                  </div>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-ocean-200 to-transparent" />
              </div>

              <div className="relative pl-14">
                <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-ocean-200 via-ocean-300 to-transparent" />
                <div className="space-y-4">
                  {items.map((r, idx) => (
                    <div
                      key={r.id}
                      className="relative animate-slide-in-up"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <div
                        className={`absolute -left-[33px] top-4 w-3.5 h-3.5 rounded-full ring-4 ring-white ${
                          r.approvalStatus === "APPROVED"
                            ? "bg-emerald-500"
                            : r.approvalStatus === "REJECTED"
                              ? "bg-red-500"
                              : r.performedBy === "SYSTEM"
                                ? "bg-ocean-500"
                                : "bg-amber-500"
                        } shadow`}
                      />
                      <AuditCredential
                        revision={r}
                        showActions={r.approvalStatus === "PENDING_CONFIRM"}
                        onApprove={() => approveRevision(r.id, "王海涛")}
                        onReject={(reason) => rejectRevision(r.id, "王海涛", reason)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {counters.PENDING_CONFIRM > 0 && (
        <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-amber-400 text-ocean-900 flex items-center justify-center shadow">
              <Clock className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="font-serif font-bold text-lg text-ocean-800 mb-1">
                值班主任待办
              </div>
              <div className="text-sm text-ocean-600 mb-3">
                还有 <b className="text-amber-700">{counters.PENDING_CONFIRM}</b> 条修正凭证等待您的审批。
                审批通过后将自动生成「变更快照」，海事处即可使用对应结论。
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus("PENDING_CONFIRM")}
                  className="btn-primary !py-1.5 text-xs"
                >
                  只看待审批项
                </button>
                <button
                  onClick={() =>
                    displayList
                      .filter((r) => r.approvalStatus === "PENDING_CONFIRM")
                      .forEach((r) => approveRevision(r.id, "王海涛（批量）"))
                  }
                  className="btn-secondary !py-1.5 text-xs"
                >
                  一键批量通过
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
