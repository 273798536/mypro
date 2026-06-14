import React, { useState, useMemo } from "react";

const TYPE_OPTIONS = [
  { value: "old", label: "旧材料（首次导入）" },
  { value: "supplement", label: "补充材料" },
  { value: "normal_record", label: "正常记录" },
];

export default function MaterialImporter({ onImport, importing, currentPosterior }) {
  const [sourceLabel, setSourceLabel] = useState("");
  const [materialType, setMaterialType] = useState("old");
  const [likelihood, setLikelihood] = useState("0.6");
  const [evidence, setEvidence] = useState("1.0");
  const [unitKey, setUnitKey] = useState("");
  const [unitVal, setUnitVal] = useState("");
  const [unitInfo, setUnitInfo] = useState({});
  const [rawData, setRawData] = useState("");
  const [lastError, setLastError] = useState(null);

  const priorValue = typeof currentPosterior === "number" ? currentPosterior : 0.5;
  const likeNum = parseFloat(likelihood);
  const eviNum = parseFloat(evidence);

  const minEvidence = useMemo(() => {
    const l = Number.isFinite(likeNum) ? Math.min(Math.max(likeNum, 0), 1) : 0;
    const p = Math.min(Math.max(priorValue, 0), 1);
    return Math.max(l * p, 0.0001);
  }, [likeNum, priorValue]);

  const fieldErrors = useMemo(() => {
    const e = {};
    if (!Number.isFinite(likeNum) || likeNum < 0 || likeNum > 1) {
      e.likelihood = "似然值必须在 [0, 1] 之间";
    }
    if (!Number.isFinite(eviNum) || eviNum <= 0) {
      e.evidence = "证据值必须大于 0";
    } else if (eviNum < minEvidence - 1e-9) {
      e.evidence = `evidence 过小：要保证后验 ≤ 1，evidence 必须 ≥ ${minEvidence.toFixed(4)}`;
    }
    return e;
  }, [likeNum, eviNum, minEvidence]);

  const hasFieldError = Object.keys(fieldErrors).length > 0;

  const addUnit = () => {
    if (unitKey.trim()) {
      setUnitInfo((prev) => ({ ...prev, [unitKey.trim()]: unitVal.trim() }));
      setUnitKey("");
      setUnitVal("");
    }
  };

  const removeUnit = (key) => {
    setUnitInfo((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sourceLabel.trim() || importing || hasFieldError) return;
    setLastError(null);

    let parsedRaw = {};
    try {
      parsedRaw = rawData.trim() ? JSON.parse(rawData) : {};
    } catch {
      parsedRaw = { text: rawData };
    }

    try {
      await onImport({
        source_label: sourceLabel.trim(),
        material_type: materialType,
        raw_data: parsedRaw,
        unit_info: unitInfo,
        likelihood: parseFloat(likelihood) || 0.6,
        evidence: parseFloat(evidence) || 1.0,
      });
      setSourceLabel("");
      setRawData("");
    } catch (err) {
      setLastError(err.message || "导入失败");
      throw err;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">导入材料</h3>

      {lastError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm font-medium text-red-700">导入失败</p>
          <p className="text-xs text-red-600 mt-1 whitespace-pre-wrap">{lastError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">来源标签 *</label>
          <input
            type="text"
            value={sourceLabel}
            onChange={(e) => setSourceLabel(e.target.value)}
            placeholder="例：第一次草稿、补充记录#2"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bayesian-500 focus:border-bayesian-500 outline-none"
            disabled={importing}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">材料类型</label>
          <div className="flex gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMaterialType(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  materialType === opt.value
                    ? "bg-bayesian-600 text-white border-bayesian-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-bayesian-400"
                }`}
                disabled={importing}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              似然值 likelihood (0 – 1)
              {typeof currentPosterior === "number" && (
                <span className="text-gray-400 font-normal"> （当前先验 = {currentPosterior.toFixed(4)}）</span>
              )}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={likelihood}
              onChange={(e) => setLikelihood(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-bayesian-500 outline-none ${
                fieldErrors.likelihood
                  ? "border-red-400 bg-red-50"
                  : "border-gray-300 focus:border-bayesian-500"
              }`}
              disabled={importing}
            />
            {fieldErrors.likelihood && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.likelihood}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              证据值 evidence (≥ {minEvidence.toFixed(4)})
            </label>
            <input
              type="number"
              step="0.01"
              min={minEvidence.toFixed(4)}
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-bayesian-500 outline-none ${
                fieldErrors.evidence
                  ? "border-red-400 bg-red-50"
                  : "border-gray-300 focus:border-bayesian-500"
              }`}
              disabled={importing}
            />
            {fieldErrors.evidence ? (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.evidence}</p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">
                下限由 prior × likelihood 自动计算，避免后验概率 > 1
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">单位信息</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={unitKey}
              onChange={(e) => setUnitKey(e.target.value)}
              placeholder="量名 (如: 长度)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bayesian-500 outline-none"
              disabled={importing}
            />
            <input
              type="text"
              value={unitVal}
              onChange={(e) => setUnitVal(e.target.value)}
              placeholder="单位 (如: cm)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bayesian-500 outline-none"
              disabled={importing}
            />
            <button
              type="button"
              onClick={addUnit}
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition"
              disabled={importing}
            >
              +
            </button>
          </div>
          {Object.keys(unitInfo).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(unitInfo).map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1 px-2 py-1 bg-bayesian-50 text-bayesian-700 rounded text-xs border border-bayesian-200">
                  {k}: {v}
                  <button type="button" onClick={() => removeUnit(k)} className="text-bayesian-400 hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          )}
          <p className={`text-xs mt-1 ${Object.keys(unitInfo).length === 0 ? "text-amber-500" : "text-green-600"}`}>
            {Object.keys(unitInfo).length === 0
              ? "⚠ 未提供单位信息时，本次材料将被拒绝入库"
              : `✓ 已提供 ${Object.keys(unitInfo).length} 项单位信息`}
          </p>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">原始数据 (JSON 或文本)</label>
          <textarea
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            placeholder='{"x": 12.5, "y": 3.7}'
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-bayesian-500 outline-none resize-none"
            disabled={importing}
          />
        </div>

        <button
          type="submit"
          disabled={importing || !sourceLabel.trim() || hasFieldError}
          className="w-full py-2.5 bg-bayesian-600 text-white rounded-lg text-sm font-medium hover:bg-bayesian-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {importing ? "导入中…" : "导入材料"}
        </button>
      </form>
    </div>
  );
}
