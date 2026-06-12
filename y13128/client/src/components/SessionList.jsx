import React from "react";

export default function SessionList({ sessions, selectedId, onSelect, onDelete, loading, onRefresh }) {
  if (loading && sessions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center text-gray-400 text-sm">
        加载中…
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center text-gray-400 text-sm">
        暂无会话，请新建
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">会话列表</h3>
        <button onClick={onRefresh} className="text-xs text-bayesian-600 hover:text-bayesian-800" title="刷新">
          ↻ 刷新
        </button>
      </div>
      <ul className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
        {sessions.map((s) => (
          <li
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`px-4 py-3 cursor-pointer hover:bg-bayesian-50 transition flex items-center justify-between group ${
              selectedId === s.id ? "bg-bayesian-50 border-l-4 border-bayesian-600" : "border-l-4 border-transparent"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 truncate">{s.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{new Date(s.created_at).toLocaleString("zh-CN")}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
              className="ml-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
              title="删除"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
