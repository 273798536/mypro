import { useGameStore } from "@/store/gameStore";
import type { GameSettings } from "@/physics/types";
import { Anchor, Gem, Settings, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const initGame = useGameStore((s) => s.initGame);
  const navigate = useNavigate();

  const handleStart = (withTreasure: boolean) => {
    const settings: GameSettings = {
      enableDensityZones: true,
      enableOxygen: true,
      enableCollision: true,
      withTreasure,
    };
    initGame(settings);
    navigate("/game");
  };

  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Anchor size={40} className="text-[#3e92cc]" />
          </div>
          <h1
            className="text-3xl font-bold text-[#e9b44c] mb-2"
            style={{ fontFamily: "'Orbitron', monospace" }}
          >
            浮力潜艇寻宝
          </h1>
          <p className="text-sm text-[#778899] leading-relaxed">
            通过操控潜艇和压载舱，直观理解阿基米德原理
            <br />
            每一步操作都会触发浮力重新计算 F浮 = ρ液 × g × V排
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => handleStart(false)}
            className="w-full flex items-center gap-4 p-5 bg-[#0d1f33] border border-[#1b4965]/50 rounded-xl hover:border-[#3e92cc]/50 hover:bg-[#122a42] transition-all group"
          >
            <div className="w-12 h-12 rounded-lg bg-[#3e92cc]/10 flex items-center justify-center group-hover:bg-[#3e92cc]/20 transition-all">
              <Play size={24} className="text-[#3e92cc]" />
            </div>
            <div className="text-left">
              <div className="text-base font-bold text-[#ccdde8]">
                潜艇 + 压载舱
              </div>
              <div className="text-xs text-[#667788] mt-0.5">
                第一阶段：仅潜艇和压载舱，专注浮力基础计算
              </div>
            </div>
          </button>

          <button
            onClick={() => handleStart(true)}
            className="w-full flex items-center gap-4 p-5 bg-[#1a1508] border border-[#e9b44c]/30 rounded-xl hover:border-[#e9b44c]/60 hover:bg-[#221c0c] transition-all group"
          >
            <div className="w-12 h-12 rounded-lg bg-[#e9b44c]/10 flex items-center justify-center group-hover:bg-[#e9b44c]/20 transition-all">
              <Gem size={24} className="text-[#e9b44c]" />
            </div>
            <div className="text-left">
              <div className="text-base font-bold text-[#e9b44c]">
                含宝箱模式
              </div>
              <div className="text-xs text-[#997744] mt-0.5">
                第二阶段：加入宝箱，对比前后浮力变化明细
              </div>
            </div>
          </button>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          <div className="bg-[#0d1f33] border border-[#1b4965]/30 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-[#3e92cc]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              F浮
            </div>
            <div className="text-[9px] text-[#556677] mt-1">浮力实时计算</div>
          </div>
          <div className="bg-[#0d1f33] border border-[#1b4965]/30 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-[#ffa500]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              ρ突
            </div>
            <div className="text-[9px] text-[#556677] mt-1">密度突变检测</div>
          </div>
          <div className="bg-[#0d1f33] border border-[#1b4965]/30 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-[#4cd137]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              ↩
            </div>
            <div className="text-[9px] text-[#556677] mt-1">失败回放分析</div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/settings")}
            className="inline-flex items-center gap-1.5 text-xs text-[#667788] hover:text-[#8899aa] transition-colors"
          >
            <Settings size={12} />
            边界条件设置
          </button>
        </div>
      </div>
    </div>
  );
}
