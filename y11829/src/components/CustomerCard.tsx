import { useState, useRef } from "react";
import type { Customer } from "@/types/game";
import { Crown, Clock, FileText } from "lucide-react";

interface CustomerCardProps {
  customer: Customer;
  currentTick: number;
  onDragStart: (customerId: string) => void;
}

const businessLabels: Record<string, string> = {
  deposit: "存款",
  withdraw: "取款",
  transfer: "转账",
  loan: "贷款",
  card: "办卡",
};

const vipColors: Record<number, string> = {
  0: "border-slate-300 bg-white",
  1: "border-amber-300 bg-amber-50",
  2: "border-amber-400 bg-amber-50",
  3: "border-yellow-500 bg-yellow-50 ring-2 ring-yellow-400/40",
};

const vipBadgeColors: Record<number, string> = {
  1: "bg-amber-200 text-amber-800",
  2: "bg-amber-400 text-white",
  3: "bg-yellow-500 text-white animate-pulse",
};

export default function CustomerCard({
  customer,
  currentTick,
  onDragStart,
}: CustomerCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const remainingAppointment =
    customer.isAppointment && customer.appointmentDeadline
      ? customer.appointmentDeadline - currentTick
      : null;

  const appointmentUrgent =
    remainingAppointment !== null && remainingAppointment <= 5;

  const appointmentExpired =
    remainingAppointment !== null && remainingAppointment <= 0;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("customerId", customer.id);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
    onDragStart(customer.id);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`
        relative rounded-lg border-2 p-3 cursor-grab active:cursor-grabbing
        transition-all duration-200 select-none
        hover:shadow-lg hover:-translate-y-0.5
        ${vipColors[customer.vipLevel]}
        ${isDragging ? "opacity-50 scale-95 rotate-2" : "opacity-100"}
        ${appointmentExpired ? "border-red-500 bg-red-50" : ""}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-[#1B3A5C] truncate">
              {customer.name}
            </span>
            {customer.vipLevel > 0 && (
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${vipBadgeColors[customer.vipLevel]}`}
              >
                <Crown className="w-3 h-3" />
                VIP{customer.vipLevel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-0.5 text-xs text-slate-500">
              <FileText className="w-3 h-3" />
              {businessLabels[customer.businessType]}
            </span>
            <span className="text-xs text-slate-400">
              {customer.serviceTime}s
            </span>
          </div>
        </div>

        {customer.isAppointment && remainingAppointment !== null && (
          <div
            className={`
              flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold
              ${
                appointmentExpired
                  ? "bg-red-500 text-white"
                  : appointmentUrgent
                  ? "bg-red-100 text-red-700 animate-pulse"
                  : "bg-blue-100 text-blue-700"
              }
            `}
          >
            <Clock className="w-3 h-3" />
            {appointmentExpired ? "过号" : `${remainingAppointment}s`}
          </div>
        )}
      </div>

      <div className="mt-1.5 text-xs text-slate-400">
        #{customer.id.slice(-3)}
      </div>
    </div>
  );
}
