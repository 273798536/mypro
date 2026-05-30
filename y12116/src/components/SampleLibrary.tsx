import { useFractalStore } from "@/store/useFractalStore";
import { sampleRules, sampleShapes } from "@/data/samples";
import type { IterationRule, ConflictEntry } from "@/types";
import { AlertTriangle, Check, Download, FileDown, FlaskConical } from "lucide-react";
import { useRef, useState } from "react";

export default function SampleLibrary() {
  const { setRule, setShape, setConflicts, addAuditEntry } = useFractalStore();
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function loadSample(ruleIdx: number, shapeIdx: number) {
    const rule = { ...sampleRules[ruleIdx], id: crypto.randomUUID(), createdAt: Date.now(), updatedAt: Date.now() };
    const shape = { ...sampleShapes[shapeIdx], id: crypto.randomUUID(), createdAt: Date.now(), updatedAt: Date.now() };
    const conflicts = detectConflicts(rule, shape);
    setConflicts(conflicts);
    if (conflicts.length === 0) {
      setRule(rule);
      setShape(shape);
      addAuditEntry({
        targetRecordId: rule.id,
        targetFieldName: "sample",
        oldValue: null,
        newValue: rule.name,
        operator: "当前用户",
        reason: "从样例库加载",
      });
    } else {
      setRule(rule);
      setShape(shape);
    }
  }

  function handleImport() {
    setImportError("");
    try {
      const parsed = JSON.parse(importText);
      if (!parsed.transforms || !Array.isArray(parsed.transforms)) {
        setImportError("缺少 transforms 数组，不是合法的迭代规则 JSON");
        return;
      }
      const rule: IterationRule = {
        id: crypto.randomUUID(),
        name: parsed.name || "导入规则",
        transforms: parsed.transforms,
        colorScheme: parsed.colorScheme || { mode: "layer", colors: ["#10b981"], layerOpacity: 0.8 },
        maxIterations: parsed.maxIterations || 5,
        createdBy: "导入",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const shape = useFractalStore.getState().activeShape;
      const conflicts = detectConflicts(rule, shape);
      setConflicts(conflicts);
      setRule(rule);
      addAuditEntry({
        targetRecordId: rule.id,
        targetFieldName: "import",
        oldValue: null,
        newValue: rule.name,
        operator: "当前用户",
        reason: "从 JSON 导入",
      });
      setImportText("");
    } catch {
      setImportError("JSON 解析失败，请检查格式");
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setImportText(text);
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <FlaskConical size={14} /> 经典样例
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {sampleRules.map((rule, ri) => (
            <button
              key={rule.id}
              onClick={() => loadSample(ri, ri < sampleShapes.length ? ri : 0)}
              className="text-left px-3 py-2.5 bg-slate-800/70 border border-slate-700/50 rounded-lg hover:border-emerald-500/50 hover:bg-slate-800 transition-all group"
            >
              <div className="text-xs font-mono text-slate-200 group-hover:text-emerald-400 transition-colors">{rule.name}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{rule.transforms.length} 个变换 · 最多 {rule.maxIterations} 次迭代</div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-700/50 pt-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <FileDown size={14} /> 导入规则
        </h3>
        <textarea
          ref={textareaRef}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='粘贴迭代规则 JSON，如 {"name":"...","transforms":[...],...}'
          className="w-full h-28 text-xs font-mono bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-slate-300 placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none resize-none"
        />
        {importError && (
          <div className="mt-2 text-xs text-amber-400 flex items-center gap-1.5">
            <AlertTriangle size={12} /> {importError}
          </div>
        )}
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleImport}
            disabled={!importText.trim()}
            className="flex-1 text-xs px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
          >
            <Download size={12} /> 导入
          </button>
          <label className="text-xs px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer flex items-center gap-1.5">
            <FileDown size={12} /> 上传文件
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
}

function detectConflicts(rule: IterationRule, shape: { type: string; vertices: [number, number][] }): ConflictEntry[] {
  const conflicts: ConflictEntry[] = [];
  if (rule.transforms.length > 1 && shape.type === "point") {
    conflicts.push({
      field: "shapeType",
      ruleValue: `${rule.transforms.length} 个变换（建议多顶点图形）`,
      shapeValue: "单点（适合混沌游戏）",
      source: "initial_shape",
      resolved: false,
    });
  }
  if (rule.maxIterations > 10 && shape.vertices.length > 4) {
    conflicts.push({
      field: "iterationVertexMismatch",
      ruleValue: `迭代 ${rule.maxIterations} 次`,
      shapeValue: `${shape.vertices.length} 个顶点（组合后图元可能爆炸）`,
      source: "iteration_rule",
      resolved: false,
    });
  }
  return conflicts;
}

export { detectConflicts };
