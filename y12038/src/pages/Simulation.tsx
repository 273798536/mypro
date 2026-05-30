import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wheat,
  TrendingDown,
  TrendingUp,
  Package,
  CloudRain,
  Sun,
  Droplets,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useGameStore, getLevelConfig } from "@/store/gameStore";
import type { Crop } from "@/types";
import { cn } from "@/lib/utils";

const STAGE_COLORS: Record<string, string> = {
  "\u79CD\u690D": "bg-green-700 text-green-100",
  "\u751F\u957F": "bg-lime-600 text-lime-100",
  "\u6210\u719F": "bg-yellow-600 text-yellow-100",
  "\u6536\u5272": "bg-amber-600 text-amber-100",
};

const LOG_COLORS: Record<string, string> = {
  info: "text-blue-400",
  success: "text-green-400",
  warning: "text-amber-400",
  danger: "text-red-400",
};

function weatherConfig(type: string) {
  switch (type) {
    case "\u66B4\u96E8":
      return { icon: <CloudRain className="w-5 h-5" />, bg: "bg-blue-900/40 border-blue-600/60", text: "text-blue-300" };
    case "\u5E72\u65F1":
      return { icon: <Droplets className="w-5 h-5" />, bg: "bg-orange-900/40 border-orange-600/60", text: "text-orange-300" };
    case "\u597D\u5929\u6C14":
      return { icon: <Sun className="w-5 h-5" />, bg: "bg-lime-900/40 border-lime-600/60", text: "text-lime-300" };
    default:
      return { icon: <Sun className="w-5 h-5" />, bg: "bg-green-900/40 border-green-600/60", text: "text-green-300" };
  }
}

function WarehouseGauge({ current, max, mini }: { current: number; max: number; mini?: boolean }) {
  const ratio = max > 0 ? current / max : 0;
  const color = ratio > 0.95 ? "#B84233" : ratio > 0.8 ? "#D97706" : "#22C55E";

  if (mini) {
    return (
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-[#C8A951]" />
        <div className="w-24 h-2 bg-[#1a241a] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${ratio * 100}%`, backgroundColor: color }} />
        </div>
        <span className="text-xs text-[#C8A951]">{current}/{max}</span>
      </div>
    );
  }

  const r = 70;
  const cx = 80;
  const cy = 80;
  const circ = Math.PI * r;
  const fill = circ * Math.min(ratio, 1);

  return (
    <div className="bg-[#2D3B2D] rounded-xl p-4 border border-[#3a4a3a]">
      <div className="flex items-center gap-2 mb-2">
        <Package className="w-4 h-4 text-[#C8A951]" />
        <h3 className="text-sm font-semibold text-[#C8A951]">\u4ED3\u5E93</h3>
      </div>
      <svg viewBox="0 0 160 95" className="w-full max-w-[200px] mx-auto">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} stroke="#1a241a" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          stroke={color}
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circ}`}
          className="transition-all duration-700"
        />
        <text x={cx} y={cy - 15} textAnchor="middle" fill="#F5F0E8" fontSize="22" fontWeight="bold">
          {Math.round(ratio * 100)}%
        </text>
        <text x={cx} y={cy + 5} textAnchor="middle" fill="#9CA3AF" fontSize="11">
          {current.toLocaleString()} / {max.toLocaleString()} \u5428
        </text>
      </svg>
    </div>
  );
}

function TopBar() {
  const { levelId, turn, maxTurns, cash, warehouse } = useGameStore();
  const config = getLevelConfig(levelId);
  const levelName = config?.name ?? "\u672A\u77E5\u5173\u5361";

  return (
    <div className="bg-[#2D3B2D] rounded-xl px-6 py-3 border border-[#3a4a3a] flex items-center justify-between gap-6">
      <div className="flex items-center gap-3">
        <Wheat className="w-5 h-5 text-[#C8A951]" />
        <span className="text-lg font-bold text-[#C8A951]">{levelName}</span>
      </div>
      <span className="text-[#F5F0E8] font-mono text-sm">
        \u7B2C<span className="text-[#C8A951] font-bold text-lg mx-1">{turn}</span>/ {maxTurns} \u56DE\u5408
      </span>
      <div className="flex items-center gap-2">
        <span className="text-[#9CA3AF] text-sm">\u8D44\u91D1</span>
        <span className="text-[#C8A951] font-bold text-lg font-mono">\u00A5{cash.toLocaleString()}</span>
      </div>
      <WarehouseGauge current={warehouse.currentStock} max={warehouse.maxCapacity} mini />
    </div>
  );
}

function CropPanel({ crop }: { crop: Crop }) {
  const yieldRatio = crop.expectedYield > 0 ? crop.actualYield / crop.expectedYield : 0;
  return (
    <div className="bg-[#2D3B2D] rounded-xl p-4 border border-[#3a4a3a]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wheat className="w-4 h-4 text-[#C8A951]" />
          <span className="font-semibold text-[#F5F0E8]">{crop.name}</span>
        </div>
        <span className={cn("text-xs px-2 py-0.5 rounded-full", STAGE_COLORS[crop.growthStage] ?? "bg-gray-600 text-gray-100")}>
          {crop.growthStage}
        </span>
      </div>
      <div className="text-xs text-[#9CA3AF] space-y-1">
        <div className="flex justify-between">
          <span>\u79CD\u690D\u9762\u79EF</span>
          <span className="text-[#F5F0E8]">{crop.acreage} \u4EA9</span>
        </div>
        <div className="flex justify-between">
          <span>\u9884\u8BA1\u4EA7\u91CF</span>
          <span className="text-[#F5F0E8]">{crop.expectedYield.toLocaleString()} \u5428</span>
        </div>
        <div className="flex justify-between">
          <span>\u5B9E\u9645\u4EA7\u91CF</span>
          <span className={cn("font-semibold", crop.actualYield >= crop.expectedYield ? "text-green-400" : "text-amber-400")}>
            {crop.actualYield.toLocaleString()} \u5428
          </span>
        </div>
      </div>
      <div className="mt-3">
        <div className="w-full h-2 bg-[#1a241a] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 bg-[#C8A951]"
            style={{ width: `${Math.min(yieldRatio * 100, 100)}%` }}
          />
        </div>
        <div className="text-right text-xs text-[#9CA3AF] mt-1">{Math.round(yieldRatio * 100)}%</div>
      </div>
    </div>
  );
}

function WeatherBanner() {
  const weatherHistory = useGameStore((s) => s.weatherHistory);
  const current = weatherHistory[weatherHistory.length - 1];
  if (!current) return null;
  const cfg = weatherConfig(current.type);

  return (
    <div className={cn("rounded-xl px-5 py-3 border flex items-center gap-4", cfg.bg)}>
      {cfg.icon}
      <div>
        <span className={cn("font-semibold", cfg.text)}>{current.type}</span>
        <span className="text-[#9CA3AF] text-sm ml-3">{current.description}</span>
      </div>
    </div>
  );
}

function FuturesTable() {
  const futuresPositions = useGameStore((s) => s.futuresPositions);
  const turn = useGameStore((s) => s.turn);

  if (futuresPositions.length === 0) {
    return (
      <div className="bg-[#2D3B2D] rounded-xl p-4 border border-[#3a4a3a] text-center text-[#9CA3AF] text-sm">
        \u6682\u65E0\u671F\u8D27\u6301\u4ED3
      </div>
    );
  }

  return (
    <div className="bg-[#2D3B2D] rounded-xl border border-[#3a4a3a] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#3a4a3a]">
        <h3 className="text-sm font-semibold text-[#C8A951] flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />\u671F\u8D27\u6301\u4ED3
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#9CA3AF] text-xs border-b border-[#3a4a3a]">
              <th className="text-left px-4 py-2">\u54C1\u79CD</th>
              <th className="text-left px-4 py-2">\u65B9\u5411</th>
              <th className="text-right px-4 py-2">\u624B\u6570</th>
              <th className="text-right px-4 py-2">\u5F00\u4ED3\u4EF7</th>
              <th className="text-right px-4 py-2">\u73B0\u4EF7</th>
              <th className="text-right px-4 py-2">\u76C8\u4E8F</th>
              <th className="text-center px-4 py-2">\u5230\u671F</th>
              <th className="text-center px-4 py-2">\u72B6\u6001</th>
            </tr>
          </thead>
          <tbody>
            {futuresPositions.map((pos) => {
              const pnl =
                pos.direction === "\u7A7A\u5934"
                  ? (pos.openPrice - pos.currentPrice) * pos.lots * pos.contractMultiplier
                  : (pos.currentPrice - pos.openPrice) * pos.lots * pos.contractMultiplier;
              return (
                <tr key={pos.id} className="border-b border-[#3a4a3a]/50 hover:bg-[#364536]/50">
                  <td className="px-4 py-2 text-[#F5F0E8]">{pos.commodity}</td>
                  <td className="px-4 py-2">
                    <span className={cn("flex items-center gap-1", pos.direction === "\u591A\u5934" ? "text-green-400" : "text-red-400")}>
                      {pos.direction === "\u591A\u5934" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {pos.direction}
                    </span>
                  </td>
                  <td className="text-right px-4 py-2 text-[#F5F0E8] font-mono">{pos.lots}</td>
                  <td className="text-right px-4 py-2 text-[#F5F0E8] font-mono">{pos.openPrice.toLocaleString()}</td>
                  <td className="text-right px-4 py-2 text-[#F5F0E8] font-mono">{pos.currentPrice.toLocaleString()}</td>
                  <td className={cn("text-right px-4 py-2 font-mono font-semibold", pnl >= 0 ? "text-green-400" : "text-red-400")}>
                    {pnl >= 0 ? "+" : ""}{pnl.toLocaleString()}
                  </td>
                  <td className="text-center px-4 py-2 text-[#9CA3AF]">
                    \u7B2C{pos.expiryTurn}\u56DE\u5408
                    {pos.expiryTurn - turn <= 1 && pos.expiryTurn - turn > 0 && (
                      <AlertTriangle className="w-3 h-3 text-amber-400 inline ml-1" />
                    )}
                  </td>
                  <td className="text-center px-4 py-2">
                    {pos.isSettled && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">\u5DF2\u5E73</span>}
                    {pos.isExpired && !pos.isSettled && <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/60 text-red-300">\u5230\u671F</span>}
                    {!pos.isExpired && !pos.isSettled && <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/60 text-green-300">\u6301\u6709</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SpotOrderBook() {
  const spotOrders = useGameStore((s) => s.spotOrders);
  const turn = useGameStore((s) => s.turn);

  if (spotOrders.length === 0) {
    return (
      <div className="bg-[#2D3B2D] rounded-xl p-4 border border-[#3a4a3a] text-center text-[#9CA3AF] text-sm">
        \u6682\u65E0\u73B0\u8D27\u8BA2\u5355
      </div>
    );
  }

  return (
    <div className="bg-[#2D3B2D] rounded-xl border border-[#3a4a3a] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#3a4a3a]">
        <h3 className="text-sm font-semibold text-[#C8A951] flex items-center gap-2">
          <Package className="w-4 h-4" />\u73B0\u8D27\u8BA2\u5355
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#9CA3AF] text-xs border-b border-[#3a4a3a]">
              <th className="text-left px-4 py-2">\u4E70\u65B9</th>
              <th className="text-left px-4 py-2">\u54C1\u79CD</th>
              <th className="text-right px-4 py-2">\u6570\u91CF</th>
              <th className="text-right px-4 py-2">\u534F\u8BAE\u4EF7</th>
              <th className="text-center px-4 py-2">\u4EA4\u5272\u5012\u8BA1</th>
              <th className="text-center px-4 py-2">\u72B6\u6001</th>
            </tr>
          </thead>
          <tbody>
            {spotOrders.map((order) => {
              const countdown = order.deliveryTurn - turn;
              return (
                <tr key={order.id} className="border-b border-[#3a4a3a]/50 hover:bg-[#364536]/50">
                  <td className="px-4 py-2 text-[#F5F0E8]">{order.buyer}</td>
                  <td className="px-4 py-2 text-[#F5F0E8]">{order.commodity}</td>
                  <td className="text-right px-4 py-2 text-[#F5F0E8] font-mono">{order.quantity.toLocaleString()}</td>
                  <td className="text-right px-4 py-2 text-[#F5F0E8] font-mono">{order.agreedPrice.toLocaleString()}</td>
                  <td className={cn("text-center px-4 py-2 font-mono", countdown <= 1 && countdown > 0 ? "text-amber-400" : countdown <= 0 ? "text-red-400" : "text-[#9CA3AF]")}>
                    {countdown > 0 ? `${countdown}\u56DE\u5408` : "\u5DF2\u5230\u671F"}
                  </td>
                  <td className="text-center px-4 py-2">
                    <div className="flex items-center justify-center gap-1">
                      {order.isDelivered && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-900/60 text-green-300"><CheckCircle className="w-3 h-3" />\u5DF2\u4EA4\u5272</span>}
                      {order.isDefaulted && !order.isDelivered && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-900/60 text-red-300"><XCircle className="w-3 h-3" />\u8FDD\u7EA6</span>}
                      {!order.isDelivered && !order.isDefaulted && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300">\u5F85\u4EA4\u5272</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionPanel() {
  const { isFinished, levelId, futuresPositions, spotOrders, dispatch } = useGameStore();
  const navigate = useNavigate();
  const [closeDropdown, setCloseDropdown] = useState(false);
  const [deliverDropdown, setDeliverDropdown] = useState(false);

  const unsettled = futuresPositions.filter((p) => !p.isSettled);
  const undelivered = spotOrders.filter((o) => !o.isDelivered);

  const handleClose = (positionId: string) => {
    dispatch({ type: "CLOSE_FUTURES", positionId });
    setCloseDropdown(false);
  };

  const handleDeliver = (orderId: string) => {
    dispatch({ type: "DELIVER_SPOT", orderId });
    setDeliverDropdown(false);
  };

  return (
    <div className="bg-[#2D3B2D] rounded-xl p-4 border border-[#3a4a3a]">
      <h3 className="text-sm font-semibold text-[#C8A951] mb-3 flex items-center gap-2">
        <ArrowRight className="w-4 h-4" />\u64CD\u4F5C
      </h3>
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <button
            onClick={() => { setCloseDropdown(!closeDropdown); setDeliverDropdown(false); }}
            disabled={isFinished || unsettled.length === 0}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              isFinished || unsettled.length === 0
                ? "bg-[#1a241a] text-[#9CA3AF] cursor-not-allowed"
                : "bg-[#1a241a] text-[#F5F0E8] hover:bg-[#243024] border border-[#3a4a3a]"
            )}
          >
            <TrendingDown className="w-4 h-4 inline mr-1" />\u5E73\u4ED3
          </button>
          {closeDropdown && unsettled.length > 0 && (
            <div className="absolute top-full left-0 mt-1 bg-[#243024] border border-[#3a4a3a] rounded-lg shadow-xl z-10 min-w-[200px]">
              {unsettled.map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => handleClose(pos.id)}
                  className="w-full text-left px-3 py-2 text-sm text-[#F5F0E8] hover:bg-[#2D3B2D] transition-colors flex items-center justify-between"
                >
                  <span>{pos.commodity} {pos.direction}{pos.lots}\u624B</span>
                  <span className={cn("text-xs font-mono", pos.direction === "\u591A\u5934" ? "text-green-400" : "text-red-400")}>
                    @{pos.currentPrice.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => { setDeliverDropdown(!deliverDropdown); setCloseDropdown(false); }}
            disabled={isFinished || undelivered.length === 0}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              isFinished || undelivered.length === 0
                ? "bg-[#1a241a] text-[#9CA3AF] cursor-not-allowed"
                : "bg-[#1a241a] text-[#F5F0E8] hover:bg-[#243024] border border-[#3a4a3a]"
            )}
          >
            <Package className="w-4 h-4 inline mr-1" />\u4EA4\u5272\u73B0\u8D27
          </button>
          {deliverDropdown && undelivered.length > 0 && (
            <div className="absolute top-full left-0 mt-1 bg-[#243024] border border-[#3a4a3a] rounded-lg shadow-xl z-10 min-w-[220px]">
              {undelivered.map((order) => (
                <button
                  key={order.id}
                  onClick={() => handleDeliver(order.id)}
                  className="w-full text-left px-3 py-2 text-sm text-[#F5F0E8] hover:bg-[#2D3B2D] transition-colors flex items-center justify-between"
                >
                  <span>{order.buyer} - {order.commodity}{order.quantity}\u5428</span>
                  <span className="text-xs text-[#C8A951] font-mono">\u00A5{order.agreedPrice.toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {isFinished ? (
          <button
            onClick={() => navigate(`/review/${levelId}`)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#C8A951] text-[#1a241a] hover:bg-[#d4b862] transition-colors"
          >
            \u67E5\u770B\u590D\u76D8
          </button>
        ) : (
          <button
            onClick={() => dispatch({ type: "NEXT_TURN" })}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#C8A951] text-[#1a241a] hover:bg-[#d4b862] transition-colors flex items-center gap-1"
          >
            <ArrowRight className="w-4 h-4" />\u63A8\u8FDB\u4E0B\u4E00\u56DE\u5408
          </button>
        )}
      </div>
    </div>
  );
}

function EventLog() {
  const eventLog = useGameStore((s) => s.eventLog);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [eventLog.length]);

  return (
    <div className="bg-[#0d140d] rounded-xl border border-[#1a2a1a] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#1a2a1a] bg-[#141e14]">
        <h3 className="text-sm font-semibold text-[#C8A951]">\u4E8B\u4EF6\u65E5\u5FD7</h3>
      </div>
      <div ref={scrollRef} className="h-48 overflow-y-auto p-3 space-y-1 font-mono text-xs scroll-smooth">
        {eventLog.map((entry, i) => (
          <div
            key={`${entry.timestamp}-${i}`}
            className={cn(LOG_COLORS[entry.type] ?? "text-[#9CA3AF]", "animate-[fadeIn_0.3s_ease-in]")}
          >
            <span className="text-[#555] mr-2">[\u7B2C{entry.turn}\u56DE\u5408]</span>
            {entry.message}
          </div>
        ))}
        {eventLog.length === 0 && <div className="text-[#555] text-center">\u6682\u65E0\u4E8B\u4EF6</div>}
      </div>
    </div>
  );
}

export default function Simulation() {
  const crops = useGameStore((s) => s.crops);
  const warehouse = useGameStore((s) => s.warehouse);

  return (
    <div className="min-h-screen bg-[#1a241a] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <TopBar />

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
          <div className="space-y-4">
            {crops.map((crop) => (
              <CropPanel key={crop.id} crop={crop} />
            ))}
            <WarehouseGauge current={warehouse.currentStock} max={warehouse.maxCapacity} />
          </div>

          <div className="space-y-4">
            <WeatherBanner />
            <FuturesTable />
            <SpotOrderBook />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ActionPanel />
          <EventLog />
        </div>
      </div>
    </div>
  );
}
