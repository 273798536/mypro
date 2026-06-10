import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SolventType } from "@/types";
import { SOLVENT_META, purityBg } from "@/types";
import { useApp } from "@/store/useApp";
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Beaker,
  Zap,
  Clock,
  Thermometer,
  Droplet,
  ArrowRight,
  Info,
  Copy,
} from "lucide-react";

export default function BalancePage() {
  const nav = useNavigate();
  const { calculateBalance, createBatch, role } = useApp();

  const [solventType, setSolventType] = useState<SolventType>("ETOH");
  const [initialAmount, setInitialAmount] = useState<number>(50);
  const [targetPurity, setTargetPurity] = useState<number>(95);
  const [recoveredAmount, setRecoveredAmount] = useState<number>(43);
  const [reflowTemp, setReflowTemp] = useState<number | undefined>(78);
  const [reflowTime, setReflowTime] = useState<number | undefined>(45);
  const [coolTemp, setCoolTemp] = useState<number | undefined>(12);

  const [toast, setToast] = useState<{ kind: "ok" | "warn" | "err"; msg: string } | null>(null);

  const meta = SOLVENT_META[solventType];

  const bal = useMemo(
    () =>
      calculateBalance({
        solventType,
        initialAmount,
        targetPurity,
        reflowTemp,
        reflowTime,
        coolTemp,
      }),
    [calculateBalance, solventType, initialAmount, targetPurity, reflowTemp, reflowTime, coolTemp],
  );

  const actualRecovery = initialAmount > 0 ? +((recoveredAmount / initialAmount) * 100).toFixed(2) : 0;
  const expectedPurity = bal.theoreticalRecovery;
  const gap = +(actualRecovery - expectedPurity).toFixed(2);

  const handleCreate = () => {
    const r = createBatch({ solventType, initialAmount, targetPurity, recoveredAmount });
    if (!r.ok) {
      if (r.missing?.length) {
        setToast({ kind: "warn", msg: `缺少参数：${r.missing.join("、")}，请补充后再提交` });
      } else if (r.duplicate) {
        setToast({
          kind: "warn",
          msg: `相同条件下批次 ${r.duplicate} 已存在，不重复创建。已为您跳转查看。`,
        });
        setTimeout(() => nav(`/review/${r.duplicate}`), 800);
        return;
      } else {
        setToast({ kind: "err", msg: "创建失败，请检查输入内容" });
      }
      setTimeout(() => setToast(null), 4200);
      return;
    }
    setToast({ kind: "ok", msg: `批次 ${r.batchId} 草稿已创建，跳转到复核页录入实验数据` });
    setTimeout(() => {
      setToast(null);
      nav(`/review/${r.batchId}`);
    }, 900);
  };

  if (role === "student") {
    return (
      <div className="card text-center py-20">
        <div className="text-5xl mb-4">🔒</div>
        <h3 className="font-display text-2xl text-ink-800 mb-2">配平计算页不对学生开放</h3>
        <p className="text-ink-500">请切换到环境监测员或老师视角使用此功能</p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6 animate-fade-in">
      <div className="lg:col-span-3 space-y-6">
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-lab-50 text-lab-700 text-xs font-medium">
                <Calculator size="12" /> 日常入口
              </div>
              <h3 className="section-title mt-3">配平计算</h3>
              <p className="section-subtitle">
                输入溶剂参数，实时计算理论回收率与能耗。缺参数会给可操作提示，不抛内部错误。
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">溶剂类型</label>
              <select
                className="input"
                value={solventType}
                onChange={(e) => {
                  const t = e.target.value as SolventType;
                  setSolventType(t);
                  setTargetPurity(SOLVENT_META[t].standardPurity);
                  setReflowTemp(SOLVENT_META[t].boilingPoint);
                }}
              >
                {Object.values(SOLVENT_META).map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name}（{m.abbreviation}） · 标准纯度 {m.standardPurity}% · 沸点 {m.boilingPoint}°C
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label flex items-center gap-1">
                初始投料量
                <span className="text-ink-400 text-xs">(L)</span>
                {!initialAmount && <span className="text-warn-600 text-xs">必填</span>}
              </label>
              <div className="flex items-center gap-2">
                <Droplet size="16" className="text-lab-500 shrink-0" />
                <input
                  type="number"
                  className={`input ${!initialAmount ? "input-warn" : ""}`}
                  value={initialAmount || ""}
                  placeholder="例：50"
                  onChange={(e) => setInitialAmount(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="label flex items-center gap-1">
                目标纯度
                <span className="text-ink-400 text-xs">(%)</span>
                {(!targetPurity || targetPurity > 100) && <span className="text-warn-600 text-xs">必填</span>}
              </label>
              <input
                type="number"
                className={`input ${(!targetPurity || targetPurity > 100) ? "input-warn" : ""}`}
                value={targetPurity || ""}
                placeholder="例：95"
                onChange={(e) => setTargetPurity(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="label flex items-center gap-1">
                实际回收量
                <span className="text-ink-400 text-xs">(L)</span>
                {!recoveredAmount && <span className="text-warn-600 text-xs">必填</span>}
              </label>
              <div className="flex items-center gap-2">
                <Beaker size="16" className="text-chem-500 shrink-0" />
                <input
                  type="number"
                  className={`input ${!recoveredAmount ? "input-warn" : ""}`}
                  value={recoveredAmount || ""}
                  placeholder="例：43"
                  onChange={(e) => setRecoveredAmount(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="label flex items-center gap-1">
                回流温度
                <span className="text-ink-400 text-xs">(°C)</span>
                {!reflowTemp && <span className="text-warn-500 text-xs">建议补充</span>}
              </label>
              <div className="flex items-center gap-2">
                <Thermometer size="16" className="text-warn-500 shrink-0" />
                <input
                  type="number"
                  className={`input ${!reflowTemp ? "input-warn" : ""}`}
                  value={reflowTemp ?? ""}
                  placeholder={`推荐 ${meta.boilingPoint}`}
                  onChange={(e) => setReflowTemp(e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            </div>

            <div>
              <label className="label flex items-center gap-1">
                回流时间
                <span className="text-ink-400 text-xs">(min)</span>
                {!reflowTime && <span className="text-warn-500 text-xs">建议补充</span>}
              </label>
              <div className="flex items-center gap-2">
                <Clock size="16" className="text-lab-500 shrink-0" />
                <input
                  type="number"
                  className={`input ${!reflowTime ? "input-warn" : ""}`}
                  value={reflowTime ?? ""}
                  placeholder="例：30"
                  onChange={(e) => setReflowTime(e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="label flex items-center gap-1">
                冷却水温
                <span className="text-ink-400 text-xs">(°C)</span>
                {!coolTemp && <span className="text-warn-500 text-xs">建议补充</span>}
              </label>
              <input
                type="number"
                className={`input ${!coolTemp ? "input-warn" : ""}`}
                value={coolTemp ?? ""}
                placeholder="例：10"
                onChange={(e) => setCoolTemp(e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>

          {bal.warnings.length > 0 && (
            <div className="mt-5 p-4 rounded-xl bg-warn-50 border border-warn-200 text-sm">
              <div className="flex items-start gap-2 text-warn-700 font-medium mb-1.5">
                <AlertTriangle size="16" className="mt-0.5" />
                计算存在可优化项（非内部错误，以下项建议补充）：
              </div>
              <ul className="list-disc list-inside text-warn-800 space-y-0.5 text-xs pl-1">
                {bal.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-ink-500 flex items-center gap-1.5">
              <Info size="12" />
              批次号会根据溶剂+日期自动生成，防重复。
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    JSON.stringify({ solventType, initialAmount, targetPurity, recoveredAmount, reflowTemp, reflowTime, coolTemp }, null, 2),
                  );
                }}
              >
                <Copy size="15" /> 复制参数
              </button>
              <button className="btn-primary" onClick={handleCreate}>
                生成批次草稿 <ArrowRight size="15" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-5">
        <div className="card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-chem-200/50 to-transparent rounded-bl-full" />
          <div className="relative">
            <div className="text-xs text-ink-500 mb-1">实际回收率</div>
            <div className="flex items-end gap-2">
              <div className="font-display text-5xl text-ink-800">{actualRecovery}</div>
              <div className="text-ink-400 text-lg mb-2">%</div>
            </div>
            <div className="mt-3 h-3 rounded-full bg-ink-100 overflow-hidden">
              <div
                className={`h-full ${purityBg(actualRecovery)} transition-all duration-500`}
                style={{ width: `${Math.min(100, actualRecovery)}%` }}
              />
            </div>
            <div className="mt-3 text-xs text-ink-500 flex items-center justify-between">
              <span>目标 {targetPurity}%（作为判定标准）</span>
              <span className={gap >= 0 ? "text-chem-600" : "text-alert-600"}>
                偏差 {gap > 0 ? "+" : ""}{gap} 个百分点
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="card-soft">
            <div className="flex items-center gap-2 text-xs text-ink-500 mb-2">
              <Zap size="12" className="text-warn-500" /> 理论回收
            </div>
            <div className="font-display text-2xl text-ink-800">{expectedPurity}%</div>
            <div className="text-[11px] text-ink-500 mt-1">
              约 <span className="text-lab-600 font-semibold">{bal.theoreticalAmount}</span> L
            </div>
          </div>
          <div className="card-soft">
            <div className="flex items-center gap-2 text-xs text-ink-500 mb-2">
              <Zap size="12" className="text-lab-500" /> 能耗估算
            </div>
            <div className="font-display text-2xl text-ink-800">{bal.energyEstimateKwh}</div>
            <div className="text-[11px] text-ink-500 mt-1">千瓦时（kWh）</div>
          </div>
          <div className="card-soft">
            <div className="flex items-center gap-2 text-xs text-ink-500 mb-2">
              <Clock size="12" className="text-chem-500" /> 总耗时
            </div>
            <div className="font-display text-2xl text-ink-800">{bal.timeEstimateMin}</div>
            <div className="text-[11px] text-ink-500 mt-1">分钟（含冷却+准备）</div>
          </div>
          <div className="card-soft">
            <div className="flex items-center gap-2 text-xs text-ink-500 mb-2">
              <Beaker size="12" className="text-alert-500" /> 推荐pH
            </div>
            <div className="font-display text-2xl text-ink-800">
              {bal.phRange[0]}<span className="text-lg opacity-60">~</span>{bal.phRange[1]}
            </div>
            <div className="text-[11px] text-ink-500 mt-1">越界需在复核页标注</div>
          </div>
        </div>

        <div className="card-soft text-sm text-ink-600 leading-relaxed">
          <div className="flex items-center gap-2 text-ink-800 font-semibold mb-2">
            <CheckCircle2 size="16" className="text-chem-500" /> 说明
          </div>
          <p>
            这里就是环境监测员日常使用的入口。填完基本参数后就可以生成批次草稿，
            接着进入复核页补录温度曲线、pH记录和纯度解释。
          </p>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div
            className={`px-5 py-3 rounded-xl shadow-card text-sm border flex items-center gap-2 ${
              toast.kind === "ok"
                ? "bg-chem-50 text-chem-800 border-chem-200"
                : toast.kind === "warn"
                ? "bg-warn-50 text-warn-800 border-warn-200"
                : "bg-alert-50 text-alert-800 border-alert-200"
            }`}
          >
            {toast.kind === "ok" && <CheckCircle2 size="16" />}
            {toast.kind === "warn" && <AlertTriangle size="16" />}
            {toast.kind === "err" && <AlertTriangle size="16" />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
