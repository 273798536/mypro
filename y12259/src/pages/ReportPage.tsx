import { useGameStore } from "@/store/gameStore";
import { RISK_COLORS } from "@/engine/ruleEngine";
import type { RiskType, RiskSection, TraceLink, FundCard, NewsEvent, RoundReport, FundDrawdown, FeeRecord } from "@/types";
import { ShieldAlert, Coins, Zap, FileDown, ArrowRight, Link2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const RISK_META: Record<RiskType, { icon: React.ReactNode; label: string; desc: string }> = {
  行业集中: {
    icon: <ShieldAlert size={18} />,
    label: "行业集中",
    desc: "过度集中于单一行业，回撤时损失放大",
  },
  手续费漏扣: {
    icon: <Coins size={18} />,
    label: "手续费漏扣",
    desc: "卖出操作未正确扣减手续费，结算时补扣+滞纳金",
  },
  恐慌卖出: {
    icon: <Zap size={18} />,
    label: "恐慌卖出",
    desc: "单回合大量卖出触发恐慌标记，额外损失",
  },
};

function RiskSectionCard({
  riskType,
  section,
  funds,
  events,
}: {
  riskType: RiskType;
  section: RiskSection;
  funds: FundCard[];
  events: NewsEvent[];
}) {
  const meta = RISK_META[riskType];
  const color = RISK_COLORS[riskType];
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: `${color}30`,
        background: `linear-gradient(135deg, ${color}08, transparent)`,
      }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span style={{ color }}>{meta.icon}</span>
            <span className="text-base font-bold" style={{ color }}>
              {meta.label}
            </span>
          </div>
          <span className="text-sm font-mono" style={{ color: `${color}90` }}>
            触发 {section.totalTriggers} 次
          </span>
        </div>
        <p className="text-xs text-white/40 mb-3">{meta.desc}</p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white/3 rounded-lg p-2">
            <div className="text-[10px] text-white/30 mb-1">涉及基金</div>
            <div className="flex flex-wrap gap-1">
              {section.affectedFunds.map((fid) => {
                const f = funds.find((ff) => ff.fundId === fid);
                return (
                  <span key={fid} className="text-[10px] px-1.5 py-0.5 rounded border" style={{ borderColor: `${color}30`, color: `${color}90`, background: `${color}10` }}>
                    {f?.name || fid}
                  </span>
                );
              })}
              {section.affectedFunds.length === 0 && <span className="text-[10px] text-white/20">无</span>}
            </div>
          </div>
          <div className="bg-white/3 rounded-lg p-2">
            <div className="text-[10px] text-white/30 mb-1">涉及回合</div>
            <div className="flex flex-wrap gap-1">
              {section.affectedRounds.map((rid) => (
                <span key={rid} className="text-[10px] font-mono px-1.5 py-0.5 rounded border" style={{ borderColor: `${color}30`, color: `${color}90`, background: `${color}10` }}>
                  {rid}
                </span>
              ))}
              {section.affectedRounds.length === 0 && <span className="text-[10px] text-white/20">无</span>}
            </div>
          </div>
        </div>

        {section.triggers.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/50 transition-colors"
          >
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {expanded ? "收起详情" : "展开详情"}
          </button>
        )}

        {expanded && (
          <div className="mt-2 space-y-1.5">
            {section.triggers.map((t) => (
              <div key={t.id} className="bg-white/3 rounded-lg p-2 border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono" style={{ color: `${color}70` }}>{t.roundId}</span>
                  <span className="text-[10px] font-mono text-white/20">{t.ruleId}</span>
                </div>
                <div className="text-[10px] text-white/50">{t.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TracePanel({
  links,
  funds,
  events,
  drawdowns,
  feeRecords,
}: {
  links: TraceLink[];
  funds: FundCard[];
  events: NewsEvent[];
  drawdowns: FundDrawdown[];
  feeRecords: FeeRecord[];
}) {
  const [selectedFund, setSelectedFund] = useState<string | null>(null);

  const fundLinks = links.filter((l) => !selectedFund || l.fundId === selectedFund);
  const uniqueFundIds = [...new Set(links.map((l) => l.fundId))];

  return (
    <div className="bg-white/3 border border-white/5 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Link2 size={14} className="text-[#D4A843]/60" />
        <span className="text-sm font-bold text-white/70">追溯链路</span>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        <button
          onClick={() => setSelectedFund(null)}
          className={`text-[10px] px-2 py-1 rounded border transition-all ${
            !selectedFund
              ? "bg-[#D4A843]/20 text-[#D4A843] border-[#D4A843]/30"
              : "bg-white/5 text-white/30 border-white/10 hover:bg-white/10"
          }`}
        >
          全部
        </button>
        {uniqueFundIds.map((fid) => {
          const f = funds.find((ff) => ff.fundId === fid);
          return (
            <button
              key={fid}
              onClick={() => setSelectedFund(fid)}
              className={`text-[10px] px-2 py-1 rounded border transition-all ${
                selectedFund === fid
                  ? "bg-[#D4A843]/20 text-[#D4A843] border-[#D4A843]/30"
                  : "bg-white/5 text-white/30 border-white/10 hover:bg-white/10"
              }`}
            >
              {f?.name || fid}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {fundLinks.map((link, i) => {
          const fund = funds.find((f) => f.fundId === link.fundId);
          const event = events.find((e) => e.eventId === link.eventId);
          const dd = drawdowns.find((d) => d.id === link.drawdownId);
          const fr = feeRecords.find((f) => f.id === link.feeRecordId);

          return (
            <div key={i} className="flex items-center gap-2 bg-white/3 rounded-lg p-2 text-[10px]">
              <div className="bg-[#D4A843]/10 text-[#D4A843]/80 border border-[#D4A843]/15 px-2 py-1 rounded font-mono">
                {fund?.name || link.fundId}
              </div>
              <ArrowRight size={10} className="text-white/20" />
              <div className="bg-blue-500/10 text-blue-300/70 border border-blue-500/15 px-2 py-1 rounded font-mono">
                {link.roundId}
              </div>
              {event && (
                <>
                  <ArrowRight size={10} className="text-white/20" />
                  <div className="bg-red-500/10 text-red-300/70 border border-red-500/15 px-2 py-1 rounded font-mono">
                    {event.eventId} {event.title.slice(0, 8)}...
                  </div>
                </>
              )}
              {dd && (
                <>
                  <ArrowRight size={10} className="text-white/20" />
                  <div className="bg-amber-500/10 text-amber-300/70 border border-amber-500/15 px-2 py-1 rounded font-mono">
                    回撤-{dd.drawdownAmount.toFixed(0)}
                  </div>
                </>
              )}
              {fr && fr.feeAmount > 0 && (
                <>
                  <ArrowRight size={10} className="text-white/20" />
                  <div className="bg-purple-500/10 text-purple-300/70 border border-purple-500/15 px-2 py-1 rounded font-mono">
                    费{fr.feeAmount.toFixed(0)}
                  </div>
                </>
              )}
            </div>
          );
        })}
        {fundLinks.length === 0 && (
          <div className="text-center py-4 text-white/20 text-xs">无追溯记录</div>
        )}
      </div>
    </div>
  );
}

function RoundTimeline({ rounds, funds, events }: { rounds: RoundReport[]; funds: FundCard[]; events: NewsEvent[] }) {
  const [expandedRound, setExpandedRound] = useState<string | null>(null);

  return (
    <div className="bg-white/3 border border-white/5 rounded-xl p-4">
      <div className="text-sm font-bold text-white/70 mb-3">回合时间线</div>
      <div className="space-y-2">
        {rounds.map((round) => {
          const isExpanded = expandedRound === round.roundId;
          const event = events.find((e) => e.roundId === round.roundId);
          const hasViolations = round.feedbacks.some((fb) => fb.violated);

          return (
            <div key={round.roundId} className="border border-white/5 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedRound(isExpanded ? null : round.roundId)}
                className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
                  isExpanded ? "bg-white/5" : "hover:bg-white/3"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#D4A843]/70">{round.roundId}</span>
                  {event && <span className="text-xs text-white/40">{event.title}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {hasViolations && (
                    <span className="text-[10px] bg-red-500/15 text-red-300/70 px-1.5 py-0.5 rounded">有违规</span>
                  )}
                  {round.drawdowns.length > 0 && (
                    <span className="text-[10px] bg-amber-500/15 text-amber-300/70 px-1.5 py-0.5 rounded">
                      回撤×{round.drawdowns.length}
                    </span>
                  )}
                  {isExpanded ? <ChevronUp size={12} className="text-white/30" /> : <ChevronDown size={12} className="text-white/30" />}
                </div>
              </button>

              {isExpanded && (
                <div className="p-3 pt-0 space-y-2 border-t border-white/5">
                  {round.drawdowns.length > 0 && (
                    <div className="mt-2">
                      <div className="text-[10px] text-white/30 mb-1">回撤记录</div>
                      {round.drawdowns.map((dd) => {
                        const fund = funds.find((f) => f.fundId === dd.fundId);
                        return (
                          <div key={dd.id} className="text-[10px] text-white/40 flex items-center gap-2">
                            <span className="text-white/50">{fund?.name || dd.fundId}</span>
                            <span className="text-red-300/70 font-mono">-{dd.drawdownAmount.toFixed(2)}</span>
                            <span className="text-white/20">|</span>
                            <span className="font-mono text-[#D4A843]/50">{dd.eventId}</span>
                            <span className="text-white/20">|</span>
                            <span className="font-mono text-white/30">{dd.ruleApplied}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {round.fees.length > 0 && (
                    <div>
                      <div className="text-[10px] text-white/30 mb-1">手续费记录</div>
                      {round.fees.map((fr) => {
                        const fund = funds.find((f) => f.fundId === fr.fundId);
                        return (
                          <div key={fr.id} className="text-[10px] text-white/40 flex items-center gap-2">
                            <span className="text-white/50">{fund?.name || fr.fundId}</span>
                            <span className="text-[#D4A843]/70 font-mono">{fr.feeAmount.toFixed(2)}</span>
                            {fr.omitReason && <span className="text-white/30">{fr.omitReason}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {round.feedbacks.filter((fb) => fb.violated).length > 0 && (
                    <div>
                      <div className="text-[10px] text-white/30 mb-1">违规反馈</div>
                      {round.feedbacks
                        .filter((fb) => fb.violated)
                        .map((fb) => (
                          <div key={fb.id} className="text-[10px] text-red-300/60 bg-red-500/5 rounded p-1.5 mb-1">
                            <span className="font-mono text-red-300/80">{fb.ruleId}</span> {fb.explanation}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { phase, report, funds, newsEvents, drawdowns, feeRecords, handleReset } = useGameStore();

  if (phase !== "report" || !report) return null;

  const handleExport = () => {
    const correspondence = report.traceLinks.map((l) => {
      const fund = funds.find((f) => f.fundId === l.fundId);
      const event = newsEvents.find((e) => e.eventId === l.eventId);
      return {
        基金卡ID: l.fundId,
        基金卡名称: fund?.name || "",
        新闻事件ID: l.eventId,
        新闻事件标题: event?.title || "",
        回撤记录ID: l.drawdownId,
        手续费记录ID: l.feeRecordId,
        回合ID: l.roundId,
      };
    });

    const exportData = {
      通关报告: {
        总分: report.totalScore,
        满分: report.maxScore,
        存活回合: report.survivalRounds,
      },
      行业集中风险: report.riskBreakdown.industryConcentration,
      手续费漏扣风险: report.riskBreakdown.feeOmission,
      恐慌卖出风险: report.riskBreakdown.panicSelling,
      对应关系表: correspondence,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "基金回撤生存赛-通关报告.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const survivalPct = (report.totalScore / report.maxScore) * 100;
  const grade =
    survivalPct >= 90 ? { label: "S", color: "#D4A843", desc: "卓越风控" } :
    survivalPct >= 75 ? { label: "A", color: "#4ade80", desc: "优秀生存" } :
    survivalPct >= 60 ? { label: "B", color: "#60a5fa", desc: "基本合格" } :
    survivalPct >= 40 ? { label: "C", color: "#f59e0b", desc: "风险偏高" } :
    { label: "D", color: "#ef4444", desc: "严重亏损" };

  return (
    <div className="min-h-screen bg-[#0a1f1c] text-white">
      <div className="border-b border-[#D4A843]/15 px-6 py-3">
        <div className="flex items-center justify-between max-w-[1200px] mx-auto">
          <h1 className="text-lg font-bold text-[#D4A843]">通关报告</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-[#D4A843]/10 text-[#D4A843] border border-[#D4A843]/20 px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#D4A843]/20 transition-all"
            >
              <FileDown size={14} /> 导出报告
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 bg-white/5 text-white/40 border border-white/10 px-4 py-2 rounded-lg text-xs hover:bg-white/10 transition-all"
            >
              重新开始
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto p-6 space-y-6">
        <div className="flex items-center gap-6 bg-gradient-to-r from-[#0f2f2a] to-[#0a1f1c] border border-[#D4A843]/20 rounded-xl p-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-bold"
            style={{ background: `${grade.color}15`, color: grade.color, border: `2px solid ${grade.color}40` }}
          >
            {grade.label}
          </div>
          <div>
            <div className="text-2xl font-bold text-white/90 mb-1">
              {report.totalScore.toLocaleString()} <span className="text-sm text-white/30">/ {report.maxScore.toLocaleString()}</span>
            </div>
            <div className="text-sm" style={{ color: grade.color }}>{grade.desc}</div>
            <div className="text-xs text-white/30 mt-1">存活 {report.survivalRounds} 回合</div>
          </div>
          <div className="ml-auto">
            <div className="w-32 h-32 relative">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke={grade.color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${survivalPct * 3.14} 314`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-mono font-bold" style={{ color: grade.color }}>
                  {survivalPct.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs text-[#D4A843]/60 font-bold uppercase tracking-wider mb-3">分项风险说明</div>
          <div className="grid grid-cols-3 gap-4">
            <RiskSectionCard
              riskType="行业集中"
              section={report.riskBreakdown.industryConcentration}
              funds={funds}
              events={newsEvents}
            />
            <RiskSectionCard
              riskType="手续费漏扣"
              section={report.riskBreakdown.feeOmission}
              funds={funds}
              events={newsEvents}
            />
            <RiskSectionCard
              riskType="恐慌卖出"
              section={report.riskBreakdown.panicSelling}
              funds={funds}
              events={newsEvents}
            />
          </div>
        </div>

        <TracePanel
          links={report.traceLinks}
          funds={funds}
          events={newsEvents}
          drawdowns={drawdowns}
          feeRecords={feeRecords}
        />

        <RoundTimeline rounds={report.rounds} funds={funds} events={newsEvents} />

        <div className="bg-white/3 border border-white/5 rounded-xl p-4">
          <div className="text-sm font-bold text-white/70 mb-3">对应关系表（基金卡 ↔ 新闻事件 ↔ 结果）</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/30 border-b border-white/5">
                  <th className="text-left py-2 px-2 font-normal">基金卡ID</th>
                  <th className="text-left py-2 px-2 font-normal">基金名称</th>
                  <th className="text-left py-2 px-2 font-normal">新闻事件ID</th>
                  <th className="text-left py-2 px-2 font-normal">事件标题</th>
                  <th className="text-left py-2 px-2 font-normal">回撤记录ID</th>
                  <th className="text-left py-2 px-2 font-normal">手续费记录ID</th>
                  <th className="text-left py-2 px-2 font-normal">回合</th>
                </tr>
              </thead>
              <tbody>
                {report.traceLinks.map((link, i) => {
                  const fund = funds.find((f) => f.fundId === link.fundId);
                  const event = newsEvents.find((e) => e.eventId === link.eventId);
                  return (
                    <tr key={i} className="border-b border-white/3 hover:bg-white/3 transition-colors">
                      <td className="py-2 px-2 font-mono text-[#D4A843]/60">{link.fundId}</td>
                      <td className="py-2 px-2 text-white/60">{fund?.name || "-"}</td>
                      <td className="py-2 px-2 font-mono text-red-300/60">{link.eventId || "-"}</td>
                      <td className="py-2 px-2 text-white/40 max-w-[120px] truncate">{event?.title || "-"}</td>
                      <td className="py-2 px-2 font-mono text-amber-300/50">{link.drawdownId || "-"}</td>
                      <td className="py-2 px-2 font-mono text-purple-300/50">{link.feeRecordId || "-"}</td>
                      <td className="py-2 px-2 font-mono text-white/30">{link.roundId}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
