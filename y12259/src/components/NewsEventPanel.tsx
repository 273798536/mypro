import { useGameStore } from "@/store/gameStore";
import { Newspaper, Link2 } from "lucide-react";
import type { NewsEvent } from "@/types";

function EventCard({ event, funds }: { event: NewsEvent; funds: { fundId: string; name: string; industry: string }[] }) {
  const affectedFunds = funds.filter((f) => event.affectedIndustries.includes(f.industry));

  return (
    <div className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f23]/80 border border-[#D4A843]/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Newspaper size={16} className="text-[#D4A843]" />
        <span className="text-xs font-mono text-[#D4A843]/70 bg-[#D4A843]/10 px-2 py-0.5 rounded">
          {event.eventId}
        </span>
        <span className="text-xs text-white/30">|</span>
        <span className="text-xs text-red-400 font-mono">
          冲击 -{(event.impactRate * 100).toFixed(0)}%
        </span>
      </div>

      <h3 className="text-base font-bold text-white/90 mb-2">{event.title}</h3>
      <p className="text-xs text-white/50 leading-relaxed mb-3">{event.description}</p>

      <div className="border-t border-white/5 pt-2">
        <div className="flex items-center gap-1 mb-1.5">
          <Link2 size={10} className="text-[#D4A843]/50" />
          <span className="text-[10px] text-[#D4A843]/50">受影响基金</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {affectedFunds.map((f) => (
            <span
              key={f.fundId}
              className="text-[10px] bg-red-500/10 text-red-300/80 border border-red-500/20 px-1.5 py-0.5 rounded"
            >
              {f.name}
            </span>
          ))}
          {affectedFunds.length === 0 && (
            <span className="text-[10px] text-white/20">无直接受影响基金</span>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {event.affectedIndustries.map((ind) => (
          <span
            key={ind}
            className="text-[10px] bg-[#D4A843]/10 text-[#D4A843]/70 px-1.5 py-0.5 rounded border border-[#D4A843]/15"
          >
            {ind}
          </span>
        ))}
      </div>
    </div>
  );
}

export function NewsEventPanel() {
  const { newsEvents, funds, currentRound } = useGameStore();
  const currentEvent = newsEvents.find((ne) => ne.roundId === `R${currentRound}`);

  if (!currentEvent) return null;

  return (
    <div>
      <div className="text-xs text-[#D4A843]/60 font-bold uppercase tracking-wider mb-3">市场事件</div>
      <EventCard
        event={currentEvent}
        funds={funds.map((f) => ({ fundId: f.fundId, name: f.name, industry: f.industry }))}
      />
    </div>
  );
}
