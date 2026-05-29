import { Eye, MousePointerClick, ShoppingCart, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttributionNode } from "@/../shared/types";

interface AttributionTimelineProps {
  nodes: AttributionNode[];
  className?: string;
}

const nodeConfig = {
  impression: {
    icon: Eye,
    label: "曝光",
    color: "blue",
  },
  click: {
    icon: MousePointerClick,
    label: "点击",
    color: "purple",
  },
  conversion: {
    icon: ShoppingCart,
    label: "转化",
    color: "green",
  },
};

export function AttributionTimeline({ nodes, className }: AttributionTimelineProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className={cn("flex items-start gap-2 py-2", className)}>
      {nodes.map((node, index) => {
        const config = nodeConfig[node.type];
        const Icon = config.icon;
        const isLast = index === nodes.length - 1;

        return (
          <div key={index} className="flex items-start">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2",
                  node.matched
                    ? "border-green-500 bg-green-50 text-green-600"
                    : "border-red-400 border-dashed bg-red-50 text-red-500"
                )}
              >
                {node.matched ? (
                  <Icon className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
              </div>
              <div className="mt-2 w-24 text-center">
                <p
                  className={cn(
                    "text-[12px] font-medium",
                    node.matched ? "text-gray-900" : "text-red-600"
                  )}
                >
                  {config.label}
                </p>
                {node.matched ? (
                  <>
                    <p className="mt-1 text-[11px] text-gray-500">
                      {formatTime(node.timestamp)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400">IP: {node.ip}</p>
                  </>
                ) : (
                  <p className="mt-1 text-[11px] text-red-500">数据缺失</p>
                )}
              </div>
            </div>
            {!isLast && (
              <div className="mx-1 mt-5">
                <div
                  className={cn(
                    "h-0.5 w-8",
                    node.matched && nodes[index + 1]?.matched
                      ? "bg-green-300"
                      : "border-t-2 border-dashed border-red-300 bg-transparent"
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
