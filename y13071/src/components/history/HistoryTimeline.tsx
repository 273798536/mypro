import { History, MessageSquare, Undo2, CheckCircle, Camera } from "lucide-react";
import { useAnnotationStore } from "@/stores/annotationStore";
import type { HistoryAction } from "@/shared/types";

const ACTION_META: Record<HistoryAction, { label: string; icon: any; color: string }> = {
  ANNOTATE: { label: "新增批注", icon: MessageSquare, color: "text-pass-400 bg-pass-500/20 border-pass-500/40" },
  REVOKE: { label: "撤回批注", icon: Undo2, color: "text-revoke-400 bg-revoke-500/20 border-revoke-500/40" },
  CONFIRM: { label: "确认异常", icon: CheckCircle, color: "text-fix-400 bg-fix-500/20 border-fix-500/40" },
  SAVE_VIEW: { label: "保存视图", icon: Camera, color: "text-cable-400 bg-cable-500/20 border-cable-500/40" },
};

function fmt(d: number) {
  return new Date(d).toLocaleString("zh-CN", { hour12: false });
}

export function HistoryTimeline() {
  const logs = useAnnotationStore((s) => s.historyLogs);

  return (
    <div className="mt-8">
      <h3 className="font-display text-[15px] text-silver-200 flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-cable-400" />
        变更历史时间线
      </h3>
      {logs.length === 0 ? (
        <div className="text-center text-silver-400 text-[12px] py-8 font-mono glass rounded-lg border border-mine-700/40">
          暂无历史变更记录
        </div>
      ) : (
        <div className="relative pl-6">
          <div className="absolute left-2 top-1 bottom-1 w-px bg-mine-700/70" />
          <div className="space-y-3">
            {logs.map((log) => {
              const meta = ACTION_META[log.action];
              const Icon = meta.icon;
              return (
                <div key={log.id} className="relative animate-float-up">
                  <div
                    className={`absolute -left-4 w-5 h-5 rounded-full flex items-center justify-center border ${meta.color}`}
                  >
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="glass rounded-md border border-mine-700/50 p-3 ml-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[12px] font-mono ${meta.color.split(" ")[0]}`}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-silver-400 font-mono">
                        {fmt(log.createdAt)}
                      </span>
                    </div>
                    <div className="text-[11px] text-silver-300 font-mono mb-1">
                      操作人：{log.operator} · 目标：{log.targetId}
                    </div>
                    {(log.before || log.after) && (
                      <div className="text-[10px] font-mono flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t border-mine-700/40">
                        {log.before && (
                          <div>
                            <span className="text-revoke-400">变更前：</span>
                            <span className="text-silver-400">
                              {JSON.stringify(log.before)}
                            </span>
                          </div>
                        )}
                        {log.after && (
                          <div>
                            <span className="text-pass-400">变更后：</span>
                            <span className="text-silver-400">
                              {JSON.stringify(log.after)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
