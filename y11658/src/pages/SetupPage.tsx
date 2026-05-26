import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import { useMaterialStore } from "@/store/materialStore";
import type { Task } from "@/types";
import { makeAuditId, nowISO } from "@/utils/storage";

export default function SetupPage() {
  const ensureSeed = useMaterialStore((s) => s.ensureSeed);
  const coils = useMaterialStore((s) => s.coils);
  const spreaders = useMaterialStore((s) => s.spreaders);
  const rails = useMaterialStore((s) => s.rails);
  const zones = useMaterialStore((s) => s.zones);
  const tasks = useMaterialStore((s) => s.tasks);
  const addTask = useMaterialStore((s) => s.addTask);
  const selectedTaskId = useMaterialStore((s) => s.selectedTaskId);
  const setSelectedTaskId = useMaterialStore((s) => s.setSelectedTaskId);
  const navigate = useNavigate();

  const existing = tasks.find((t) => t.id === selectedTaskId) ?? tasks[0];

  const [coilId, setCoilId] = useState(existing?.coilId ?? coils[0]?.id ?? "");
  const [spreaderId, setSpreaderId] = useState(existing?.spreaderId ?? spreaders[0]?.id ?? "");
  const [railId, setRailId] = useState(existing?.railId ?? rails[0]?.id ?? "");
  const [zoneIds, setZoneIds] = useState<string[]>(existing?.zones ?? zones.map((z) => z.id));
  const [name, setName] = useState(existing?.name ?? "新任务");
  const [startX, setStartX] = useState(existing?.start.x ?? -5);
  const [startZ, setStartZ] = useState(existing?.start.z ?? -3);
  const [endX, setEndX] = useState(existing?.end.x ?? 5);
  const [endZ, setEndZ] = useState(existing?.end.z ?? -3);

  useEffect(() => {
    ensureSeed();
  }, [ensureSeed]);

  const toggleZone = (id: string) =>
    setZoneIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = () => {
    if (!coilId || !spreaderId || !railId) return;
    const task: Task = {
      id: `TASK_${Date.now().toString(36).toUpperCase()}`,
      name: name || "未命名任务",
      coilId,
      spreaderId,
      railId,
      zones: zoneIds,
      start: { x: Number(startX), y: 2, z: Number(startZ) },
      end: { x: Number(endX), y: 2, z: Number(endZ) },
      audit: [
        {
          id: makeAuditId(),
          time: nowISO(),
          source: "setup",
          strategy: "overwrite",
          operator: "trainer",
        },
      ],
    };
    addTask(task);
    navigate(`/scene/${task.id}`);
  };

  const Field = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <label className="block text-xs">
      <div className="mb-1 text-slate-400">{label}</div>
      {children}
    </label>
  );

  const inputCls =
    "w-full rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-amber-500/60 focus:outline-none";

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-100">任务配置</h2>
        <p className="mt-1 text-sm text-slate-400">
          选择钢卷、吊具、轨道与作业区，并指定起点 / 终点。生成后可直接进入吊运场景。
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="grid gap-4">
            <Field label="任务名称">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="钢卷">
              <select className={inputCls} value={coilId} onChange={(e) => setCoilId(e.target.value)}>
                {coils.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.weight}t)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="吊具">
              <select
                className={inputCls}
                value={spreaderId}
                onChange={(e) => setSpreaderId(e.target.value)}
              >
                {spreaders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (偏移限制 {s.offsetLimit}m)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="行车轨道">
              <select className={inputCls} value={railId} onChange={(e) => setRailId(e.target.value)}>
                {rails.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="text-xs text-slate-400">作业区（勾选即参与校验）</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {zones.map((z) => (
              <label
                key={z.id}
                className={
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-xs " +
                  (zoneIds.includes(z.id)
                    ? "border-amber-500/50 bg-amber-500/5 text-amber-200"
                    : "border-slate-800 bg-slate-950/40 text-slate-300")
                }
              >
                <input
                  type="checkbox"
                  className="accent-amber-500"
                  checked={zoneIds.includes(z.id)}
                  onChange={() => toggleZone(z.id)}
                />
                <div className="flex-1">
                  <div className="font-semibold">{z.name}</div>
                  <div className="text-[11px] opacity-80">{z.type}</div>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label={`起点 (x, z)`}>
              <div className="flex gap-2">
                <input
                  type="number"
                  className={inputCls}
                  value={startX}
                  onChange={(e) => setStartX(Number(e.target.value))}
                />
                <input
                  type="number"
                  className={inputCls}
                  value={startZ}
                  onChange={(e) => setStartZ(Number(e.target.value))}
                />
              </div>
            </Field>
            <Field label={`终点 (x, z)`}>
              <div className="flex gap-2">
                <input
                  type="number"
                  className={inputCls}
                  value={endX}
                  onChange={(e) => setEndX(Number(e.target.value))}
                />
                <input
                  type="number"
                  className={inputCls}
                  value={endZ}
                  onChange={(e) => setEndZ(Number(e.target.value))}
                />
              </div>
            </Field>
          </div>
          <button
            onClick={submit}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 shadow-lg shadow-amber-900/30 hover:bg-amber-400"
          >
            <Play className="h-4 w-4" /> 生成任务并进入场景
          </button>
          {selectedTaskId && (
            <button
              onClick={() => navigate(`/scene/${selectedTaskId}`)}
              className="mt-2 w-full rounded-lg bg-slate-800 px-4 py-2 text-xs text-slate-200 hover:bg-slate-700"
            >
              返回上次任务
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
