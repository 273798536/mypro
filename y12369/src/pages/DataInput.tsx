import { useState, useRef, Fragment } from "react";
import { useStore, createEmptyHull, createEmptyLoad, createEmptyInclination } from "@/store/useStore";
import type { HullParams, InclinationRecord } from "@/types";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";

const SRC_BADGE: Record<HullParams["source"], { label: string; cls: string }> = {
  input: { label: "手动录入", cls: "bg-blue-100 text-blue-700" },
  import: { label: "文件导入", cls: "bg-purple-100 text-purple-700" },
  sample: { label: "样例数据", cls: "bg-teal-100 text-teal-700" },
};

const INC_SRC_LABEL: Record<InclinationRecord["source"], string> = {
  sensor: "传感器",
  manual: "手动",
  calculated: "计算值",
};

export default function DataInput() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    hulls, loads, inclinations,
    addHull, updateHull, removeHull,
    addLoad, updateLoad, removeLoad,
    addInclination, updateInclination, removeInclination,
    loadSampleData, runVerification, clearAll, importData,
  } = useStore();

  const toggleExpand = (id: string) => setExpandedId((p) => (p === id ? null : id));

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        importData({ hulls: data.hulls, loads: data.loads, inclinations: data.inclinations });
      } catch { /* invalid json */ }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const numInput = (val: number, onChange: (v: number) => void, w = "w-20") => (
    <input type="number" value={val || ""} onChange={(e) => onChange(Number(e.target.value) || 0)}
      className={`${w} px-1.5 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#00BFA5]`} />
  );

  const cgInput = (val: number, onChange: (v: number) => void, modified: boolean) => (
    <div className="flex items-center gap-1">
      {numInput(val, onChange, "w-16")}
      {modified && (
        <span className="flex items-center gap-0.5 text-[10px] text-[#FF6D00] whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF6D00]" />已修改
        </span>
      )}
    </div>
  );

  const txtInput = (val: string, onChange: (v: string) => void, w = "w-24") => (
    <input value={val} onChange={(e) => onChange(e.target.value)}
      className={`${w} px-1.5 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#00BFA5]`} />
  );

  const hullLoads = (hullId: string) => loads.filter((l) => l.hullId === hullId);
  const hullIncs = (hullId: string) => inclinations.filter((i) => i.hullId === hullId);

  return (
    <div className="p-6 space-y-6 font-body">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-slate-800">数据录入</h2>
        <div className="flex items-center gap-3">
          <button onClick={loadSampleData}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">加载样例</button>
          <button onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">导入文件</button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <button onClick={runVerification}
            className="px-3 py-1.5 text-sm bg-[#00BFA5] text-white rounded-lg hover:bg-[#00a890]">批量校验</button>
          <button onClick={clearAll}
            className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">清空</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0A2540] text-white text-xs">
                {["", "船名", "船长(m)", "船宽(m)", "型深(m)", "吃水(m)", "排水量(t)",
                  "cgX", "cgY", "cgZ", "密度", "水型", "备注", "来源", ""].map((h, i) => (
                  <th key={i} className="px-3 py-2.5 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hulls.map((hull, idx) => (
                <Fragment key={hull.id}>
                  <tr className={`cursor-pointer hover:bg-slate-50/80 ${idx % 2 ? "bg-slate-50/50" : ""}`}
                    onClick={() => toggleExpand(hull.id)}>
                    <td className="px-3 py-2 text-slate-400">
                      {expandedId === hull.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {txtInput(hull.name, (v) => updateHull(hull.id, { name: v }))}
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {numInput(hull.length, (v) => updateHull(hull.id, { length: v }))}</td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {numInput(hull.beam, (v) => updateHull(hull.id, { beam: v }))}</td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {numInput(hull.depth, (v) => updateHull(hull.id, { depth: v }))}</td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {numInput(hull.draft, (v) => updateHull(hull.id, { draft: v }))}</td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {numInput(hull.displacement, (v) => updateHull(hull.id, { displacement: v }))}</td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {cgInput(hull.cgX, (v) => updateHull(hull.id, { cgX: v }), hull.cgModified)}</td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {cgInput(hull.cgY, (v) => updateHull(hull.id, { cgY: v }), hull.cgModified)}</td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {cgInput(hull.cgZ, (v) => updateHull(hull.id, { cgZ: v }), hull.cgModified)}</td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {numInput(hull.density, (v) => updateHull(hull.id, { density: v }), "w-16")}</td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <select value={hull.densityUnit} onChange={(e) => updateHull(hull.id, { densityUnit: e.target.value as "fresh" | "salt" })}
                        className="px-1.5 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#00BFA5]">
                        <option value="fresh">淡水</option>
                        <option value="salt">海水</option>
                      </select>
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {txtInput(hull.remark, (v) => updateHull(hull.id, { remark: v }), "w-20")}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${SRC_BADGE[hull.source].cls}`}>
                        {SRC_BADGE[hull.source].label}
                      </span>
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => removeHull(hull.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>

                  {expandedId === hull.id && (
                    <tr>
                      <td colSpan={15} className="px-6 py-4 bg-slate-50/80 space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">载荷列表</h4>
                            <button onClick={() => addLoad(createEmptyLoad(hull.id))}
                              className="flex items-center gap-1 text-xs text-[#00BFA5] hover:underline">
                              <Plus size={12} />添加载荷
                            </button>
                          </div>
                          <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                            <thead>
                              <tr className="bg-slate-200/60 text-xs text-slate-600">
                                <th className="px-3 py-2 text-left">名称</th>
                                <th className="px-3 py-2 text-left">重量(t)</th>
                                <th className="px-3 py-2 text-left">X(m)</th>
                                <th className="px-3 py-2 text-left">Y(m)</th>
                                <th className="px-3 py-2 text-left">Z(m)</th>
                                <th className="px-3 py-2 w-10" />
                              </tr>
                            </thead>
                            <tbody>
                              {hullLoads(hull.id).map((ld) => (
                                <tr key={ld.id} className="border-t border-slate-100">
                                  <td className="px-3 py-1.5">{txtInput(ld.name, (v) => updateLoad(ld.id, { name: v }), "w-28")}</td>
                                  <td className="px-3 py-1.5">{numInput(ld.weight, (v) => updateLoad(ld.id, { weight: v }))}</td>
                                  <td className="px-3 py-1.5">{numInput(ld.positionX, (v) => updateLoad(ld.id, { positionX: v }))}</td>
                                  <td className="px-3 py-1.5">{numInput(ld.positionY, (v) => updateLoad(ld.id, { positionY: v }))}</td>
                                  <td className="px-3 py-1.5">{numInput(ld.positionZ, (v) => updateLoad(ld.id, { positionZ: v }))}</td>
                                  <td className="px-3 py-1.5">
                                    <button onClick={() => removeLoad(ld.id)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                                  </td>
                                </tr>
                              ))}
                              {hullLoads(hull.id).length === 0 && (
                                <tr><td colSpan={6} className="px-3 py-3 text-center text-xs text-slate-400">暂无载荷数据</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">倾角记录</h4>
                            <button onClick={() => addInclination(createEmptyInclination(hull.id))}
                              className="flex items-center gap-1 text-xs text-[#00BFA5] hover:underline">
                              <Plus size={12} />添加记录
                            </button>
                          </div>
                          <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                            <thead>
                              <tr className="bg-slate-200/60 text-xs text-slate-600">
                                <th className="px-3 py-2 text-left">横滚角(°)</th>
                                <th className="px-3 py-2 text-left">纵倾角(°)</th>
                                <th className="px-3 py-2 text-left">测量时间</th>
                                <th className="px-3 py-2 text-left">来源</th>
                                <th className="px-3 py-2 w-10" />
                              </tr>
                            </thead>
                            <tbody>
                              {hullIncs(hull.id).map((inc) => (
                                <tr key={inc.id} className="border-t border-slate-100">
                                  <td className="px-3 py-1.5">{numInput(inc.rollAngle, (v) => updateInclination(inc.id, { rollAngle: v }), "w-20")}</td>
                                  <td className="px-3 py-1.5">{numInput(inc.pitchAngle, (v) => updateInclination(inc.id, { pitchAngle: v }), "w-20")}</td>
                                  <td className="px-3 py-1.5">
                                    <input type="datetime-local" value={inc.measuredAt.slice(0, 16)}
                                      onChange={(e) => updateInclination(inc.id, { measuredAt: new Date(e.target.value).toISOString() })}
                                      className="px-1.5 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#00BFA5]" />
                                  </td>
                                  <td className="px-3 py-1.5">
                                    <select value={inc.source} onChange={(e) => updateInclination(inc.id, { source: e.target.value as InclinationRecord["source"] })}
                                      className="px-1.5 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#00BFA5]">
                                      {(["sensor", "manual", "calculated"] as const).map((s) => (
                                        <option key={s} value={s}>{INC_SRC_LABEL[s]}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-3 py-1.5">
                                    <button onClick={() => removeInclination(inc.id)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                                  </td>
                                </tr>
                              ))}
                              {hullIncs(hull.id).length === 0 && (
                                <tr><td colSpan={5} className="px-3 py-3 text-center text-xs text-slate-400">暂无倾角记录</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {hulls.length === 0 && (
                <tr>
                  <td colSpan={15} className="px-4 py-8 text-center text-sm text-slate-400">
                    暂无船体数据，点击下方按钮添加或加载样例
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100">
          <button onClick={() => addHull(createEmptyHull())}
            className="flex items-center gap-1.5 text-sm text-[#00BFA5] hover:underline">
            <Plus size={14} />添加船体
          </button>
        </div>
      </div>
    </div>
  );
}
