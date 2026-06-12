import { Link } from "react-router-dom";
import {
  ChevronRight,
  Clock,
  Edit3,
  Activity,
  FileText,
  MapPin,
} from "lucide-react";
import type { Plan } from "@shared/types";
import { StatusBadge } from "./StatusBadge";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface PlanCardProps {
  plan: Plan;
  onRejudge: (planId: string) => void;
}

export function PlanCard({ plan, onRejudge }: PlanCardProps) {
  const statusColor = {
    pass: "bg-success",
    supplement: "bg-warning",
    exception: "bg-danger",
    withdrawn: "bg-muted",
  }[plan.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card group relative overflow-hidden cursor-pointer hover:-translate-y-0.5"
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusColor}`} />

      <div className="p-5 pl-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="font-mono text-xs text-muted">
                {plan.corridorCode}
              </span>
            </div>
            <h3 className="text-base font-semibold text-text group-hover:text-primary transition-colors">
              {plan.corridorName}
            </h3>
          </div>
          <StatusBadge status={plan.status} />
        </div>

        <div className="space-y-2.5 mb-4">
          <div className="flex items-start gap-2 text-xs text-text-secondary">
            <Activity className="w-3.5 h-3.5 text-primary/70 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2">{plan.sensorSourceSummary}</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-text-secondary">
            <FileText className="w-3.5 h-3.5 text-primary/70 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2">{plan.conclusionSummary}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Clock className="w-3 h-3" />
            <span>
              {format(new Date(plan.updatedAt), "MM-dd HH:mm", {
                locale: zhCN,
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="text-xs text-muted hover:text-primary transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-primary/10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRejudge(plan.id);
              }}
            >
              <Edit3 className="w-3 h-3" />
              改判
            </button>
            <Link
              to={`/plan/${plan.id}`}
              className="text-xs text-primary hover:text-primary-hover flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              查看详情
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
