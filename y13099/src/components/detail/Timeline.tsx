import type { TimelineNode } from "@shared/types";
import { TIMELINE_TYPE_LABEL_MAP } from "@shared/types";
import {
  FilePlus2,
  Radio,
  Eye,
  Edit3,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { motion } from "framer-motion";

interface TimelineProps {
  nodes: TimelineNode[];
  currentNode: TimelineNode | null;
  onSelect: (node: TimelineNode) => void;
}

const iconMap = {
  created: FilePlus2,
  sensor_collect: Radio,
  first_review: Eye,
  rejudge: Edit3,
  withdrawn: RotateCcw,
  final_review: CheckCircle2,
};

const colorMap = {
  created: "text-primary border-primary/40 bg-primary/10",
  sensor_collect: "text-primary border-primary/40 bg-primary/10",
  first_review: "text-warning border-warning/40 bg-warning/10",
  rejudge: "text-warning border-warning/40 bg-warning/10",
  withdrawn: "text-muted border-muted/40 bg-muted/10",
  final_review: "text-success border-success/40 bg-success/10",
};

export function Timeline({ nodes, currentNode, onSelect }: TimelineProps) {
  return (
    <div className="h-full overflow-y-auto pr-1">
      <h3 className="text-sm font-semibold text-text mb-4 px-1">
        方案时间轴
      </h3>
      <div className="relative pl-1">
        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
        {nodes.map((node, index) => {
          const Icon = iconMap[node.type];
          const isActive = currentNode?.id === node.id;
          const isFirst = index === 0;
          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                "relative mb-3 cursor-pointer group",
                "before:absolute before:left-3 before:top-3 before:w-3 before:h-3 before:rounded-full before:bg-surface before:border-2 before:border-border before:z-10",
                isActive &&
                  "before:border-primary before:bg-primary before:shadow-glow"
              )}
              onClick={() => onSelect(node)}
            >
              <div
                className={cn(
                  "ml-8 p-3 rounded-lg transition-all",
                  isActive
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-surface-hover/30 border border-transparent hover:bg-surface-hover"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center border",
                      colorMap[node.type]
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-medium text-text">
                    {node.title}
                  </span>
                  {isFirst && (
                    <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full ml-auto">
                      最新
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-muted mb-1.5">
                  {format(new Date(node.timestamp), "yyyy-MM-dd HH:mm", {
                    locale: zhCN,
                  })}
                </div>
                <div className="text-xs text-text-secondary">
                  {TIMELINE_TYPE_LABEL_MAP[node.type]}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
