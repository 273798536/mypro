import { useGameStore } from "@/store/gameStore";
import { TrendingDown, TrendingUp, Minus, Shield, Coins, AlertTriangle } from "lucide-react";
import type { FundCard } from "@/types";

function MiniChart({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 30;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  const isUp = data[data.length - 1] >= data[0];
  const color = isUp ? "#4ade80" : "#f87171";

  return (
    <svg width={w} height={h} className="inline-block">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

function DrawdownBar({ current, initial }: { current: number; initial: number }) {
  const pct = initial > 0 ? Math.max(0, (1 - current / initial) * 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-500 transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function FundCardItem({
  fund,
  shares,
  pendingAction,
  onAction,
}: {
  fund: FundCard;
  shares: number;
  pendingAction?: { action: string; shares: number };
  onAction: (action: "买入" | "卖出" | "持有", shares: number) => void;
}) {
  const currentNav = fund.navHistory[fund.navHistory.length - 1];
  const prevNav = fund.navHistory[fund.navHistory.length - 2] || currentNav;
  const change = ((currentNav - prevNav) / prevNav) * 100;
  const initialNav = fund.navHistory[0];

  const typeColor: Record<string, string> = {
    股票型: "bg-red-500/20 text-red-300 border-red-500/30",
    混合型: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    债券型: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    货币型: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  };

  return (
    <div className="group relative bg-gradient-to-br from-[#0f2f2a] to-[#0a1f1c] border border-[#D4A843]/20 rounded-xl p-3 hover:border-[#D4A843]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#D4A843]/10 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs text-[#D4A843]/70 font-mono">{fund.fundId}</div>
          <div className="text-sm font-bold text-white/90">{fund.name}</div>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${typeColor[fund.fundType]}`}>
          {fund.fundType}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <MiniChart data={fund.navHistory} />
        <div className="text-right">
          <div className="text-sm font-mono font-bold text-white">{currentNav.toFixed(4)}</div>
          <div className={`text-[10px] font-mono flex items-center gap-0.5 ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {change >= 0 ? "+" : ""}{change.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-white/50 mb-1.5">
        <span className="flex items-center gap-0.5"><Shield size={9} />{fund.industry}</span>
        <span className="flex items-center gap-0.5"><Coins size={9} />费率{(fund.feeRate * 100).toFixed(1)}%</span>
        {shares > 0 && <span className="text-[#D4A843]">持有{shares}份</span>}
      </div>

      <DrawdownBar current={currentNav} initial={initialNav} />

      {shares > 0 && (
        <div className="mt-2 text-[10px] text-white/30 group-hover:text-white/60 transition-colors">
          市值: <span className="font-mono text-white/70">{(currentNav * shares).toFixed(2)}</span>
        </div>
      )}

      <div className="mt-2 flex gap-1">
        {(["买入", "持有", "卖出"] as const).map((act) => (
          <button
            key={act}
            onClick={() => onAction(act, act === "持有" ? 0 : 10)}
            className={`flex-1 text-[10px] py-1 rounded-md font-bold transition-all duration-200 ${
              pendingAction?.action === act
                ? act === "买入"
                  ? "bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-500/50"
                  : act === "卖出"
                  ? "bg-red-500/30 text-red-300 ring-1 ring-red-500/50"
                  : "bg-white/10 text-white/70 ring-1 ring-white/20"
                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
            }`}
          >
            {act === "买入" ? "▲ 买入" : act === "卖出" ? "▼ 卖出" : <Minus size={10} className="inline" />}
          </button>
        ))}
      </div>

      {pendingAction && pendingAction.action !== "持有" && (
        <div className="mt-1.5 flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={9999}
            value={pendingAction.shares}
            onChange={(e) => onAction(pendingAction.action as "买入" | "卖出", Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white font-mono focus:border-[#D4A843]/50 focus:outline-none"
          />
          <span className="text-[10px] text-white/30">份</span>
          <span className="text-[10px] text-[#D4A843]/60 font-mono ml-auto">
            费{((currentNav * (pendingAction.shares || 0) * fund.feeRate)).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}

export function FundCardList() {
  const { funds, portfolio, pendingActions, handleSetAction, handleRemoveAction } = useGameStore();

  return (
    <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-120px)] pr-1 custom-scrollbar">
      {funds.map((fund) => (
        <FundCardItem
          key={fund.fundId}
          fund={fund}
          shares={portfolio[fund.fundId] || 0}
          pendingAction={pendingActions.find((a) => a.fundId === fund.fundId)}
          onAction={(action, shares) => {
            if (action === "持有") {
              handleRemoveAction(fund.fundId);
            } else {
              handleSetAction(fund.fundId, action, shares);
            }
          }}
        />
      ))}
    </div>
  );
}
