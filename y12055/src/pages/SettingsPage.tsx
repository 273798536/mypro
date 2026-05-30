import { useGameStore } from "@/store/gameStore";
import { useState } from "react";
import type { GameSettings } from "@/physics/types";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const engine = useGameStore((s) => s.engine);
  const initGame = useGameStore((s) => s.initGame);
  const navigate = useNavigate();

  const [settings, setSettings] = useState<GameSettings>({
    enableDensityZones: engine.settings.enableDensityZones,
    enableOxygen: engine.settings.enableOxygen,
    enableCollision: engine.settings.enableCollision,
    withTreasure: engine.settings.withTreasure,
  });

  const handleSave = () => {
    initGame(settings);
    navigate("/game");
  };

  const Toggle = ({
    label,
    description,
    checked,
    onChange,
    color,
  }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    color: string;
  }) => (
    <div className="flex items-center justify-between p-3 bg-[#0d1f33] rounded-lg">
      <div>
        <div className="text-sm text-[#ccdde8]">{label}</div>
        <div className="text-[10px] text-[#556677] mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
          checked ? `bg-[${color}]` : "bg-[#1a2a3a]"
        }`}
        style={{ backgroundColor: checked ? color : "#1a2a3a" }}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a1628] p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => navigate("/")}
            className="p-1.5 rounded-lg hover:bg-[#1a2a3a] text-[#667788] hover:text-[#8899aa] transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <h1
            className="text-lg font-bold text-[#e9b44c]"
            style={{ fontFamily: "'Orbitron', monospace" }}
          >
            边界条件设置
          </h1>
        </div>

        <div className="space-y-3">
          <Toggle
            label="密度突变区域"
            description="水密度随深度变化，触发浮力重新计算"
            checked={settings.enableDensityZones}
            onChange={(v) => setSettings({ ...settings, enableDensityZones: v })}
            color="#ffa500"
          />
          <Toggle
            label="氧气耗尽"
            description="氧气倒计时归零则游戏失败"
            checked={settings.enableOxygen}
            onChange={(v) => setSettings({ ...settings, enableOxygen: v })}
            color="#d8315b"
          />
          <Toggle
            label="碰撞检测"
            description="碰到障碍物触发碰撞误判边界"
            checked={settings.enableCollision}
            onChange={(v) => setSettings({ ...settings, enableCollision: v })}
            color="#e9b44c"
          />
          <Toggle
            label="宝箱模式"
            description="加入宝箱，收集后增加质量和体积"
            checked={settings.withTreasure}
            onChange={(v) => setSettings({ ...settings, withTreasure: v })}
            color="#4cd137"
          />
        </div>

        <div className="mt-6 bg-[#0d1f33] border border-[#1b4965]/30 rounded-lg p-4">
          <h3 className="text-xs text-[#8899aa] mb-2">边界样例说明</h3>
          <div className="space-y-2 text-[10px]">
            <div>
              <span className="text-[#ffa500] font-bold">密度突变</span>
              <span className="text-[#667788]"> — 深度20-30m密度增至1025kg/m³，35-45m密度增至1050kg/m³，F浮突然变化</span>
            </div>
            <div>
              <span className="text-[#d8315b] font-bold">氧气耗尽</span>
              <span className="text-[#667788]"> — 120秒倒计时，低于20%时红色警告，归零则失败</span>
            </div>
            <div>
              <span className="text-[#e9b44c] font-bold">碰撞误判</span>
              <span className="text-[#667788]"> — 障碍物边界较小，碰撞判定范围比视觉范围略大，演示误判场景</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full mt-6 flex items-center justify-center gap-2 bg-[#3e92cc] text-white font-bold py-3 rounded-lg hover:bg-[#4da3dd] active:scale-95 transition-all"
        >
          <Save size={16} />
          保存并开始游戏
        </button>
      </div>
    </div>
  );
}
