import { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Ship,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  Eye,
  ArrowRightLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInspectionStore } from "@/store/inspectionStore";
import { useResultStore } from "@/store/resultStore";
import { ResultBadge, TinyDot, NeedsReviewChip } from "@/components/ResultBadge";
import { SectionTitle } from "@/components/FormulaCard";
import type { Availability, ViewRole } from "@/types";

const WEEK_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const MONTH_LABELS = [
  "1 月", "2 月", "3 月", "4 月", "5 月", "6 月",
  "7 月", "8 月", "9 月", "10 月", "11 月", "12 月",
];

function buildCalendarGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { date: string; day: number; inMonth: boolean }[] = [];
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const dt = new Date(year, month - 1, d);
    cells.push({
      date: dt.toISOString().slice(0, 10),
      day: d,
      inMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    cells.push({
      date: dt.toISOString().slice(0, 10),
      day: d,
      inMonth: true,
    });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1];
    const dt = new Date(last.date);
    dt.setDate(dt.getDate() + 1);
    cells.push({
      date: dt.toISOString().slice(0, 10),
      day: dt.getDate(),
      inMonth: new Date(last.date).getMonth() === month,
    });
    if (cells.length >= 42) break;
  }
  return cells;
}

const AVAIL_FILTERS: { label: string; value: Availability | "ALL"; color: string }[] = [
  { label: "全部", value: "ALL", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { label: "可用", value: "AVAILABLE", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { label: "暂缓", value: "PENDING", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { label: "重采", value: "RECOLLECT", color: "bg-red-50 text-red-700 border-red-200" },
];

export default function CalendarHome() {
  const nav = useNavigate();
  const { inspections } = useInspectionStore();
  const {
    viewRole, setViewRole,
    availabilityFilter, setAvailabilityFilter,
    countByAvailability, getMaritimeGroups,
    ranchFilter, setRanchFilter,
  } = useResultStore();

  const [cursor, setCursor] = useState({ year: 2026, month: 5 });
  const counts = useMemo(() => countByAvailability(), [countByAvailability]);
  const ranches = useMemo(
    () => Array.from(new Set(inspections.map((i) => i.ranchName))),
    [inspections],
  );
  const grid = useMemo(
    () => buildCalendarGrid(cursor.year, cursor.month),
    [cursor],
  );

  const inspectionsByDate = useMemo(() => {
    const map = new Map<string, typeof inspections>();
    inspections.forEach((i) => {
      if (!map.has(i.date)) map.set(i.date, []);
      map.get(i.date)!.push(i);
    });
    return map;
  }, [inspections]);

  const today = "2026-06-12";
  const maritimeGroups = getMaritimeGroups();

  const filteredForList = useMemo(() => {
    let list = inspections.slice().sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    if (availabilityFilter !== "ALL") {
      list = list.filter((i) => i.availability === availabilityFilter);
    }
    if (ranchFilter !== "ALL") {
      list = list.filter((i) => i.ranchName === ranchFilter);
    }
    return list;
  }, [inspections, availabilityFilter, ranchFilter]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-slide-in-up">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="font-serif font-bold text-3xl tracking-wide text-ocean-800 flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-ocean-800 text-white flex items-center justify-center shadow">
              <CalendarIcon className="w-6 h-6" />
            </span>
            海洋牧场投喂日历
          </h1>
          <p className="text-sm text-ocean-500 mt-2 ml-14">
            巡检数据 · 风险通报 · 结论复核 · 人工修正留痕 — 全链路一目了然
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-steel-200 bg-white p-1 shadow-sm">
            {(["DISPATCHER", "MARITIME"] as ViewRole[]).map((r) => (
              <button
                key={r}
                onClick={() => setViewRole(r)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  viewRole === r
                    ? "bg-ocean-800 text-white shadow-inner"
                    : "text-ocean-600 hover:bg-ocean-50"
                }`}
              >
                {r === "DISPATCHER" ? (
                  <>
                    <Ship className="w-3.5 h-3.5" />
                    调度员视角
                  </>
                ) : (
                  <>
                    <Users className="w-3.5 h-3.5" />
                    海事处视角
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "巡检总数",
            value: inspections.length,
            sub: "近 5 天",
            icon: Ship,
            cls: "from-ocean-500 to-ocean-700",
          },
          {
            label: "🟢 可用结论",
            value: counts.AVAILABLE,
            sub: "海事处可直接使用",
            icon: CheckCircle2,
            cls: "from-emerald-500 to-emerald-700",
          },
          {
            label: "🟡 待复核",
            value: counts.PENDING,
            sub: "照片/通报/结论待确认",
            icon: Clock,
            cls: "from-amber-500 to-amber-600",
          },
          {
            label: "🔴 待重采",
            value: counts.RECOLLECT,
            sub: "数据缺失，须重新采集",
            icon: AlertTriangle,
            cls: "from-red-500 to-red-600",
          },
        ].map((s, i) => (
          <div
            key={s.label}
            className="card overflow-hidden animate-slide-in-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className={`h-1 bg-gradient-to-r ${s.cls}`} />
            <div className="p-4 flex items-start gap-3">
              <div
                className={`w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br ${s.cls} text-white flex items-center justify-center shadow`}
              >
                <s.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-ocean-500">{s.label}</div>
                <div className="font-serif font-bold text-2xl text-ocean-800 mt-0.5">
                  {s.value}
                </div>
                <div className="text-[11px] text-ocean-400 mt-0.5">{s.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {viewRole === "DISPATCHER" ? (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8">
            <SectionTitle
              title={`${cursor.year} 年 ${MONTH_LABELS[cursor.month]}`}
              subtitle="点击单元格查看当日巡检事件"
              icon={<CalendarIcon className="w-5 h-5" />}
              actions={
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setCursor((c) => ({
                        ...c,
                        month: c.month === 0 ? 11 : c.month - 1,
                        year: c.month === 0 ? c.year - 1 : c.year,
                      }))
                    }
                    className="btn-secondary !py-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCursor({ year: 2026, month: 5 })}
                    className="btn-ghost !py-1.5 text-xs"
                  >
                    回到本月
                  </button>
                  <button
                    onClick={() =>
                      setCursor((c) => ({
                        ...c,
                        month: c.month === 11 ? 0 : c.month + 1,
                        year: c.month === 11 ? c.year + 1 : c.year,
                      }))
                    }
                    className="btn-secondary !py-1.5"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              }
            />
            <div className="card p-4 bg-gradient-to-b from-ocean-50/40 to-white">
              <div className="grid grid-cols-7 mb-2">
                {WEEK_LABELS.map((w) => (
                  <div
                    key={w}
                    className="px-2 py-2 text-center text-[11px] font-bold text-ocean-500 uppercase tracking-widest"
                  >
                    周{w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {grid.map((cell, idx) => {
                  const dayInsps = inspectionsByDate.get(cell.date) ?? [];
                  const isToday = cell.date === today;
                  const availDotMap = {
                    AVAILABLE: dayInsps.filter((i) => i.availability === "AVAILABLE").length,
                    PENDING: dayInsps.filter((i) => i.availability === "PENDING").length,
                    RECOLLECT: dayInsps.filter((i) => i.availability === "RECOLLECT").length,
                  };
                  return (
                    <div
                      key={idx}
                      onClick={() => dayInsps.length && nav(`/inspection/${dayInsps[0].id}`)}
                      className={`min-h-[88px] rounded-md p-2 border transition-all ${
                        isToday
                          ? "bg-ocean-800 border-ocean-700 text-white shadow-md ring-2 ring-ocean-400/40"
                          : cell.inMonth
                            ? dayInsps.length > 0
                              ? "bg-white border-ocean-200 hover:shadow-md hover:border-ocean-400 cursor-pointer"
                              : "bg-white border-steel-100"
                            : "bg-steel-50/50 border-steel-100 text-steel-300"
                      }`}
                    >
                      <div
                        className={`text-xs font-semibold mb-1.5 ${
                          isToday ? "text-white" : cell.inMonth ? "text-ocean-700" : "text-steel-300"
                        }`}
                      >
                        {cell.day}
                        {isToday && (
                          <span className="ml-1.5 text-[10px] bg-amber-400 text-ocean-900 px-1.5 rounded font-bold">
                            今日
                          </span>
                        )}
                      </div>
                      {dayInsps.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] leading-tight font-medium truncate">
                            {isToday ? "" : dayInsps[0].ranchName.slice(0, 8)}
                          </div>
                          <div className="flex items-center gap-0.5 mt-1">
                            {availDotMap.AVAILABLE > 0 && (
                              <span className="flex items-center gap-0.5 text-[9px]">
                                <TinyDot color="green" />
                                {availDotMap.AVAILABLE}
                              </span>
                            )}
                            {availDotMap.PENDING > 0 && (
                              <span className="flex items-center gap-0.5 text-[9px]">
                                <TinyDot color="amber" />
                                {availDotMap.PENDING}
                              </span>
                            )}
                            {availDotMap.RECOLLECT > 0 && (
                              <span className="flex items-center gap-0.5 text-[9px]">
                                <TinyDot color="red" />
                                {availDotMap.RECOLLECT}
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] opacity-70">
                            {dayInsps.length} 条巡检
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="col-span-4 space-y-5">
            <SectionTitle
              title="筛选器"
              subtitle="按可用性 / 牧场过滤"
              icon={<Filter className="w-4 h-4" />}
            />
            <div className="card p-4 space-y-4">
              <div>
                <div className="label mb-2">结果可用性</div>
                <div className="flex flex-wrap gap-1.5">
                  {AVAIL_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setAvailabilityFilter(f.value)}
                      className={`chip border text-xs transition-all ${f.color} ${
                        availabilityFilter === f.value ? "ring-2 ring-offset-1 ring-ocean-400 shadow-sm" : ""
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="label mb-2">所属牧场</div>
                <select
                  value={ranchFilter}
                  onChange={(e) => setRanchFilter(e.target.value)}
                  className="w-full text-sm rounded-md border border-steel-200 bg-white px-3 py-2 focus:ring-2 focus:ring-ocean-400 focus:outline-none"
                >
                  <option value="ALL">全部牧场</option>
                  {ranches.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <SectionTitle
              title="近 5 天巡检"
              subtitle={`显示 ${filteredForList.length} 条记录`}
              icon={<Eye className="w-4 h-4" />}
            />
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredForList.map((i, idx) => {
                const pendingCount =
                  i.riskAlerts.filter((a) => a.needsReview).length +
                  (i.conclusion?.needsReview ? 1 : 0);
                return (
                  <div
                    key={i.id}
                    onClick={() => nav(`/inspection/${i.id}`)}
                    className="card card-hover cursor-pointer p-4 animate-slide-in-up"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-xs font-bold text-ocean-700">
                            {i.code}
                          </span>
                          <ResultBadge availability={i.availability} size="sm" />
                          <NeedsReviewChip count={pendingCount} />
                        </div>
                        <div className="text-sm font-medium text-ocean-800 truncate">
                          {i.ranchName}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-ocean-500">
                          <span>{i.date}</span>
                          <span>· {i.photos.length} 张照片</span>
                          <span>· {i.trajectory.length} 航迹点</span>
                        </div>
                      </div>
                      <ArrowRightLeft className="w-4 h-4 text-ocean-400 mt-1 shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <SectionTitle
            title="海事处双栏视图"
            subtitle="左侧可直接采信归档，右侧需联系港口调度员复核"
            icon={<Users className="w-5 h-5" />}
            actions={
              <div className="text-xs text-ocean-500">
                共 {maritimeGroups.directUse.length + maritimeGroups.needReview.length} 条巡检
              </div>
            }
          />
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-xl overflow-hidden border-2 border-emerald-200 shadow-sm">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-white">🟢 可直接使用</div>
                  <div className="text-[11px] text-emerald-50/90">
                    所有数据通过审核，可直接用于归档报告
                  </div>
                </div>
                <div className="ml-auto chip bg-white text-emerald-700 text-xs font-bold">
                  {maritimeGroups.directUse.length} 条
                </div>
              </div>
              <div className="bg-emerald-50/40 p-3 space-y-2 max-h-[720px] overflow-y-auto">
                {maritimeGroups.directUse.length === 0 ? (
                  <div className="text-center py-10 text-emerald-700/50 text-sm">
                    暂无可直接使用的巡检
                  </div>
                ) : (
                  maritimeGroups.directUse.map((i, idx) => (
                    <div
                      key={i.id}
                      onClick={() => nav(`/inspection/${i.id}`)}
                      className="bg-white rounded-md p-4 border border-emerald-100 hover:shadow-md hover:border-emerald-300 cursor-pointer transition-all animate-slide-in-up"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs font-bold text-ocean-700">
                          {i.code}
                        </span>
                        <ResultBadge availability="AVAILABLE" size="sm" />
                      </div>
                      <div className="text-sm font-medium text-ocean-800">{i.ranchName}</div>
                      <div className="text-[11px] text-ocean-500 mt-1">
                        {i.date} · {i.dispatcherName} 提交
                      </div>
                      {i.conclusion && (
                        <div className="mt-2 pt-2 border-t border-emerald-50 text-xs text-ocean-600 leading-relaxed line-clamp-2">
                          {i.conclusion.summary}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border-2 border-amber-200 shadow-sm">
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-white">🟡🔴 待调度员复核</div>
                  <div className="text-[11px] text-amber-50/90">
                    存在待复核项或缺失数据，处理后可归档
                  </div>
                </div>
                <div className="ml-auto chip bg-white text-amber-700 text-xs font-bold">
                  {maritimeGroups.needReview.length} 条
                </div>
              </div>
              <div className="bg-amber-50/40 p-3 space-y-2 max-h-[720px] overflow-y-auto">
                {maritimeGroups.needReview.length === 0 ? (
                  <div className="text-center py-10 text-amber-700/50 text-sm">
                    全部巡检通过审核
                  </div>
                ) : (
                  maritimeGroups.needReview.map((i, idx) => (
                    <div
                      key={i.id}
                      onClick={() => nav(`/inspection/${i.id}`)}
                      className="bg-white rounded-md p-4 border border-amber-100 hover:shadow-md hover:border-amber-300 cursor-pointer transition-all animate-slide-in-up"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs font-bold text-ocean-700">
                          {i.code}
                        </span>
                        <ResultBadge availability={i.availability} size="sm" />
                      </div>
                      <div className="text-sm font-medium text-ocean-800">{i.ranchName}</div>
                      <div className="text-[11px] text-ocean-500 mt-1">
                        {i.date} · {i.dispatcherName} 提交
                      </div>
                      {i.recollectReason && (
                        <div className="mt-2 rounded-md bg-red-50 border-l-4 border-red-400 p-2 text-[11px] text-red-700">
                          重采原因：{i.recollectReason}
                        </div>
                      )}
                      {i.riskAlerts.filter((a) => a.needsReview).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {i.riskAlerts.filter((a) => a.needsReview).map((a) => (
                            <span
                              key={a.id}
                              className="chip bg-amber-100 text-amber-800 border-amber-200 text-[10px]"
                            >
                              通报待复核: {a.type.slice(0, 14)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
