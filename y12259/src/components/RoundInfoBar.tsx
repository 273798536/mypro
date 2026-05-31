import { useGameStore } from "@/store/gameStore";
import { Timer, TrendingDown, Heart } from "lucide-react";

export function RoundInfoBar() {
  const { currentRound, totalRounds, cash, initialCash, funds, portfolio } = useGameStore();

  const portfolioValue = Object.entries(portfolio).reduce((sum, [fid, shares]) => {
    const fund = funds.find((f) => f.fundId === fid);
    if (!fund) return sum;
    return sum + fund.navHistory[fund.navHistory.length - 1] * shares;
  }, 0);

  const totalValue = cash + portfolioValue;
  const survivalPct = Math.max(0, Math.min(100, (totalValue / initialCash) * 100));

  return (
    <div className="bg-gradient-to-r from-[#0a1f1c] via-[#0f2f2a] to-[#0a1f1c] border-b border-[#D4A843]/15 px-6 py-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Timer size={14} className="text-[#D4A843]/60" />
            <span className="text-xs text-white/40">回合</span>
            <span className="text-sm font-mono font-bold text-[#D4A843]">
              {currentRound}<span className="text-white/30">/{totalRounds}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <TrendingDown size={14} className="text-red-400/60" />
            <span className="text-xs text-white/40">总资产</span>
            <span className={`text-sm font-mono font-bold ${survivalPct >= 80 ? "text-emerald-400" : survivalPct >= 50 ? "text-amber-400" : "text-red-400"}`}>
              {totalValue.toFixed(0)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">现金</span>
            <span className="text-xs font-mono text-white/60">{cash.toFixed(0)}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">持仓</span>
            <span className="text-xs font-mono text-white/60">{portfolioValue.toFixed(0)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Heart size={14} className={survivalPct >= 50 ? "text-emerald-400/60" : "text-red-400/60"} />
          <span className="text-xs text-white/40">生存指数</span>
          <div className="w-24 h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                survivalPct >= 80
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                  : survivalPct >= 50
                  ? "bg-gradient-to-r from-amber-500 to-amber-400"
                  : "bg-gradient-to-r from-red-500 to-red-400"
              }`}
              style={{ width: `${survivalPct}%` }}
            />
          </div>
          <span className={`text-[10px] font-mono ${survivalPct >= 80 ? "text-emerald-400" : survivalPct >= 50 ? "text-amber-400" : "text-red-400"}`}>
            {survivalPct.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
