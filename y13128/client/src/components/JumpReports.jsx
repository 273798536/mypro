import React from "react";

const TRIGGER_LABEL = {
  threshold: "阈值跳变",
  unit: "单位问题",
  normal_record: "正常记录",
};

const TRIGGER_COLOR = {
  threshold: "border-red-300 bg-red-50",
  unit: "border-amber-300 bg-amber-50",
  normal_record: "border-blue-300 bg-blue-50",
};

const TRIGGER_BADGE = {
  threshold: "bg-red-100 text-red-700",
  unit: "bg-amber-100 text-amber-700",
  normal_record: "bg-blue-100 text-blue-700",
};

export default function JumpReports({ reports }) {
  if (!reports || reports.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        跳变报告
        <span className="text-xs text-gray-400 font-normal ml-2">({reports.length} 条)</span>
      </h3>
      <div className="space-y-3">
        {reports.map((r) => {
          const color = TRIGGER_COLOR[r.trigger_type] || "border-gray-300 bg-gray-50";
          const badge = TRIGGER_BADGE[r.trigger_type] || "bg-gray-100 text-gray-700";
          const label = TRIGGER_LABEL[r.trigger_type] || r.trigger_type;
          return (
            <div key={r.id} className={`rounded-lg border p-4 ${color}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge}`}>{label}</span>
                <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString("zh-CN")}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs mb-2">
                <div>
                  <span className="text-gray-500">前值</span>
                  <p className="font-mono font-medium">{r.previous_posterior.toFixed(4)}</p>
                </div>
                <div>
                  <span className="text-gray-500">后值</span>
                  <p className="font-mono font-medium">{r.current_posterior.toFixed(4)}</p>
                </div>
                <div>
                  <span className="text-gray-500">偏差</span>
                  <p className="font-mono font-medium text-red-600">{r.delta_pct.toFixed(1)}%</p>
                </div>
              </div>
              <p className="text-xs text-gray-700">{r.explanation}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
