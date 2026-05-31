import { useGameStore } from "@/store/gameStore";
import { ArrowRight, TrendingDown, Coins, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { RISK_COLORS } from "@/engine/ruleEngine";

export default function SettlementPage() {
  const {
    phase,
    currentRound,
    drawdowns,
    feeRecords,
    ruleFeedbacks,
    riskTriggers,
    funds,
    newsEvents,
    handleNextRound,
    totalRounds,
  } = useGameStore();

  if (phase !== "settlement") return null;

  const roundId = `R${currentRound}`;
  const roundDrawdowns = drawdowns.filter((d) => d.roundId === roundId);
  const roundFees = feeRecords.filter((f) => f.roundId === roundId);
  const roundFeedbacks = ruleFeedbacks.filter((fb) => fb.roundId === roundId);
  const roundTriggers = riskTriggers.filter((t) => t.roundId === roundId);
  const roundEvent = newsEvents.find((ne) => ne.roundId === roundId);

  const isLastRound = currentRound >= totalRounds;

  return (
    <div className="min-h-screen bg-[#0a1f1c] text-white">
      <div className="border-b border-[#D4A843]/15 px-6 py-3">
        <div className="flex items-center justify-between max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3">
            <TrendingDown size={18} className="text-[#D4A843]" />
            <h1 className="text-lg font-bold text-white/90">
              第 {currentRound} 回合结算
            </h1>
            {roundEvent && (
              <span className="text-xs text-white/30 font-mono">{roundEvent.eventId} | {roundEvent.title}</span>
            )}
          </div>
          <button
            onClick={handleNextRound}
            className="flex items-center gap-2 bg-gradient-to-r from-[#D4A843] to-[#b8922e] text-[#0a1f1c] px-5 py-2 rounded-lg font-bold text-sm hover:shadow-lg hover:shadow-[#D4A843]/30 transition-all active:scale-[0.98]"
          >
            {isLastRound ? "查看通关报告" : "下一回合"} <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto p-6 space-y-6">
        {roundTriggers.length > 0 && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-sm font-bold text-red-300">风险触发</span>
            </div>
            <div className="space-y-2">
              {roundTriggers.map((t) => (
                <div key={t.id} className="flex items-start gap-3 bg-red-500/5 rounded-lg p-3">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: RISK_COLORS[t.riskType] }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold" style={{ color: RISK_COLORS[t.riskType] }}>
                        {t.riskType}
                      </span>
                      <span className="text-[10px] font-mono text-white/30">{t.ruleId}</span>
                    </div>
                    <div className="text-xs text-white/60">{t.description}</div>
                    <div className="text-[10px] text-white/30 mt-1">
                      涉及基金: {t.fundIds.map((fid) => {
                        const f = funds.find((ff) => ff.fundId === fid);
                        return f?.name || fid;
                      }).join("、")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white/3 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={14} className="text-red-400/60" />
              <span className="text-sm font-bold text-white/70">回撤结算明细</span>
            </div>
            {roundDrawdowns.length === 0 ? (
              <div className="text-center py-6 text-white/20 text-xs">本轮无回撤</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-white/30 border-b border-white/5">
                    <th className="text-left py-2 font-normal">基金</th>
                    <th className="text-right py-2 font-normal">回撤金额</th>
                    <th className="text-right py-2 font-normal">回撤率</th>
                    <th className="text-center py-2 font-normal">事件</th>
                    <th className="text-center py-2 font-normal">规则</th>
                  </tr>
                </thead>
                <tbody>
                  {roundDrawdowns.map((dd) => {
                    const fund = funds.find((f) => f.fundId === dd.fundId);
                    return (
                      <tr key={dd.id} className="border-b border-white/3">
                        <td className="py-2 text-white/60">{fund?.name || dd.fundId}</td>
                        <td className="py-2 text-right font-mono text-red-300">-{dd.drawdownAmount.toFixed(2)}</td>
                        <td className="py-2 text-right font-mono text-red-300/70">-{dd.drawdownRate.toFixed(2)}%</td>
                        <td className="py-2 text-center font-mono text-[#D4A843]/50">{dd.eventId}</td>
                        <td className="py-2 text-center font-mono text-white/30">{dd.ruleApplied}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white/3 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Coins size={14} className="text-[#D4A843]/60" />
              <span className="text-sm font-bold text-white/70">手续费计算明细</span>
            </div>
            {roundFees.length === 0 ? (
              <div className="text-center py-6 text-white/20 text-xs">本轮无手续费</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-white/30 border-b border-white/5">
                    <th className="text-left py-2 font-normal">操作</th>
                    <th className="text-left py-2 font-normal">基金</th>
                    <th className="text-right py-2 font-normal">手续费</th>
                    <th className="text-center py-2 font-normal">漏扣</th>
                    <th className="text-left py-2 font-normal">原因</th>
                  </tr>
                </thead>
                <tbody>
                  {roundFees.map((fr) => {
                    const fund = funds.find((f) => f.fundId === fr.fundId);
                    return (
                      <tr key={fr.id} className="border-b border-white/3">
                        <td className="py-2 text-white/50">{fr.actionType}</td>
                        <td className="py-2 text-white/60">{fund?.name || fr.fundId}</td>
                        <td className="py-2 text-right font-mono text-[#D4A843]/70">{fr.feeAmount.toFixed(2)}</td>
                        <td className="py-2 text-center">
                          {fr.omitted ? (
                            <XCircle size={12} className="text-red-400 inline" />
                          ) : (
                            <CheckCircle size={12} className="text-emerald-400/50 inline" />
                          )}
                        </td>
                        <td className="py-2 text-[10px] text-white/30 max-w-[150px] truncate">{fr.omitReason || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-white/3 border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-400/60" />
            <span className="text-sm font-bold text-white/70">规则匹配反馈</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {roundFeedbacks.map((fb) => (
              <div
                key={fb.id}
                className={`rounded-lg p-3 border ${
                  fb.violated
                    ? "bg-red-500/5 border-red-500/20"
                    : "bg-emerald-500/5 border-emerald-500/10"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {fb.violated ? (
                    <XCircle size={12} className="text-red-400" />
                  ) : (
                    <CheckCircle size={12} className="text-emerald-400/60" />
                  )}
                  <span className={`text-xs font-bold font-mono ${fb.violated ? "text-red-300" : "text-emerald-300/60"}`}>
                    {fb.ruleId}
                  </span>
                </div>
                <div className="text-[10px] text-white/50 mb-1">{fb.explanation}</div>
                {fb.violated && (
                  <div className="text-[10px] space-y-0.5 mt-2 pt-2 border-t border-white/5">
                    <div className="text-white/40">
                      <span className="text-red-300/60">你的操作：</span>{fb.playerAction}
                    </div>
                    <div className="text-white/40">
                      <span className="text-emerald-300/60">正确做法：</span>{fb.correctAction}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
