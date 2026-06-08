import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onClose?: () => void;
  className?: string;
}

const legendItems = [
  { color: "bg-seaweed-500", label: "正常", description: "数据符合标准范围" },
  { color: "bg-coral-500", label: "越界", description: "超出容许偏差阈值" },
  { color: "bg-amber-500", label: "待确认", description: "需要人工审核确认" },
  { color: "bg-lavender-500", label: "补录", description: "历史数据补充录入" },
  { color: "bg-coral-600", label: "坐标系混用", description: "坐标系统不一致" },
];

export default function ColorLegend({ onClose, className }: Props) {
  return (
    <div
      className={cn(
        "w-52 rounded-lg border border-ocean-200 bg-white shadow-card-hover p-3",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-song text-sm font-semibold text-ocean-700">颜色图例</h4>
        {onClose && (
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-ocean-400 transition-colors hover:bg-ocean-50 hover:text-ocean-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-start gap-2">
            <div
              className={cn(
                "mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm ring-2 ring-white shadow-sm",
                item.color
              )}
            />
            <div className="flex flex-col">
              <span className="font-song text-xs font-medium text-ocean-800">
                {item.label}
              </span>
              <span className="text-[10px] text-ocean-400 leading-tight">
                {item.description}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
