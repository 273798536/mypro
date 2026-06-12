import React, { useState, useEffect, useCallback } from "react";
import { getSession, importMaterial, confirmJudgment, getSummary } from "../api";
import JudgmentSummary from "./JudgmentSummary";
import MaterialImporter from "./MaterialImporter";
import HistoryTimeline from "./HistoryTimeline";
import JumpReports from "./JumpReports";
import ConfirmDialog from "./ConfirmDialog";

export default function SessionDetail({ sessionId }) {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [d, s] = await Promise.all([getSession(sessionId), getSummary(sessionId)]);
      setData(d);
      setSummary(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleImport = async (materialData) => {
    setImporting(true);
    try {
      await importMaterial(sessionId, materialData);
      await refresh();
    } catch (e) {
      alert("导入失败: " + e.message);
    } finally {
      setImporting(false);
    }
  };

  const handleConfirm = async (operator, note) => {
    setConfirming(true);
    try {
      await confirmJudgment(sessionId, operator, note);
      await refresh();
      setShowConfirm(false);
    } catch (e) {
      alert("确认失败: " + e.message);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
        加载中…
      </div>
    );
  }

  if (!data) return null;

  const { session, batches, judgment, history, reports } = data;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">{session.title}</h2>
          <p className="text-xs text-gray-400 mt-1">创建于 {new Date(session.created_at).toLocaleString("zh-CN")}</p>
        </div>
        <div className="flex gap-2">
          {judgment && judgment.status === "suspended" && (
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition"
            >
              人工确认
            </button>
          )}
          {judgment && judgment.status === "active" && (
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
            >
              确认判断
            </button>
          )}
          {judgment && judgment.status === "confirmed" && (
            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
              ✓ 已确认
            </span>
          )}
        </div>
      </div>

      <JudgmentSummary judgment={judgment} summary={summary} batchCount={batches.length} />

      <MaterialImporter onImport={handleImport} importing={importing} />

      {reports.length > 0 && <JumpReports reports={reports} />}

      {history.length > 0 && <HistoryTimeline history={history} />}

      {showConfirm && (
        <ConfirmDialog
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
          confirming={confirming}
          currentStatus={judgment?.status}
        />
      )}
    </div>
  );
}
