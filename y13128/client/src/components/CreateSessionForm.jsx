import React, { useState } from "react";

export default function CreateSessionForm({ onCreate }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await onCreate(title.trim());
      setTitle("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">新建解释会话</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例：老叶第三次课 — 贝叶斯先验"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bayesian-500 focus:border-bayesian-500 outline-none"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="px-4 py-2 bg-bayesian-600 text-white rounded-lg text-sm font-medium hover:bg-bayesian-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          创建
        </button>
      </div>
    </form>
  );
}
