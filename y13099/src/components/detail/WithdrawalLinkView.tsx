import type { PlanDetail } from "@shared/types";
import {
  ArrowRight,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Package,
} from "lucide-react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";

interface WithdrawalLinkViewProps {
  planDetail: PlanDetail | null;
}

export function WithdrawalLinkView({ planDetail }: WithdrawalLinkViewProps) {
  const { fetchSensorDetail } = useStore();
  const link = planDetail?.withdrawalLink;
  const conclusion = planDetail?.conclusion;

  if (!link) {
    return null;
  }

  const supplementedMaterials = link.supplementedMaterialIds || [];

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-warning" />
        撤回-结论关联链
      </h3>

      <div className="relative">
        <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gradient-to-b from-danger via-warning to-success" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative pl-10 pb-6"
        >
          <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-danger/20 border-2 border-danger flex items-center justify-center">
            <AlertTriangle className="w-2.5 h-2.5 text-danger" />
          </div>
          <div className="bg-danger/5 border border-danger/20 rounded-lg p-4">
            <div className="text-xs text-danger mb-1.5 font-medium">
              撤回记录
            </div>
            <p className="text-sm text-text leading-relaxed">
              {link.withdrawalReason}
            </p>
            <div className="mt-2 text-xs text-muted font-mono">
              记录 ID: {link.withdrawalRecordId.substring(0, 12)}...
            </div>
          </div>
        </motion.div>

        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          <div className="w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center">
            <ArrowRight className="w-3.5 h-3.5 text-primary" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative pl-10 pb-6"
        >
          <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-warning/20 border-2 border-warning flex items-center justify-center">
            <Package className="w-2.5 h-2.5 text-warning" />
          </div>
          <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
            <div className="text-xs text-warning mb-2 font-medium">
              补充材料 ({supplementedMaterials.length} 项)
            </div>
            <ul className="space-y-1.5">
              {supplementedMaterials.map((mat, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 text-sm text-text-secondary"
                >
                  <FileText className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                  <span>{mat}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        <div className="absolute left-4 bottom-8 -translate-y-1/2 z-10">
          <div className="w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center">
            <ArrowRight className="w-3.5 h-3.5 text-primary" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative pl-10"
        >
          <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-success/20 border-2 border-success flex items-center justify-center">
            <CheckCircle2 className="w-2.5 h-2.5 text-success" />
          </div>
          <div className="bg-success/5 border border-success/20 rounded-lg p-4">
            <div className="text-xs text-success mb-1.5 font-medium">
              最终结论
            </div>
            <p className="text-sm text-text leading-relaxed">
              {link.finalConclusionText}
            </p>
            <div className="mt-2 text-xs text-muted font-mono">
              结论 ID: {link.finalConclusionId.substring(0, 12)}...
            </div>
            {conclusion?.basis && conclusion.basis.length > 0 && (
              <div className="mt-3 pt-3 border-t border-success/10">
                <div className="text-xs text-success mb-2">判定依据</div>
                <ul className="space-y-1.5">
                  {conclusion.basis.map((basis, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs text-text-secondary cursor-pointer hover:text-text transition-colors"
                      onClick={() => fetchSensorDetail(basis.sensorRecordId)}
                    >
                      <span className="w-4 h-4 bg-success/15 text-success rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="line-clamp-2">
                        {basis.interpretation}
                        <span className="text-primary ml-1">→ 溯源</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
