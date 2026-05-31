import { useGameStore } from "@/store/gameStore";
import { ArrowRight, Info, Coins, Scale } from "lucide-react";
import { RULES } from "@/data/rules";

function RuleHint() {
  return (
    <div className="bg-[#0f2f2a]/60 border border-white/5 rounded-lg p-3 mb-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Scale size={12} className="text-[#D4A843]/60" />
        <span className="text-[10px] text-[#D4A843]/60 font-bold">回合调仓规则提示</span>
      </div>
      <div className="space-y-1">
        {RULES.filter((r) => r.category === "调仓").map((rule) => (
          <div key={rule.ruleId} className="flex items-start gap-1.5">
            <Info size={9} className="text-white/20 mt-0.5 shrink-0" />
            <span className="text-[10px] text-white/30">
              <span className="font-mono text-white/50">{rule.ruleId}</span>{" "}
              {rule.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActionPanel() {
  const { pendingActions, funds, portfolio, cash, handleSubmitRound } = useGameStore();

  let totalCost = 0;
  let totalFee = 0;
  for (const act of pendingActions) {
    const fund = funds.find((f) => f.fundId === act.fundId);
    if (!fund) continue;
    const nav = fund.navHistory[fund.navHistory.length - 1];
    const cost = nav * act.shares;
    const fee = cost * fund.feeRate;
    if (act.action === "买入") {
      totalCost += cost + fee;
      totalFee += fee;
    } else if (act.action === "卖出") {
      totalCost -= cost - fee;
      totalFee += fee;
    }
  }

  const hasActions = pendingActions.length > 0;

  return (
    <div>
      <div className="text-xs text-[#D4A843]/60 font-bold uppercase tracking-wider mb-3">调仓操作</div>

      <RuleHint />

      {pendingActions.length === 0 ? (
        <div className="text-center py-6 text-white/20 text-xs">
          在左侧基金卡上选择操作
        </div>
      ) : (
        <div className="space-y-2 mb-3">
          {pendingActions.map((act) => {
            const fund = funds.find((f) => f.fundId === act.fundId);
            if (!fund) return null;
            const nav = fund.navHistory[fund.navHistory.length - 1];
            const cost = nav * act.shares;
            const fee = cost * fund.feeRate;
            return (
              <div
                key={act.fundId}
                className={`flex items-center gap-2 bg-white/5 rounded-lg p-2 border ${
                  act.action === "买入"
                    ? "border-emerald-500/20"
                    : act.action === "卖出"
                    ? "border-red-500/20"
                    : "border-white/5"
                }`}
              >
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    act.action === "买入"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {act.action}
                </span>
                <span className="text-xs text-white/70 flex-1">{fund.name}</span>
                <span className="text-[10px] font-mono text-white/50">
                  {act.shares}份
                </span>
                <span className="text-[10px] font-mono text-[#D4A843]/60 flex items-center gap-0.5">
                  <Coins size={9} />
                  费{fee.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {hasActions && (
        <div className="bg-white/3 rounded-lg p-3 mb-3 border border-white/5">
          <div className="flex justify-between text-xs text-white/40 mb-1">
            <span>操作净额</span>
            <span className={`font-mono ${totalCost >= 0 ? "text-amber-300" : "text-emerald-300"}`}>
              {totalCost >= 0 ? "-" : "+"}{Math.abs(totalCost).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-white/40 mb-1">
            <span>手续费合计</span>
            <span className="font-mono text-[#D4A843]/60">{totalFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-white/60 border-t border-white/5 pt-1 mt-1">
            <span>剩余资金</span>
            <span className="font-mono text-white/80">{(cash - Math.max(0, totalCost)).toFixed(2)}</span>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmitRound}
        disabled={!hasActions}
        className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
          hasActions
            ? "bg-gradient-to-r from-[#D4A843] to-[#b8922e] text-[#0a1f1c] hover:shadow-lg hover:shadow-[#D4A843]/30 active:scale-[0.98]"
            : "bg-white/5 text-white/20 cursor-not-allowed"
        }`}
      >
        确认调仓 <ArrowRight size={14} />
      </button>
    </div>
  );
}
