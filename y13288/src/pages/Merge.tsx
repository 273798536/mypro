import { useState, useMemo } from "react";
import { useSchemeStore } from "@/store/useSchemeStore";
import { GitMerge, AlertTriangle, Check, ArrowRight } from "lucide-react";

function highlightDiff(text: string, other: string) {
  const freq = new Map<string, number>();
  for (const ch of other) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  const remaining = new Map(freq);
  const segments: { text: string; isDiff: boolean }[] = [];
  let current = "";
  let currentIsDiff: boolean | null = null;

  for (const ch of text) {
    const count = remaining.get(ch) ?? 0;
    const isCommon = count > 0;
    if (isCommon) {
      remaining.set(ch, count - 1);
    }
    const diff = !isCommon;
    if (currentIsDiff === null) {
      currentIsDiff = diff;
    }
    if (diff === currentIsDiff) {
      current += ch;
    } else {
      segments.push({ text: current, isDiff: currentIsDiff! });
      current = ch;
      currentIsDiff = diff;
    }
  }
  if (current) {
    segments.push({ text: current, isDiff: currentIsDiff! });
  }

  return segments.map((seg, i) =>
    seg.isDiff ? (
      <span key={i} style={{ color: "#E8742C", fontWeight: 600 }}>
        {seg.text}
      </span>
    ) : (
      <span key={i}>{seg.text}</span>
    )
  );
}

export default function Merge() {
  const scheme = useSchemeStore((s) => s.getActiveScheme());
  const detectSimilarPoints = useSchemeStore((s) => s.detectSimilarPoints);
  const mergePointsAction = useSchemeStore((s) => s.mergePoints);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [canonicalName, setCanonicalName] = useState("");
  const [reason, setReason] = useState("");
  const [operator, setOperator] = useState("");
  const [lastMergeId, setLastMergeId] = useState<string | null>(null);

  const candidates = useMemo(() => {
    if (!scheme) return [];
    return detectSimilarPoints(scheme.id);
  }, [scheme, detectSimilarPoints]);

  const selectedPair =
    selectedIdx !== null && selectedIdx < candidates.length
      ? candidates[selectedIdx]
      : null;

  const lastMergeRecord = useMemo(() => {
    if (!lastMergeId || !scheme) return null;
    return scheme.mergeRecords.find((r) => r.id === lastMergeId) ?? null;
  }, [lastMergeId, scheme]);

  const mergedPoints = useMemo(() => {
    if (!scheme) return [];
    return scheme.locationPoints.filter((p) => p.mergedFrom.length > 0);
  }, [scheme]);

  const mergeRecords = useMemo(() => {
    if (!scheme) return [];
    return scheme.mergeRecords;
  }, [scheme]);

  function handleSelect(idx: number) {
    setSelectedIdx(idx);
    const pair = candidates[idx];
    setCanonicalName(pair.pointA.rawName);
    setReason("");
    setOperator("");
    setLastMergeId(null);
  }

  function handleMerge() {
    if (!scheme || !selectedPair || !reason.trim() || !canonicalName.trim()) return;
    const record = mergePointsAction(
      scheme.id,
      [selectedPair.pointA.id, selectedPair.pointB.id],
      canonicalName.trim(),
      reason.trim(),
      operator.trim()
    );
    setLastMergeId(record.id);
    setSelectedIdx(null);
    setCanonicalName("");
    setReason("");
    setOperator("");
  }

  function handleCancel() {
    setSelectedIdx(null);
    setCanonicalName("");
    setReason("");
    setOperator("");
    setLastMergeId(null);
  }

  if (!scheme) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        请先选择一个方案
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <GitMerge className="w-6 h-6" style={{ color: "#0F4C54" }} />
        <h1
          className="text-2xl font-serif-title font-bold"
          style={{ color: "#0F4C54" }}
        >
          点位归并台
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="card">
            <h2
              className="text-lg font-serif-title font-semibold mb-4"
              style={{ color: "#0F4C54" }}
            >
              归并候选区
            </h2>

            {candidates.length === 0 ? (
              <p className="text-gray-400 text-sm py-4">
                暂无自动检测到的相似点位对
              </p>
            ) : (
              <div className="space-y-3">
                {candidates.map((pair, idx) => (
                  <div
                    key={`${pair.pointA.id}-${pair.pointB.id}`}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedIdx === idx
                        ? "bg-teal-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                    style={
                      selectedIdx === idx
                        ? { borderColor: "#0F4C54" }
                        : undefined
                    }
                    onClick={() => handleSelect(idx)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 flex items-center gap-2 text-base">
                        <span>
                          {highlightDiff(
                            pair.pointA.rawName,
                            pair.pointB.rawName
                          )}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>
                          {highlightDiff(
                            pair.pointB.rawName,
                            pair.pointA.rawName
                          )}
                        </span>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                        style={{
                          backgroundColor: "#FEF3C7",
                          color: "#92400E",
                        }}
                      >
                        相似度 {(pair.similarity * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {mergedPoints.length > 0 && (
            <div className="card">
              <h2
                className="text-lg font-serif-title font-semibold mb-3"
                style={{ color: "#0F4C54" }}
              >
                已归并点位
              </h2>
              <div className="space-y-2">
                {mergedPoints.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="line-through text-gray-400">
                      {p.rawName}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="font-medium">{p.canonicalName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedPair ? (
            <div className="card space-y-4">
              <h2
                className="text-lg font-serif-title font-semibold"
                style={{ color: "#0F4C54" }}
              >
                归并详情与证据留痕
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    原始名称 A
                  </label>
                  <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm">
                    {selectedPair.pointA.rawName}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    原始名称 B
                  </label>
                  <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm">
                    {selectedPair.pointB.rawName}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    归并后标准名称
                  </label>
                  <input
                    type="text"
                    value={canonicalName}
                    onChange={(e) => setCanonicalName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0F4C54]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    归并原因{" "}
                    <span style={{ color: "#E8742C" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0F4C54]"
                    placeholder="请输入归并原因"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    操作人
                  </label>
                  <input
                    type="text"
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0F4C54]"
                    placeholder="请输入操作人姓名"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleMerge}
                  disabled={!reason.trim() || !canonicalName.trim()}
                >
                  <GitMerge className="w-4 h-4" />
                  确认归并
                </button>
                <button className="btn-secondary" onClick={handleCancel}>
                  取消
                </button>
              </div>
            </div>
          ) : lastMergeRecord ? (
            <div className="card space-y-4">
              <h2
                className="text-lg font-serif-title font-semibold"
                style={{ color: "#0F4C54" }}
              >
                归并完成 — 证据留痕
              </h2>

              {lastMergeRecord.isAdjacentWarning && (
                <div
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{
                    backgroundColor: "#FEF3C7",
                    border: "1px solid #F59E0B",
                  }}
                >
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">相邻路口归并警告</p>
                    <p className="text-amber-700 mt-1">
                      "{lastMergeRecord.evidenceSnapshot.originalA}" 与 "
                      {lastMergeRecord.evidenceSnapshot.originalB}"
                      属于相邻路口，可能被错误合并，请前往异常卡口确认。
                    </p>
                  </div>
                </div>
              )}

              <div
                className="p-4 rounded-lg bg-gray-50 space-y-2 text-sm"
                style={{ borderLeft: "4px solid #0F4C54" }}
              >
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium">归并成功</span>
                </div>
                <div className="text-gray-600 space-y-1">
                  <p>
                    原始名称 A：
                    <span className="font-medium text-gray-800">
                      {lastMergeRecord.evidenceSnapshot.originalA}
                    </span>
                  </p>
                  <p>
                    原始名称 B：
                    <span className="font-medium text-gray-800">
                      {lastMergeRecord.evidenceSnapshot.originalB}
                    </span>
                  </p>
                  <p>
                    归并原因：
                    <span className="font-medium text-gray-800">
                      {lastMergeRecord.reason}
                    </span>
                  </p>
                  <p>
                    操作人：
                    <span className="font-medium text-gray-800">
                      {lastMergeRecord.operator || "未填写"}
                    </span>
                  </p>
                  <p>
                    归并时间：
                    <span className="font-medium text-gray-800">
                      {new Date(lastMergeRecord.timestamp).toLocaleString(
                        "zh-CN"
                      )}
                    </span>
                  </p>
                </div>
              </div>

              <button className="btn-secondary w-full" onClick={handleCancel}>
                返回候选区
              </button>
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center py-12 text-gray-400">
              <GitMerge className="w-10 h-10 mb-3" />
              <p className="text-sm">请从左侧选择一对候选点位</p>
            </div>
          )}
        </div>
      </div>

      {mergeRecords.length > 0 && (
        <div className="card">
          <h2
            className="text-lg font-serif-title font-semibold mb-4"
            style={{ color: "#0F4C54" }}
          >
            已归并记录
          </h2>
          <div className="space-y-3">
            {mergeRecords.map((record) => (
              <div
                key={record.id}
                className="p-4 rounded-lg bg-gray-50"
                style={{ borderLeft: "4px solid #0F4C54" }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-medium">
                    {record.evidenceSnapshot.originalA}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="font-medium">
                    {record.evidenceSnapshot.originalB}
                  </span>
                  {record.isAdjacentWarning && (
                    <span className="badge-pending flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      相邻警告
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 space-y-0.5">
                  <p>归并原因：{record.reason}</p>
                  <p>操作人：{record.operator || "未填写"}</p>
                  <p>
                    归并时间：
                    {new Date(record.timestamp).toLocaleString("zh-CN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
