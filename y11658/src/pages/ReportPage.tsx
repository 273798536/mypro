import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileText, Target, TrendingDown } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useMaterialStore } from "@/store/materialStore";
import { exportReport } from "@/utils/export";
import type { Report } from "@/types";

export default function ReportPage() {
  const { taskId } = useParams();
  const ensureSeed = useMaterialStore((s) => s.ensureSeed);
  const reports = useMaterialStore((s) => s.reports);
  const tasks = useMaterialStore((s) => s.tasks);

  useEffect(() => {
    ensureSeed();
  }, [ensureSeed]);

  const task = tasks.find((t) => t.id === taskId);
  const report: Report | undefined = useMemo(() => {
    const list = reports.filter((r) => r.taskId === taskId);
    return list.sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1))[0];
  }, [reports, taskId]);

  if (!task || !report) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12 text-center text-slate-400">
        未找到任务或报告。
        <Link to="/" className="ml-2 text-amber-400 hover:underline">
          返回工作台
        </Link>
      </div>
    );
  }

  const gradeColor: Record<string, string> = {
    S: "text-emerald-300",
    A: "text-emerald-300",
    B: "text-sky-300",
    C: "text-amber-300",
    F: "text-rose-300",
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">吊运报告</h2>
          <div className="mt-1 text-[12px] text-slate-500">
            {task.name} · {task.id} · 完成于 {report.finishedAt}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/scene/${task.id}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> 再跑一次
          </Link>
          <button
            onClick={() => exportReport(report, "md")}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/90 px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-amber-400"
          >
            <Download className="h-3.5 w-3.5" /> 导出 Markdown
          </button>
          <button
            onClick={() => exportReport(report, "json")}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
          >
            <FileText className="h-3.5 w-3.5" /> 导出 JSON
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-500">
            <Target className="mr-1 inline h-3 w-3" /> 总分
          </div>
          <div className="mt-2 text-4xl font-semibold text-amber-300 tabular-nums">
            {report.totalScore}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-500">等级</div>
          <div className={`mt-2 text-4xl font-semibold tabular-nums ${gradeColor[report.finalGrade]}`}>
            {report.finalGrade}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-500">
            <TrendingDown className="mr-1 inline h-3 w-3" /> 事故数
          </div>
          <div className="mt-2 text-4xl font-semibold text-rose-300 tabular-nums">
            {report.accidents.length}
          </div>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h3 className="text-sm font-semibold text-slate-100">事故摘要</h3>
        {report.accidents.length === 0 ? (
          <div className="mt-3 rounded-md border border-dashed border-slate-800 bg-slate-950/40 px-3 py-4 text-center text-[12px] text-slate-500">
            本次作业未触发严重事故。
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {report.accidents.map((a, i) => (
              <li
                key={i}
                className="rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[12px] text-rose-100"
              >
                <span className="mr-2 rounded bg-rose-500/20 px-1.5 py-0.5 text-[11px] text-rose-300">
                  步骤 {a.t}
                </span>
                [{a.action}] 位置 ({a.position.x.toFixed(2)}, {a.position.z.toFixed(2)}, {a.position.y.toFixed(2)})
                扣分 {a.penalty?.amount ?? 0}：{a.penalty?.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h3 className="text-sm font-semibold text-slate-100">事件时间线</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[12px]">
            <thead className="text-slate-500">
              <tr>
                <th className="px-2 py-2">步</th>
                <th className="px-2 py-2">动作</th>
                <th className="px-2 py-2">位置 (x, z, y, rot)</th>
                <th className="px-2 py-2">重心偏移</th>
                <th className="px-2 py-2">轨道</th>
                <th className="px-2 py-2">区域</th>
                <th className="px-2 py-2">穿越</th>
                <th className="px-2 py-2">得分</th>
                <th className="px-2 py-2">备注</th>
              </tr>
            </thead>
            <tbody>
              {report.events.map((e, i) => (
                <tr
                  key={i}
                  className={
                    e.penalty
                      ? "bg-rose-500/5 text-rose-100"
                      : "text-slate-300"
                  }
                >
                  <td className="px-2 py-2 tabular-nums">{e.t}</td>
                  <td className="px-2 py-2">{e.action}</td>
                  <td className="px-2 py-2 tabular-nums">
                    {e.position.x.toFixed(2)}, {e.position.z.toFixed(2)}, {e.position.y.toFixed(2)}, {e.position.rot}°
                  </td>
                  <td className="px-2 py-2 tabular-nums">{e.cogOffset.toFixed(2)}</td>
                  <td className="px-2 py-2">{e.onRail ? "是" : "否"}</td>
                  <td className="px-2 py-2">{e.inZone ?? "-"}</td>
                  <td className="px-2 py-2">{e.crossing ? "是" : "否"}</td>
                  <td className="px-2 py-2 tabular-nums">{e.score}</td>
                  <td className="px-2 py-2">{e.penalty?.message ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
