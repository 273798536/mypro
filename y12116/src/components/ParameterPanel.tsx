import { useFractalStore } from "@/store/useFractalStore";
import type { AffineTransform, ColorScheme } from "@/types";
import { Plus, Trash2, ChevronDown, ChevronUp, Palette } from "lucide-react";
import { useState } from "react";

export default function ParameterPanel() {
  const { activeRule, activeShape, iterationCount, updateRuleField, updateShapeField, setIterationCount, addAuditEntry, generate } = useFractalStore();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ transforms: true, color: true, shape: true });

  function toggleSection(s: string) {
    setExpandedSections((p) => ({ ...p, [s]: !p[s] }));
  }

  function handleTransformChange(idx: number, key: keyof AffineTransform, val: string) {
    const newTransforms = [...activeRule.transforms];
    const numVal = parseFloat(val);
    if (isNaN(numVal) && key !== "probability") return;
    const oldVal = newTransforms[idx][key];
    newTransforms[idx] = { ...newTransforms[idx], [key]: key === "probability" ? parseFloat(val) || 0 : numVal };
    updateRuleField("transforms", newTransforms);
    addAuditEntry({
      targetRecordId: activeRule.id,
      targetFieldName: `transforms[${idx}].${key}`,
      oldValue: oldVal,
      newValue: newTransforms[idx][key],
      operator: "当前用户",
      reason: "手动修改变换参数",
    });
  }

  function handleColorChange(idx: number, color: string) {
    const newColors = [...activeRule.colorScheme.colors];
    const old = newColors[idx];
    newColors[idx] = color;
    const newScheme: ColorScheme = { ...activeRule.colorScheme, colors: newColors };
    updateRuleField("colorScheme", newScheme);
    addAuditEntry({
      targetRecordId: activeRule.id,
      targetFieldName: `colorScheme.colors[${idx}]`,
      oldValue: old,
      newValue: color,
      operator: "当前用户",
      reason: "手动修改颜色",
    });
  }

  function addTransform() {
    const newTransforms = [...activeRule.transforms, { a: 0.5, b: 0, c: 0, d: 0.5, e: 0, f: 0, probability: 1 / (activeRule.transforms.length + 1) }];
    const rebalanced = newTransforms.map((t) => ({ ...t, probability: 1 / newTransforms.length }));
    updateRuleField("transforms", rebalanced);
    addAuditEntry({
      targetRecordId: activeRule.id,
      targetFieldName: "transforms",
      oldValue: activeRule.transforms.length,
      newValue: rebalanced.length,
      operator: "当前用户",
      reason: "添加新变换",
    });
  }

  function removeTransform(idx: number) {
    const newTransforms = activeRule.transforms.filter((_, i) => i !== idx);
    if (newTransforms.length === 0) return;
    const rebalanced = newTransforms.map((t) => ({ ...t, probability: 1 / newTransforms.length }));
    updateRuleField("transforms", rebalanced);
    addAuditEntry({
      targetRecordId: activeRule.id,
      targetFieldName: `transforms[${idx}]`,
      oldValue: "存在",
      newValue: "已删除",
      operator: "当前用户",
      reason: "删除变换",
    });
  }

  function handleVertexChange(idx: number, axis: 0 | 1, val: string) {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const newVerts = [...activeShape.vertices] as [number, number][];
    const old = newVerts[idx][axis];
    newVerts[idx] = [...newVerts[idx]] as [number, number];
    newVerts[idx][axis] = num;
    updateShapeField("vertices", newVerts);
    addAuditEntry({
      targetRecordId: activeShape.id,
      targetFieldName: `vertices[${idx}][${axis}]`,
      oldValue: old,
      newValue: num,
      operator: "当前用户",
      reason: "手动修改顶点",
    });
  }

  return (
    <div className="space-y-3 text-xs h-full overflow-y-auto pr-1 custom-scrollbar">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200 font-mono">{activeRule.name}</h2>
        <button
          onClick={generate}
          className="px-4 py-2 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-500 transition-colors font-semibold shadow-lg shadow-emerald-600/20"
        >
          生成分形
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="text-slate-400 text-[10px] uppercase tracking-wider">迭代次数</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={15}
            value={iterationCount}
            onChange={(e) => setIterationCount(parseInt(e.target.value))}
            className="flex-1 accent-emerald-500"
          />
          <span className="text-emerald-400 font-mono w-6 text-right">{iterationCount}</span>
        </div>
        <div className="text-[10px] text-slate-500">规则上限: {activeRule.maxIterations}</div>
      </div>

      <div className="border-t border-slate-700/50 pt-3">
        <button onClick={() => toggleSection("transforms")} className="flex items-center gap-1.5 text-slate-300 font-semibold w-full text-left mb-2">
          {expandedSections.transforms ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          仿射变换
          <span className="text-slate-500 font-normal">({activeRule.transforms.length})</span>
        </button>
        {expandedSections.transforms && (
          <div className="space-y-2">
            {activeRule.transforms.map((t, idx) => (
              <div key={idx} className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-2.5 relative group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-slate-400">T{idx + 1}</span>
                  {activeRule.transforms.length > 1 && (
                    <button onClick={() => removeTransform(idx)} className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["a", "b", "c", "d", "e", "f"] as const).map((k) => (
                    <div key={k}>
                      <label className="text-[9px] text-slate-500">{k}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={t[k]}
                        onChange={(e) => handleTransformChange(idx, k, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/50 rounded px-1.5 py-1 text-slate-200 font-mono text-[11px] focus:border-emerald-500/50 focus:outline-none"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-[9px] text-slate-500">概率</label>
                    <input
                      type="number"
                      step="0.01"
                      value={t.probability}
                      onChange={(e) => handleTransformChange(idx, "probability", e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/50 rounded px-1.5 py-1 text-amber-400 font-mono text-[11px] focus:border-emerald-500/50 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addTransform} className="w-full py-2 border border-dashed border-slate-600/50 rounded-lg text-slate-500 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors flex items-center justify-center gap-1">
              <Plus size={12} /> 添加变换
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-slate-700/50 pt-3">
        <button onClick={() => toggleSection("color")} className="flex items-center gap-1.5 text-slate-300 font-semibold w-full text-left mb-2">
          {expandedSections.color ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          <Palette size={12} /> 配色方案
        </button>
        {expandedSections.color && (
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-slate-500">模式</label>
              <select
                value={activeRule.colorScheme.mode}
                onChange={(e) => {
                  const newScheme: ColorScheme = { ...activeRule.colorScheme, mode: e.target.value as ColorScheme["mode"] };
                  updateRuleField("colorScheme", newScheme);
                }}
                className="w-full bg-slate-900 border border-slate-700/50 rounded px-2 py-1.5 text-slate-200 text-[11px] focus:border-emerald-500/50 focus:outline-none"
              >
                <option value="layer">按图层</option>
                <option value="gradient">渐变</option>
                <option value="fixed">固定</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">颜色列表</label>
              <div className="flex flex-wrap gap-1.5">
                {activeRule.colorScheme.colors.map((c, idx) => (
                  <div key={idx} className="relative group">
                    <input
                      type="color"
                      value={c}
                      onChange={(e) => handleColorChange(idx, e.target.value)}
                      className="w-8 h-8 rounded border border-slate-600/50 cursor-pointer bg-transparent"
                    />
                    <span className="absolute -bottom-4 left-0 text-[8px] text-slate-500 font-mono">{c}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500">图层透明度</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={activeRule.colorScheme.layerOpacity}
                  onChange={(e) => {
                    const newScheme: ColorScheme = { ...activeRule.colorScheme, layerOpacity: parseFloat(e.target.value) };
                    updateRuleField("colorScheme", newScheme);
                  }}
                  className="flex-1 accent-emerald-500"
                />
                <span className="text-emerald-400 font-mono w-8 text-right">{activeRule.colorScheme.layerOpacity.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-700/50 pt-3">
        <button onClick={() => toggleSection("shape")} className="flex items-center gap-1.5 text-slate-300 font-semibold w-full text-left mb-2">
          {expandedSections.shape ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          初始图形: {activeShape.name}
        </button>
        {expandedSections.shape && (
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-slate-500">类型</label>
              <select
                value={activeShape.type}
                onChange={(e) => updateShapeField("type", e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/50 rounded px-2 py-1.5 text-slate-200 text-[11px] focus:border-emerald-500/50 focus:outline-none"
              >
                <option value="point">点</option>
                <option value="line">线段</option>
                <option value="polygon">多边形</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">顶点 ({activeShape.vertices.length})</label>
              <div className="space-y-1">
                {activeShape.vertices.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-500 w-5">V{idx + 1}</span>
                    <input
                      type="number"
                      step="0.1"
                      value={v[0]}
                      onChange={(e) => handleVertexChange(idx, 0, e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700/50 rounded px-1.5 py-1 text-slate-200 font-mono text-[11px] focus:border-emerald-500/50 focus:outline-none"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={v[1]}
                      onChange={(e) => handleVertexChange(idx, 1, e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700/50 rounded px-1.5 py-1 text-slate-200 font-mono text-[11px] focus:border-emerald-500/50 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
