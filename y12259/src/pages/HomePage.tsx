import { useGameStore } from "@/store/gameStore";
import { ShieldAlert, Coins, Zap, Play, BookOpen, TrendingDown } from "lucide-react";

export default function HomePage() {
  const { phase, handleStartGame } = useGameStore();

  if (phase !== "idle") return null;

  return (
    <div className="min-h-screen bg-[#0a1f1c] text-white flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,168,67,0.06)_0%,_transparent_60%)]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4A843]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 text-center max-w-xl mx-auto px-6">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-[#D4A843]/10 border border-[#D4A843]/20 rounded-full px-4 py-1.5 mb-6">
            <TrendingDown size={14} className="text-[#D4A843]" />
            <span className="text-xs text-[#D4A843]/70">投教模拟游戏</span>
          </div>
        </div>

        <h1 className="text-4xl font-bold mb-3 leading-tight">
          <span className="text-[#D4A843]">基金回撤</span>生存赛
        </h1>
        <p className="text-sm text-white/40 mb-8 leading-relaxed max-w-md mx-auto">
          在市场回撤中做出调仓决策，体验手续费、行业集中、恐慌卖出等真实风险约束。
          每一次操作都有规则可循，每一个结果都可追溯。
        </p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white/3 border border-[#E63946]/15 rounded-xl p-3 text-center">
            <ShieldAlert size={20} className="text-[#E63946] mx-auto mb-2" />
            <div className="text-xs font-bold text-[#E63946]/80 mb-0.5">行业集中</div>
            <div className="text-[10px] text-white/30">过度集中单一行业</div>
          </div>
          <div className="bg-white/3 border border-[#F4A261]/15 rounded-xl p-3 text-center">
            <Coins size={20} className="text-[#F4A261] mx-auto mb-2" />
            <div className="text-xs font-bold text-[#F4A261]/80 mb-0.5">手续费漏扣</div>
            <div className="text-[10px] text-white/30">未正确扣减费用</div>
          </div>
          <div className="bg-white/3 border border-[#7B2D8E]/15 rounded-xl p-3 text-center">
            <Zap size={20} className="text-[#7B2D8E] mx-auto mb-2" />
            <div className="text-xs font-bold text-[#7B2D8E]/80 mb-0.5">恐慌卖出</div>
            <div className="text-[10px] text-white/30">大量卖出触发惩罚</div>
          </div>
        </div>

        <button
          onClick={handleStartGame}
          className="inline-flex items-center gap-3 bg-gradient-to-r from-[#D4A843] to-[#b8922e] text-[#0a1f1c] px-8 py-3.5 rounded-xl font-bold text-base hover:shadow-xl hover:shadow-[#D4A843]/30 transition-all duration-300 active:scale-[0.97]"
        >
          <Play size={18} />
          开始挑战
        </button>

        <div className="mt-8 flex items-center justify-center gap-4 text-[10px] text-white/20">
          <span className="flex items-center gap-1"><BookOpen size={10} /> 6回合</span>
          <span>·</span>
          <span>8只基金</span>
          <span>·</span>
          <span>8条规则</span>
          <span>·</span>
          <span>可追溯报告</span>
        </div>
      </div>
    </div>
  );
}
