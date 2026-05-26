import { Factory, Play, FileText, Cog } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useMaterialStore } from "@/store/materialStore";

export default function HomePage() {
  const ensureSeed = useMaterialStore((s) => s.ensureSeed);
  const tasks = useMaterialStore((s) => s.tasks);
  const reports = useMaterialStore((s) => s.reports);
  const coils = useMaterialStore((s) => s.coils);
  const selectedTaskId = useMaterialStore((s) => s.selectedTaskId);

  useEffect(() => {
    ensureSeed();
  }, [ensureSeed]);

  const pickedTask = tasks.find((t) => t.id === selectedTaskId) ?? tasks[0];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <section className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] text-amber-300">
            <Factory className="h-3.5 w-3.5" /> 钢厂培训原型 · 轻 3D · 可审计
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-100">
            钢卷吊运平衡局
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            新员工通过交互操作理解钢卷吊运的重心偏移、轨道避让与地面禁区。每一步都会被校验，事故不会被悄悄计入正常结果，并可在报告中回看与导出。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {pickedTask && (
              <Link
                to={`/scene/${pickedTask.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 shadow-lg shadow-amber-900/30 transition hover:bg-amber-400"
              >
                <Play className="h-4 w-4" /> 开始任务「{pickedTask.name}」
              </Link>
            )}
            <Link
              to="/materials"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
            >
              <FileText className="h-4 w-4" /> 材料与来源
            </Link>
            <Link
              to="/setup"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
            >
              <Cog className="h-4 w-4" /> 配置任务
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-500">材料库</div>
          <div className="mt-2 text-3xl font-semibold text-slate-100 tabular-nums">
            {coils.length + useMaterialStore.getState().spreaders.length + useMaterialStore.getState().rails.length + useMaterialStore.getState().zones.length}
          </div>
          <div className="mt-1 text-xs text-slate-400">钢卷 / 吊具 / 轨道 / 作业区</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-500">任务</div>
          <div className="mt-2 text-3xl font-semibold text-slate-100 tabular-nums">
            {tasks.length}
          </div>
          <div className="mt-1 text-xs text-slate-400">可直接开始或重新配置</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-500">报告</div>
          <div className="mt-2 text-3xl font-semibold text-slate-100 tabular-nums">
            {reports.length}
          </div>
          <div className="mt-1 text-xs text-slate-400">已导出或保存的吊运报告</div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-sm font-semibold text-slate-100">最近任务</h3>
          <div className="mt-3 space-y-2">
            {tasks.map((t) => (
              <div
                key={t.id}
                className={
                  "flex items-center justify-between rounded-lg border px-3 py-2 text-xs " +
                  (t.id === selectedTaskId
                    ? "border-amber-500/50 bg-amber-500/5"
                    : "border-slate-800 bg-slate-950/40")
                }
              >
                <div>
                  <div className="font-semibold text-slate-100">{t.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {t.coilId} · {t.spreaderId} · {t.railId}
                  </div>
                </div>
                <Link
                  to={`/scene/${t.id}`}
                  className="rounded-md bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
                >
                  进入
                </Link>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-sm font-semibold text-slate-100">最近报告</h3>
          <div className="mt-3 space-y-2">
            {reports.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/40 px-3 py-4 text-center text-[12px] text-slate-500">
                还没有报告，完成一次任务后会自动生成。
              </div>
            )}
            {reports.slice(-5).reverse().map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-100">{r.taskName}</div>
                  <div className="text-[11px] text-slate-500">{r.finishedAt}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-300">
                    {r.finalGrade}
                  </span>
                  <Link
                    to={`/report/${r.taskId}`}
                    className="rounded-md bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
                  >
                    查看
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
