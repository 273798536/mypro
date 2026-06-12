import React from "react";

const CHANGE_TYPE_MAP = {
  initial: { label: "初始判断", color: "bg-gray-400" },
  update: { label: "更新", color: "bg-blue-400" },
  suspend: { label: "挂起", color: "bg-amber-400" },
  confirm: { label: "确认", color: "bg-green-400" },
  override: { label: "覆写", color: "bg-red-400" },
};

const TRIGGER_MAP = {
  manual: { label: "手动", color: "text-gray-500" },
  threshold: { label: "阈值", color: "text-red-500" },
  unit: { label: "单位", color: "text-amber-500" },
  normal_record: { label: "正常记录", color: "text-blue-500" },
};

export default function HistoryTimeline({ history }) {
  if (!history || history.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        判断变更历史
        <span className="text-xs text-gray-400 font-normal ml-2">({history.length} 条)</span>
      </h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
        <div className="space-y-4">
          {history.map((h, idx) => {
            const ctInfo = CHANGE_TYPE_MAP[h.change_type] || CHANGE_TYPE_MAP.update;
            const trigInfo = TRIGGER_MAP[h.trigger_type] || TRIGGER_MAP.manual;
            return (
              <div key={h.id} className="relative pl-10">
                <div className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full ${ctInfo.color} ring-2 ring-white`} />
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium text-white ${ctInfo.color}`}>
                        {ctInfo.label}
                      </span>
                      <span className={`text-xs font-medium ${trigInfo.color}`}>
                        {trigInfo.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {h.operator === "system" ? "系统" : h.operator}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(h.created_at).toLocaleString("zh-CN")}
                    </span>
                  </div>

                  {h.old_posterior != null && h.new_posterior != null && (
                    <div className="flex items-center gap-3 text-xs mb-1.5">
                      <span className="text-gray-500">后验: </span>
                      <span className="font-mono text-gray-400 line-through">{h.old_posterior.toFixed(4)}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-mono text-bayesian-700 font-medium">{h.new_posterior.toFixed(4)}</span>
                      {h.old_posterior !== 0 && (
                        <span className="text-gray-400">
                          (偏差 {((Math.abs(h.new_posterior - h.old_posterior) / Math.abs(h.old_posterior)) * 100).toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-600">{h.reason}</p>

                  {h.source_batch_id && (
                    <p className="text-xs text-gray-400 mt-1">来源批次: {h.source_batch_id.slice(0, 8)}…</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
