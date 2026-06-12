import type { PlanDetail } from "@shared/types";
import { CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { motion } from "framer-motion";

interface ActionSummaryProps {
  planDetail: PlanDetail | null;
}

export function ActionSummary({ planDetail }: ActionSummaryProps) {
  const actionItems = planDetail?.actionSummary || [];
  const releaseItems = actionItems.filter((a) => a.type === "release");
  const supplementItems = actionItems.filter((a) => a.type === "supplement");

  if (actionItems.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          收尾摘要
        </h3>
        <p className="text-sm text-muted">暂无行动项</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        收尾摘要 — 行动清单
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {releaseItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-success/5 border border-success/20 rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-success/15 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-success" />
              </div>
              <div>
                <div className="text-sm font-medium text-success">
                  可放行
                </div>
                <div className="text-xs text-muted">
                  {releaseItems.length} 项可正常推进
                </div>
              </div>
            </div>
            <ul className="space-y-2">
              {releaseItems.map((item, idx) => (
                <li
                  key={item.id}
                  className="text-sm text-text-secondary leading-relaxed pl-5 relative"
                >
                  <span className="absolute left-0 top-1.5 w-1.5 h-1.5 bg-success rounded-full" />
                  {item.description}
                  {item.materialRef && (
                    <span className="block text-xs text-muted mt-1 font-mono">
                      参考: {item.materialRef}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {supplementItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-warning/5 border border-warning/20 rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-warning/15 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-warning" />
              </div>
              <div>
                <div className="text-sm font-medium text-warning">
                  需补材料
                </div>
                <div className="text-xs text-muted">
                  {supplementItems.length} 项需补充完善
                </div>
              </div>
            </div>
            <ul className="space-y-2">
              {supplementItems.map((item, idx) => (
                <li
                  key={item.id}
                  className="text-sm text-text-secondary leading-relaxed pl-5 relative"
                >
                  <span className="absolute left-0 top-1.5 w-1.5 h-1.5 bg-warning rounded-full" />
                  {item.description}
                  {item.materialRef && (
                    <span className="block text-xs text-warning mt-1 font-mono">
                      需求编号: {item.materialRef}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </div>
  );
}
