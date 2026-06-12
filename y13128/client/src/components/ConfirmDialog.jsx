import React, { useState } from "react";

export default function ConfirmDialog({ onConfirm, onCancel, confirming, currentStatus }) {
  const [operator, setOperator] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!operator.trim() || confirming) return;
    onConfirm(operator.trim(), note.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          人工确认判断
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {currentStatus === "suspended"
            ? "当前判断因单位问题被挂起，确认后判断将生效。"
            : "确认当前判断结果。"}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">确认人 *</label>
            <input
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              placeholder="例：老叶"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bayesian-500 focus:border-bayesian-500 outline-none"
              disabled={confirming}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">备注</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="可选：补充说明"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bayesian-500 outline-none resize-none"
              disabled={confirming}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 text-sm hover:text-gray-800"
              disabled={confirming}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={confirming || !operator.trim()}
              className="px-4 py-2 bg-bayesian-600 text-white rounded-lg text-sm font-medium hover:bg-bayesian-700 disabled:opacity-50 transition"
            >
              {confirming ? "确认中…" : "确认"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
