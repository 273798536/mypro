import React from "react";

const STATUS_MAP = {
  active: { label: "生效中", color: "bg-blue-100 text-blue-700 border-blue-200" },
  suspended: { label: "已挂起", color: "bg-amber-100 text-amber-700 border-amber-200" },
  confirmed: { label: "已确认", color: "bg-green-100 text-green-700 border-green-200" },
};

const UNIT_MAP = {
  ok: { label: "单位正常", color: "text-green-600" },
  missing: { label: "单位缺失", color: "text-amber-600" },
  suspect: { label: "单位可疑", color: "text-red-600" },
};

export default function JudgmentSummary({ judgment, summary, batchCount }) {
  if (!judgment) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center text-gray-400">
        <p className="text-sm">尚未导入材料，暂无判断</p>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[judgment.status] || STATUS_MAP.active;
  const unitInfo = UNIT_MAP[judgment.unit_status] || UNIT_MAP.ok;
  const isSuspended = judgment.status === "suspended";
  const hasConfidence = !isSuspended && judgment.confidence != null;
  const hasPosterior = !isSuspended && judgment.posterior_value != null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">当前判断摘要</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">结论</p>
          {isSuspended ? (
            <p className="text-sm font-medium text-amber-600">（单位问题挂起，无有效结论）</p>
          ) : (
            <p className="text-sm font-mono text-gray-800">{judgment.conclusion}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">判断状态</p>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">置信度</p>
          {hasConfidence ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-bayesian-500 rounded-full transition-all"
                  style={{ width: `${(judgment.confidence * 100).toFixed(1)}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 font-mono">{(judgment.confidence * 100).toFixed(1)}%</span>
            </div>
          ) : (
            <p className="text-sm text-gray-400">—</p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">单位状态</p>
          <span className={`text-sm font-medium ${unitInfo.color}`}>{unitInfo.label}</span>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">后验概率</p>
          {hasPosterior ? (
            <p className="text-lg font-bold text-bayesian-700 font-mono">{judgment.posterior_value.toFixed(4)}</p>
          ) : (
            <p className="text-sm text-amber-500">— 单位挂起中 —</p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">材料批次</p>
          <p className="text-sm text-gray-700">{batchCount} 批</p>
        </div>
      </div>

      {judgment.unit_status !== "ok" && (
        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">
                {judgment.unit_status === "missing" ? "单位缺失 — 判断已挂起" : "单位可疑 — 判断已挂起"}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                {judgment.unit_status === "missing"
                  ? "当前材料未提供单位信息，需现场老师确认后才能给出稳定结论"
                  : "当前材料与已有单位信息冲突，需现场老师确认"}
              </p>
            </div>
          </div>
        </div>
      )}

      {judgment.confirmed_by && (
        <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200">
          <p className="text-sm text-green-800">
            <span className="font-medium">已由 {judgment.confirmed_by} 确认</span>
            <span className="text-xs text-green-600 ml-2">
              {judgment.confirmed_at ? new Date(judgment.confirmed_at).toLocaleString("zh-CN") : ""}
            </span>
          </p>
        </div>
      )}

      {summary && summary.latest_jump && !isSuspended && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">检测到跳变</p>
              <p className="text-xs text-red-600 mt-1">{summary.latest_jump.explanation}</p>
              <p className="text-xs text-red-500 mt-1">
                偏差 {summary.latest_jump.delta_pct.toFixed(1)}% · 触发类型: {summary.latest_jump.trigger} ·
                {summary.latest_jump.at ? new Date(summary.latest_jump.at).toLocaleString("zh-CN") : ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
