import { RoundInfoBar } from "@/components/RoundInfoBar";
import { FundCardList } from "@/components/FundCardList";
import { RiskSlotPanel } from "@/components/RiskSlotPanel";
import { NewsEventPanel } from "@/components/NewsEventPanel";
import { ActionPanel } from "@/components/ActionPanel";
import { useGameStore } from "@/store/gameStore";

export default function GamePage() {
  const { phase } = useGameStore();

  if (phase !== "playing") return null;

  return (
    <div className="min-h-screen bg-[#0a1f1c] text-white">
      <RoundInfoBar />
      <div className="grid grid-cols-12 gap-4 p-4 max-w-[1600px] mx-auto">
        <div className="col-span-3">
          <div className="sticky top-4">
            <div className="text-xs text-[#D4A843]/60 font-bold uppercase tracking-wider mb-3">基金卡牌</div>
            <FundCardList />
          </div>
        </div>
        <div className="col-span-6 space-y-4">
          <NewsEventPanel />
          <ActionPanel />
        </div>
        <div className="col-span-3">
          <div className="sticky top-4">
            <RiskSlotPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
