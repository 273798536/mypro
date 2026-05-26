import { useMoonStore } from "@/store/moon";
import { Battery, Weight, Shadow, Radio, AlertTriangle } from "lucide-react";

function Ring({ value, color, label }: { value: number; color: string; label: string }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const offset = c - (v / 100) * c;
  return (
    <div className="ring">
      <svg viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="4" fill="none" />
        <circle
          cx="30"
          cy="30"
          r={r}
          stroke={color}
          strokeWidth="4"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="label" style={{ color }}>
        {label}
      </div>
    </div>
  );
}

export default function HUD() {
  const energy = useMoonStore((s) => s.energy);
  const route = useMoonStore((s) => s.route);
  const samples = useMoonStore((s) => s.samples);
  const collected = samples.filter((s) => s.collected);

  const batteryAlert = energy.battery < 20 || energy.failed;
  const overloadAlert = energy.overload;
  const shadowAlert = energy.shadowDepth > 0;
  const commAlert = energy.commMissed >= 2;

  return (
    <div className="glass-panel p-4 w-full h-full flex flex-col gap-3 moon-scroll overflow-auto">
      <div className="flex items-center justify-between">
        <div className="font-display text-sm text-[var(--accent)] tracking-widest">
          能量面板
        </div>
        {energy.failed && (
          <span className="chip warn">
            <AlertTriangle size={12} />
            失败
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={`hud-card scan-line ${batteryAlert ? "alert" : ""}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
              <Battery size={13} /> 电池
            </div>
            <span className={`chip ${batteryAlert ? "warn" : "ok"}`}>
              {energy.battery.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Ring
              value={energy.battery}
              color={batteryAlert ? "#ff5a5a" : "#6ef2a1"}
              label={`${energy.battery.toFixed(0)}`}
            />
            <div className="flex-1">
              <div className="stat-row">
                <span className="label">阴影耗电</span>
                <span className="value" style={{ color: "#ff7a5a" }}>
                  {energy.shadowCost.toFixed(1)}%
                </span>
              </div>
              <div className="stat-row">
                <span className="label">路径长度</span>
                <span className="value">{route.length} 段</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`hud-card scan-line ${overloadAlert ? "alert" : ""}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
              <Weight size={13} /> 样本重量
            </div>
            <span className={`chip ${overloadAlert ? "warn" : "info"}`}>
              {energy.weight.toFixed(1)}kg
            </span>
          </div>
          <div className="w-full bg-black/40 rounded h-2 mt-3 overflow-hidden">
            <div
              className="h-full"
              style={{
                width: `${Math.min(100, (energy.weight / 50) * 100)}%`,
                background: overloadAlert
                  ? "linear-gradient(90deg,#ff5a5a,#ff8a3a)"
                  : "linear-gradient(90deg,#4dc4ff,#6ef2a1)",
                transition: "width .3s ease",
              }}
            />
          </div>
          <div className="text-[11px] text-[var(--text-dim)] mt-1">
            上限 50kg（超载惩罚 ×3）
          </div>
          <div className="stat-row mt-2">
            <span className="label">已采集</span>
            <span className="value">{collected.length} 件</span>
          </div>
        </div>

        <div className={`hud-card scan-line ${shadowAlert ? "alert" : ""}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
              <Shadow size={13} /> 阴影段
            </div>
            <span className={`chip ${shadowAlert ? "warn" : "info"}`}>
              {energy.shadowDepth}
            </span>
          </div>
          <div className="text-[12px] text-[var(--text)] leading-relaxed">
            {shadowAlert
              ? "路径进入阴影区：耗电 ×2.5"
              : "当前路径未进入阴影区"}
          </div>
        </div>

        <div className={`hud-card scan-line ${commAlert ? "alert" : ""}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
              <Radio size={13} /> 通讯
            </div>
            <div className="flex gap-1">
              <span className="chip ok">{energy.commSuccess}</span>
              <span className={`chip ${commAlert ? "warn" : "info"}`}>
                错过 {energy.commMissed}
              </span>
            </div>
          </div>
          <div className="text-[12px] text-[var(--text)] leading-relaxed">
            {commAlert
              ? "错过通讯窗口 ≥ 2，任务失败"
              : "保持在通讯窗口时段内经过"}
          </div>
        </div>
      </div>

      {energy.failed && (
        <div className="hud-card alert scan-line">
          <div className="text-xs text-[var(--warn)] font-display tracking-widest mb-1">
            失败诊断
          </div>
          <div className="text-[13px]">{energy.failureReason ?? "未知原因"}</div>
          <div className="text-[11px] text-[var(--text-dim)] mt-1">
            失败状态不会静默计入正常结果，已单独标记。
          </div>
        </div>
      )}

      <div className="hud-card scan-line">
        <div className="text-xs text-[var(--text-dim)] font-display mb-1">
          能量明细
        </div>
        <div className="stat-row">
          <span className="label">基础能耗</span>
          <span className="value">{energy.shadowCost > 0 ? "含阴影惩罚" : "正常"}</span>
        </div>
        <div className="stat-row">
          <span className="label">状态</span>
          <span className={`value ${energy.failed ? "text-[var(--warn)]" : "text-[var(--ok)]"}`}>
            {energy.failed ? "失败" : "正常"}
          </span>
        </div>
      </div>
    </div>
  );
}
