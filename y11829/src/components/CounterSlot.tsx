import { useState } from "react";
import type { Counter } from "@/types/game";
import { User, Wrench, Snowflake, AlertTriangle, CheckCircle } from "lucide-react";

interface CounterSlotProps {
  counter: Counter;
  onDrop: (counterId: string) => void;
}

const statusConfig: Record<
  string,
  { bg: string; border: string; icon: React.ReactNode; label: string }
> = {
  idle: {
    bg: "bg-emerald-50",
    border: "border-emerald-400",
    icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    label: "空闲",
  },
  serving: {
    bg: "bg-orange-50",
    border: "border-orange-400",
    icon: <User className="w-5 h-5 text-orange-500" />,
    label: "服务中",
  },
  cooldown: {
    bg: "bg-blue-50",
    border: "border-blue-400",
    icon: <Snowflake className="w-5 h-5 text-blue-500" />,
    label: "冷却中",
  },
  broken: {
    bg: "bg-red-50",
    border: "border-red-400",
    icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
    label: "故障",
  },
};

export default function CounterSlot({ counter, onDrop }: CounterSlotProps) {
  const [isOver, setIsOver] = useState(false);
  const config = statusConfig[counter.status];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    onDrop(counter.id);
  };

  const canDrop = counter.status === "idle" || counter.status === "serving";

  return (
    <div
      onDragOver={canDrop ? handleDragOver : undefined}
      onDragLeave={canDrop ? handleDragLeave : undefined}
      onDrop={canDrop ? handleDrop : undefined}
      className={`
        relative rounded-xl border-2 p-4 min-h-[180px] transition-all duration-300
        ${config.bg} ${config.border}
        ${isOver && canDrop ? "ring-4 ring-[#D4A843]/50 scale-[1.02]" : ""}
        ${isOver && !canDrop ? "ring-4 ring-red-300" : ""}
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-[#1B3A5C] text-sm">{counter.label}</h3>
        <div className="flex items-center gap-1">
          {config.icon}
          <span className="text-xs font-medium text-slate-600">
            {config.label}
          </span>
        </div>
      </div>

      {counter.status === "serving" && counter.currentCustomer && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[#1B3A5C]">
              {counter.currentCustomer.name}
            </span>
            {counter.currentCustomer.vipLevel > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-white">
                VIP{counter.currentCustomer.vipLevel}
              </span>
            )}
          </div>
          <div className="relative h-2 bg-orange-200 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-orange-500 rounded-full transition-all duration-1000"
              style={{
                width: `${Math.max(
                  0,
                  ((counter.currentCustomer.serviceTime - counter.remainingTime) /
                    counter.currentCustomer.serviceTime) *
                    100
                )}%`,
              }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">剩余</span>
            <span className="font-mono text-sm font-bold text-orange-600">
              {counter.remainingTime}s
            </span>
          </div>
        </div>
      )}

      {counter.status === "cooldown" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-600">
            <Snowflake className="w-4 h-4 animate-spin" />
            <span className="text-sm">冷却恢复中</span>
          </div>
          <div className="relative h-2 bg-blue-200 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-all duration-1000"
              style={{
                width: `${Math.max(0, (1 - counter.cooldownRemaining / 2) * 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">冷却</span>
            <span className="font-mono text-sm font-bold text-blue-600">
              {counter.cooldownRemaining}s
            </span>
          </div>
          {counter.serviceHistory.length > 0 && (
            <div className="text-xs text-slate-400 mt-1">
              上次: {counter.serviceHistory[counter.serviceHistory.length - 1].customer.name}
              (中断)
            </div>
          )}
          {counter.pendingCustomer && (
            <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
              <div className="flex items-center gap-1">
                <span className="text-xs text-amber-600 font-bold">等待服务:</span>
                <span className="text-xs text-amber-800 font-bold">
                  {counter.pendingCustomer.name}
                </span>
                {counter.pendingCustomer.vipLevel > 0 && (
                  <span className="px-1 py-0.5 rounded text-xs font-bold bg-yellow-400 text-white">
                    VIP{counter.pendingCustomer.vipLevel}
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-500 mt-0.5">
                冷却结束后自动开始
              </p>
            </div>
          )}
        </div>
      )}

      {counter.status === "broken" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-600">
            <Wrench className="w-4 h-4 animate-bounce" />
            <span className="text-sm">维修中</span>
          </div>
          <div className="relative h-2 bg-red-200 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-red-500 rounded-full transition-all duration-1000"
              style={{
                width: `${Math.max(0, (1 - counter.brokenRemaining / (counter.brokenRemaining + 1)) * 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">维修</span>
            <span className="font-mono text-sm font-bold text-red-600">
              {counter.brokenRemaining}s
            </span>
          </div>
        </div>
      )}

      {counter.status === "idle" && (
        <div className="flex items-center justify-center h-20 text-slate-400">
          <div className="text-center">
            <p className="text-xs">拖拽客户到此处</p>
          </div>
        </div>
      )}

      {counter.serviceHistory.length > 0 && counter.status !== "cooldown" && (
        <div className="mt-2 pt-2 border-t border-slate-200">
          <span className="text-xs text-slate-400">
            已服务 {counter.serviceHistory.filter((h) => h.result === "completed").length} | 
            中断 {counter.serviceHistory.filter((h) => h.result === "interrupted").length} |
            故障 {counter.serviceHistory.filter((h) => h.result === "broken").length}
          </span>
        </div>
      )}
    </div>
  );
}
