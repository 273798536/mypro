import { useNavigate } from "react-router-dom";
import type { Equipment } from "../types";
import { formatCurrency, getDepreciationProgress } from "../utils/depreciation";
import { AlertTriangle, Wrench, RefreshCw } from "lucide-react";

interface EquipmentCardProps {
  equipment: Equipment;
  currentValue: number;
  hasAbnormal: boolean;
  hasMaintenance: boolean;
  hasRepurchase: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export default function EquipmentCard({
  equipment,
  currentValue,
  hasAbnormal,
  hasMaintenance,
  hasRepurchase,
  isSelected,
  onSelect,
}: EquipmentCardProps) {
  const navigate = useNavigate();
  const progress = getDepreciationProgress(equipment);

  const statusLabels: Record<string, { label: string; color: string }> = {
    active: { label: "在用", color: "bg-emerald-100 text-emerald-700" },
    maintenance: { label: "维修中", color: "bg-amber-100 text-amber-700" },
    repurchased: { label: "已回购", color: "bg-navy-100 text-navy-600" },
    disposed: { label: "已处置", color: "bg-gray-100 text-gray-600" },
  };

  const status = statusLabels[equipment.status] ?? statusLabels.active;

  return (
    <div
      className={`bg-white rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? "border-amber-400 ring-2 ring-amber-400/20"
          : "border-navy-100 hover:border-navy-300 hover:shadow-md"
      }`}
      onClick={() => onSelect(equipment.id)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-xs text-navy-400 font-mono">{equipment.equipmentNo}</div>
            <h3 className="text-sm font-semibold text-navy-900 mt-0.5">{equipment.name}</h3>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
            {status.label}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-navy-400">账面净值</span>
            <span className="font-mono font-semibold text-amber-500">
              {formatCurrency(currentValue)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-navy-400">原值</span>
            <span className="font-mono text-navy-600">
              {formatCurrency(equipment.originalValue)}
            </span>
          </div>
        </div>

        <div className="mt-3">
          <div className="h-1.5 bg-navy-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-navy-400 mt-1">
            <span>折旧进度 {(progress * 100).toFixed(1)}%</span>
            <span>第{Math.floor(progress * equipment.depreciationMonths)}/{equipment.depreciationMonths}月</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-navy-100">
          {hasAbnormal && (
            <span className="flex items-center gap-1 text-[10px] text-danger-400 bg-danger-400/10 px-1.5 py-0.5 rounded">
              <AlertTriangle size={10} />
              异常
            </span>
          )}
          {hasMaintenance && (
            <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
              <Wrench size={10} />
              维修
            </span>
          )}
          {hasRepurchase && (
            <span className="flex items-center gap-1 text-[10px] text-navy-600 bg-navy-100 px-1.5 py-0.5 rounded">
              <RefreshCw size={10} />
              回购
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
