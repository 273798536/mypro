import { useFractalStore } from "@/store/useFractalStore";
import { paramGuardRules } from "@/data/paramGuards";
import { Camera, Download, FileText, X } from "lucide-react";
import { useRef, useState, useCallback } from "react";
import html2canvas from "html2canvas";

export default function ReportExport() {
  const { activeRule, activeShape, iterationCount, dimensionInfo, validations, auditLog, points } = useFractalStore();
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const errorCount = validations.filter((v) => v.severity === "error").length;
  const warningCount = validations.filter((v) => v.severity === "warning").length;
  const auditCount = auditLog.length;

  const generateReport = useCallback(async () => {
    setGenerating(true);
    setShowPreview(true);
    setTimeout(async () => {
      if (reportRef.current) {
        try {
          const canvas = await html2canvas(reportRef.current, {
            backgroundColor: "#0f172a",
            scale: 2,
          });
          canvasRef.current = canvas;
        } catch { /* ignore */ }
      }
      setGenerating(false);
    }, 500);
  }, []);

  function downloadReport() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `分形报告_${activeRule?.name || "custom"}_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  function downloadImage() {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `分形图_${activeRule?.name || "custom"}_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={generateReport}
          className="flex items-center gap-1.5 text-xs px-3 py-2 bg-violet-600/20 text-violet-300 border border-violet-500/30 rounded-lg hover:bg-violet-600/30 transition-colors"
        >
          <Camera size={12} /> 截图报告
        </button>
        <button
          onClick={downloadImage}
          disabled={points.length === 0}
          className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-700/50 text-slate-300 border border-slate-600/30 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Download size={12} /> 导出图片
        </button>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-violet-400" />
                <h2 className="text-sm font-semibold text-slate-200">截图报告预览</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadReport}
                  disabled={generating}
                  className="text-xs px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  <Download size={12} /> 下载报告
                </button>
                <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div ref={reportRef} className="bg-slate-950 rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-700/50 pb-4">
                  <div>
                    <h1 className="text-lg font-mono font-bold text-slate-100">分形图案课堂报告</h1>
                    <p className="text-xs text-slate-500 mt-1">生成时间: {new Date().toLocaleString("zh-CN")}</p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <div>规则: {activeRule?.name}</div>
                    <div>图形: {activeShape?.name}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-900/80 border border-slate-700/30 rounded-lg p-3 text-center">
                    <div className="text-[10px] text-slate-500 uppercase">Hausdorff 维度</div>
                    <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">{dimensionInfo.hausdorff || "—"}</div>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-700/30 rounded-lg p-3 text-center">
                    <div className="text-[10px] text-slate-500 uppercase">盒计数维度</div>
                    <div className="text-2xl font-mono font-bold text-blue-400 mt-1">{dimensionInfo.boxCount || "—"}</div>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-700/30 rounded-lg p-3 text-center">
                    <div className="text-[10px] text-slate-500 uppercase">迭代次数</div>
                    <div className="text-2xl font-mono font-bold text-violet-400 mt-1">{iterationCount}</div>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-700/30 rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-slate-300 mb-2">参数快照</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] font-mono">
                    <div className="text-slate-500">变换数量:</div><div className="text-slate-200">{activeRule?.transforms.length}</div>
                    <div className="text-slate-500">配色模式:</div><div className="text-slate-200">{activeRule?.colorScheme.mode}</div>
                    <div className="text-slate-500">颜色数:</div><div className="text-slate-200">{activeRule?.colorScheme.colors.length}</div>
                    <div className="text-slate-500">图层透明度:</div><div className="text-slate-200">{activeRule?.colorScheme.layerOpacity}</div>
                    <div className="text-slate-500">图形类型:</div><div className="text-slate-200">{activeShape?.type}</div>
                    <div className="text-slate-500">顶点数:</div><div className="text-slate-200">{activeShape?.vertices.length}</div>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-700/30 rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-slate-300 mb-2">校验状态</h3>
                  <div className="flex gap-4 text-xs">
                    <span className={errorCount > 0 ? "text-red-400" : "text-emerald-400"}>{errorCount} 个错误</span>
                    <span className={warningCount > 0 ? "text-amber-400" : "text-emerald-400"}>{warningCount} 个警告</span>
                    <span className="text-slate-400">{auditCount} 次修正</span>
                  </div>
                  {validations.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {validations.map((v, i) => (
                        <div key={i} className={`text-[10px] ${v.severity === "error" ? "text-red-400" : "text-amber-400"}`}>
                          [{v.type}] {v.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-slate-900/80 border border-emerald-500/20 rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-emerald-300 mb-2">参数保护口径</h3>
                  <div className="space-y-1.5">
                    {paramGuardRules.slice(0, 3).map((r, i) => (
                      <div key={i} className="text-[10px] text-slate-400 leading-relaxed">
                        <span className="text-emerald-400 font-mono">{r.paramPath}:</span> {r.description}
                      </div>
                    ))}
                    <div className="text-[9px] text-slate-600 mt-2 pt-2 border-t border-slate-700/30">
                      来源: {paramGuardRules[0]?.source} — 维度计算与参数保护同源定义，确保口径一致
                    </div>
                  </div>
                </div>

                {auditLog.length > 0 && (
                  <div className="bg-slate-900/80 border border-slate-700/30 rounded-lg p-4">
                    <h3 className="text-xs font-semibold text-slate-300 mb-2">修正摘要（最近5条）</h3>
                    <div className="space-y-1">
                      {auditLog.slice(0, 5).map((e, i) => (
                        <div key={i} className="text-[10px] font-mono text-slate-400">
                          <span className="text-slate-500">{new Date(e.timestamp).toLocaleTimeString("zh-CN")}</span>{" "}
                          <span className="text-amber-400">{e.targetFieldName}</span>: {String(e.oldValue)} → {String(e.newValue)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
