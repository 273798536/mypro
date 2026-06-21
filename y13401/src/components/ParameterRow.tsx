import { useNavigate } from "react-router-dom";
import {
  Hash,
  Clock,
  ChevronRight,
  CircleSlash2,
  CircleDot,
  Copy,
} from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { formatValue, getRelativeTime } from "@/utils/formatters";
import type { Parameter } from "@/types";
import { cn } from "@/lib/utils";

interface ParameterRowProps {
  parameter: Parameter;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export function ParameterRow({ parameter, isSelected, onSelect }: ParameterRowProps) {
  const navigate = useNavigate();

  const rowBgClass = cn(
    "transition-soft cursor-pointer border-b border-ink-100 hover:bg-ink-50/50",
    isSelected && "bg-ink-50",
    parameter.valueType === "empty_set" && "bg-empty-50/50 hover:bg-empty-100/50",
    parameter.valueType === "zero" && "bg-zero-50/50 hover:bg-zero-100/50",
    parameter.status === "duplicate" && "border-l-4 border-l-duplicate-300",
  );

  const handleClick = () => {
    if (onSelect) {
      onSelect(parameter.id);
    } else {
      navigate(`/parameter/${parameter.id}`);
    }
  };

  return (
    <tr className={rowBgClass} onClick={handleClick}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {parameter.valueType === "empty_set" && (
            <div className="p-1 bg-empty-200/50 rounded text-ink-500">
              <CircleSlash2 className="w-3.5 h-3.5" />
            </div>
          )}
          {parameter.valueType === "zero" && (
            <div className="p-1 bg-zero-200/50 rounded text-amber-600">
              <CircleDot className="w-3.5 h-3.5" />
            </div>
          )}
          {parameter.status === "duplicate" && (
            <div className="p-1 bg-duplicate-200/50 rounded text-purple-600">
              <Copy className="w-3.5 h-3.5" />
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-ink-800">
              {parameter.name}
            </div>
            <div className="text-xs text-ink-400 flex items-center gap-1 mt-0.5">
              <Hash className="w-3 h-3" />
              {parameter.category}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-ink-700 font-mono-code">
          {formatValue(parameter.value, parameter.valueType, parameter.unit)}
        </div>
        <div className="text-xs text-ink-400 mt-0.5">
          {parameter.valueType !== "normal" && (
            <span className="text-ink-500">
              {parameter.valueType === "empty_set" ? "空集合" : "零值标记"}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={parameter.status} size="sm" />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1 text-xs text-ink-400">
          <Clock className="w-3 h-3" />
          {getRelativeTime(parameter.updatedAt)}
        </div>
      </td>
      <td className="px-3 py-3">
        <ChevronRight className="w-4 h-4 text-ink-300" />
      </td>
    </tr>
  );
}
