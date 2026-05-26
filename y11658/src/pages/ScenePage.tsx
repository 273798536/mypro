import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Download, Eye, Pause, Play, RotateCw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CraneScene from "@/components/CraneScene";
import HUD from "@/components/HUD";
import AccidentModal from "@/components/AccidentModal";
import { useMaterialStore } from "@/store/materialStore";
import { useGameStore } from "@/store/gameStore";
import { validateStep } from "@/utils/engine";
import { exportReport } from "@/utils/export";
import type { ActionType, Report, StepEvent, Task } from "@/types";
import { makeAuditId, nowISO } from "@/utils/storage";

export default function ScenePage() {
  const { taskId } = useParams();
  const ensureSeed = useMaterialStore((s) => s.ensureSeed);
  const tasks = useMaterialStore((s) => s.tasks);
  const coils = useMaterialStore((s) => s.coils);
  const spreaders = useMaterialStore((s) => s.spreaders);
  const rails = useMaterialStore((s) => s.rails);
  const zones = useMaterialStore((s) => s.zones);
  const saveReport = useMaterialStore((s) => s.saveReport);

  const status = useGameStore((s) => s.status);
  const position = useGameStore((s) => s.position);
  const score = useGameStore((s) => s.score);
  const step = useGameStore((s) => s.step);
  const events = useGameStore((s) => s.events);
  const start = useGameStore((s) => s.start);
  const record = useGameStore((s) => s.record);
  const finish = useGameStore((s) => s.finish);
  const reset = useGameStore((s) => s.reset);

  const [view, setView] = useState<"side" | "top">("side");
  const [replayIdx, setReplayIdx] = useState<number | null>(null);
  const [modalEvent, setModalEvent] = useState<StepEvent | null>(null);
  const [showEventLog, setShowEventLog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    ensureSeed();
  }, [ensureSeed]);

  const task: Task | undefined = tasks.find((t) => t.id === taskId);
  const coil = useMemo(
    () => coils.find((c) => c.id === task?.coilId),
    [coils, task],
  );
  const spreader = useMemo(
    () => spreaders.find((s) => s.id === task?.spreaderId),
    [spreaders, task],
  );
  const rail = useMemo(
    () => rails.find((r) => r.id === task?.railId),
    [rails, task],
  );
  const taskZones = useMemo(
    () => zones.filter((z) => task?.zones.includes(z.id)),
    [zones, task],
  );

  useEffect(() => {
    if (task && status === "idle") {
      start({ x: task.start.x, y: task.start.y, z: task.start.z, rot: 0 });
    }
  }, [task, status, start]);

  if (!task || !coil || !spreader || !rail) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12 text-center text-slate-400">
        任务未找到。
        <Link to="/setup" className="ml-2 text-amber-400 hover:underline">
          去创建任务
        </Link>
      </div>
    );
  }

  const applyAction = (action: ActionType, dx = 0, dz = 0, dy = 0, dRot = 0) => {
    if (status !== "running") return;
    const next = {
      x: position.x + dx,
      y: Math.max(0.5, Math.min(6, position.y + dy)),
      z: position.z + dz,
      rot: (position.rot + dRot + 360) % 360,
    };
    const prev = { x: position.x, y: position.y, z: position.z };
    const result = validateStep(task, coil, spreader, rail, taskZones, prev, next);
    const event: StepEvent = {
      t: step + 1,
      action,
      position: next,
      cogOffset: result.cogOffset,
      onRail: result.onRail,
      inZone: result.inZone,
      crossing: result.crossing,
      score: result.scoreDelta,
      penalty: result.penalty,
    };
    record(event, result.terminate);
    setModalEvent(event);
    setShowEventLog(true);

    const reached =
      Math.hypot(next.x - task.end.x, next.z - task.end.z) < 0.6 &&
      Math.abs(next.y - task.end.y) < 1.0;
    if (reached) {
      const grade = finish();
      const report: Report = {
        id: `REP_${makeAuditId()}`,
        taskId: task.id,
        taskName: task.name,
        totalScore: score + result.scoreDelta,
        finalGrade: grade,
        events: [...events, event],
        accidents: [...events, event].filter((e) => e.penalty),
        finishedAt: nowISO(),
      };
      saveReport(report);
      navigate(`/report/${task.id}`);
    }
    if (result.terminate) {
      const grade = "F" as const;
      const report: Report = {
        id: `REP_${makeAuditId()}`,
        taskId: task.id,
        taskName: task.name,
        totalScore: Math.max(0, score + result.scoreDelta),
        finalGrade: grade,
        events: [...events, event],
        accidents: [...events, event].filter((e) => e.penalty),
        finishedAt: nowISO(),
      };
      saveReport(report);
      navigate(`/report/${task.id}`);
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.repeat) return;
    switch (e.key.toLowerCase()) {
      case "w":
      case "arrowup":
        applyAction("move", 0, -1);
        break;
      case "s":
      case "arrowdown":
        applyAction("move", 0, 1);
        break;
      case "a":
      case "arrowleft":
        applyAction("move", -1, 0);
        break;
      case "d":
      case "arrowright":
        applyAction("move", 1, 0);
        break;
      case "q":
        applyAction("lift", 0, 0, -0.5);
        break;
      case "e":
        applyAction("lift", 0, 0, 0.5);
        break;
      case "r":
        applyAction("rotate", 0, 0, 0, 15);
        break;
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, step, status, score, events]);

  const replayPos =
    replayIdx !== null && events[replayIdx]
      ? events[replayIdx].position
      : position;

  const snapshotForReplay = {
    position: replayPos,
    score,
    step,
    status,
    events,
    lastPenalty:
      replayIdx !== null && events[replayIdx]
        ? events[replayIdx].penalty
        : undefined,
  } as Parameters<typeof HUD>[0]["state"];

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{task.name}</h2>
          <div className="text-[11px] text-slate-500">
            {task.id} · 钢卷 {coil.name} · 吊具 {spreader.name} · 轨道 {rail.name}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView((v) => (v === "side" ? "top" : "side"))}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
          >
            <Eye className="h-3.5 w-3.5" /> {view === "side" ? "侧视" : "俯视"}
          </button>
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
          >
            <RotateCw className="h-3.5 w-3.5" /> 重置
          </button>
          <button
            onClick={() => {
              const grade = finish();
              const report: Report = {
                id: `REP_${makeAuditId()}`,
                taskId: task.id,
                taskName: task.name,
                totalScore: score,
                finalGrade: grade,
                events,
                accidents: events.filter((e) => e.penalty),
                finishedAt: nowISO(),
              };
              saveReport(report);
              navigate(`/report/${task.id}`);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/90 px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-amber-400"
          >
            <Save className="h-3.5 w-3.5" /> 结束并生成报告
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
            <div style={{ height: 520 }}>
              <CraneScene
                task={{
                  ...task,
                  start: replayIdx !== null ? { ...task.start, y: replayPos.y } : task.start,
                }}
                coil={coil}
                rail={rail}
                zones={taskZones}
                view={view}
              />
            </div>
            <div className="absolute left-3 top-3 rounded-md bg-slate-900/80 px-2 py-1 text-[11px] text-slate-300">
              WASD/方向键移动 · Q/E 升降 · R 旋转
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => applyAction("move", -1, 0)}
                  className="rounded-md bg-slate-800/90 px-2.5 py-1.5 text-[12px] text-slate-100 hover:bg-slate-700"
                >
                  <ArrowLeft className="inline h-3.5 w-3.5" /> 左移
                </button>
                <button
                  onClick={() => applyAction("move", 1, 0)}
                  className="rounded-md bg-slate-800/90 px-2.5 py-1.5 text-[12px] text-slate-100 hover:bg-slate-700"
                >
                  右移 <ArrowRight className="inline h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => applyAction("move", 0, -1)}
                  className="rounded-md bg-slate-800/90 px-2.5 py-1.5 text-[12px] text-slate-100 hover:bg-slate-700"
                >
                  <ArrowUp className="inline h-3.5 w-3.5" /> 前行
                </button>
                <button
                  onClick={() => applyAction("move", 0, 1)}
                  className="rounded-md bg-slate-800/90 px-2.5 py-1.5 text-[12px] text-slate-100 hover:bg-slate-700"
                >
                  后退 <ArrowDown className="inline h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => applyAction("lift", 0, 0, -0.5)}
                  className="rounded-md bg-slate-800/90 px-2.5 py-1.5 text-[12px] text-slate-100 hover:bg-slate-700"
                >
                  ↓ 下降
                </button>
                <button
                  onClick={() => applyAction("lift", 0, 0, 0.5)}
                  className="rounded-md bg-slate-800/90 px-2.5 py-1.5 text-[12px] text-slate-100 hover:bg-slate-700"
                >
                  ↑ 上升
                </button>
                <button
                  onClick={() => applyAction("rotate", 0, 0, 0, 15)}
                  className="rounded-md bg-slate-800/90 px-2.5 py-1.5 text-[12px] text-slate-100 hover:bg-slate-700"
                >
                  ⟳ 旋转 +15°
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-100">事件回放</div>
              <button
                onClick={() => setShowEventLog((v) => !v)}
                className="text-[12px] text-slate-400 hover:text-slate-200"
              >
                {showEventLog ? "收起" : "展开"}
              </button>
            </div>
            {showEventLog && (
              <div className="mt-3 space-y-2">
                {events.length === 0 && (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/40 px-3 py-4 text-center text-[12px] text-slate-500">
                    暂无事件，执行第一步即可生成。
                  </div>
                )}
                {events.map((e, i) => (
                  <div
                    key={i}
                    className={
                      "flex items-center justify-between rounded-md border px-3 py-2 text-[12px] " +
                      (e.penalty
                        ? "border-rose-500/40 bg-rose-500/5"
                        : "border-slate-800 bg-slate-950/50")
                    }
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300">
                        #{e.t}
                      </span>
                      <span className="font-semibold text-slate-200">{e.action}</span>
                      <span className="text-slate-400">
                        ({e.position.x.toFixed(1)}, {e.position.z.toFixed(1)}, {e.position.y.toFixed(1)})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          "rounded px-1.5 py-0.5 text-[11px] " +
                          (e.score >= 0
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-rose-500/15 text-rose-300")
                        }
                      >
                        {e.score >= 0 ? "+" : ""}
                        {e.score}
                      </span>
                      {replayIdx === i ? (
                        <button
                          onClick={() => setReplayIdx(null)}
                          className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-700"
                        >
                          <Pause className="inline h-3 w-3" /> 停止
                        </button>
                      ) : (
                        <button
                          onClick={() => setReplayIdx(i)}
                          className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-700"
                        >
                          <Play className="inline h-3 w-3" /> 回放
                        </button>
                      )}
                      {e.penalty && (
                        <button
                          onClick={() => setModalEvent(e)}
                          className="rounded bg-rose-500/20 px-2 py-0.5 text-[11px] text-rose-200 hover:bg-rose-500/30"
                        >
                          <Download className="inline h-3 w-3" /> 详情
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <HUD state={snapshotForReplay} taskName={task.name} />
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-[12px] text-slate-300">
            <div className="mb-2 font-semibold text-slate-100">任务目标</div>
            <div>从起点绿圈吊运至终点蓝圈，保持重心在吊具允许范围内，沿轨道行驶，避开红色禁区与琥珀限制区。</div>
            <ul className="mt-2 space-y-1 text-slate-400">
              <li>· 重心偏移超过 {spreader.offsetLimit}m 扣 30 分</li>
              <li>· 行车脱离轨道扣 20 分</li>
              <li>· 路径穿越限制/危险区扣 40 分</li>
              <li>· 进入危险区任务立即终止并判 F</li>
            </ul>
          </div>
        </div>
      </div>

      <AccidentModal
        open={!!modalEvent?.penalty}
        event={modalEvent}
        onClose={() => setModalEvent(null)}
      />
    </div>
  );
}
