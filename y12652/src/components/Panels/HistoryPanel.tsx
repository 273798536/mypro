import { useState } from "react";
import { useSandboxStore } from "@/store/useSandboxStore";
import { Timeline } from "@/components/Common/Timeline";
import type { HistoryLog } from "@/types";
import { History, Clock, MapPin, Settings2, Info } from "lucide-react";

export function HistoryPanel() {
  const { currentProject, selectCollision } = useSandboxStore();
  const [selectedLog, setSelectedLog] = useState<HistoryLog | null>(null);

  const handleSelect = (log: HistoryLog) => {
    setSelectedLog(log);
    if (log.snapshot.collisionId) {
      selectCollision(log.snapshot.collisionId);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary-400" />
          <span className="panel-title">历史追溯面板</span>
        </div>
        <span className="text-[10px] font-mono text-surface-500">
          共 {currentProject.history.length} 条
        </span>
      </div>

      {selectedLog && (
        <div className="px-4 py-3 border-b border-surface-700/50 bg-surface-800/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-primary-400">
              追溯详情
            </span>
            <button
              onClick={() => setSelectedLog(null)}
              className="text-[10px] text-surface-500 hover:text-surface-300"
            >
              关闭
            </button>
          </div>
          <div className="text-[11px] text-surface-300 space-y-1.5">
            <div className="flex items-start gap-2">
              <Info className="w-3 h-3 mt-0.5 text-primary-400 flex-shrink-0" />
              <span>{selectedLog.description}</span>
            </div>
            <div className="flex items-center gap-2 text-surface-500">
              <Clock className="w-3 h-3" />
              {new Date(selectedLog.timestamp).toLocaleString("zh-CN")}
            </div>
            {selectedLog.snapshot.coordinates && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-900/60 font-mono text-primary-400">
                <MapPin className="w-3 h-3" />
                X: {selectedLog.snapshot.coordinates.x.toFixed(2)}m / Y:{" "}
                {selectedLog.snapshot.coordinates.y.toFixed(2)}m / Z:{" "}
                {selectedLog.snapshot.coordinates.z.toFixed(2)}m
              </div>
            )}
            {selectedLog.snapshot.parameters && (
              <div className="p-2 rounded-lg bg-surface-900/60 space-y-1">
                <div className="flex items-center gap-1.5 text-surface-500 mb-1">
                  <Settings2 className="w-3 h-3" />
                  <span>参数快照</span>
                </div>
                {Object.entries(selectedLog.snapshot.parameters).map(
                  ([key, val]) => (
                    <div
                      key={key}
                      className="flex justify-between font-mono text-[10px]"
                    >
                      <span className="text-surface-500">{key}</span>
                      <span className="text-primary-400">{val}</span>
                    </div>
                  )
                )}
              </div>
            )}
            <div className="text-surface-500">操作人：{selectedLog.operator}</div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-3">
        <Timeline
          logs={currentProject.history}
          selectedId={selectedLog?.id}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}
