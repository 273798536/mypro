import { useState } from "react";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import { Header } from "@/components/Header";
import { getFlipExplanation } from "@/utils/flipExplanations";
import { generateReportHTML, generateReportText, generateReportJSON, downloadFile } from "@/utils/reportGenerator";
import {
  FileText,
  Copy,
  Check,
  AlertTriangle,
  Layers,
  MapPin,
  History,
  ArrowLeft,
  ExternalLink,
  Globe,
  FileJson,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Annotation } from "@/types";

const typeLabelMap: Record<Annotation["type"], string> = {
  rectangle: "矩形标注",
  circle: "圆形标注",
  polygon: "多边形标注",
  freehand: "自由手绘",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("zh-CN");
}

function calculateBounds(ann: Annotation) {
  const coords = ann.coordinates;
  if (ann.type === "circle" && coords.length >= 2) {
    const c = coords[0];
    const e = coords[1];
    const r = Math.sqrt(Math.pow(e.x - c.x, 2) + Math.pow(e.y - c.y, 2));
    return {
      minX: c.x - r, minY: c.y - r,
      maxX: c.x + r, maxY: c.y + r,
      w: r * 2, h: r * 2,
      cx: c.x, cy: c.y,
    };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of coords) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

export default function Report() {
  const navigate = useNavigate();
  const { record } = useAnnotationStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const flipInfo = record.isFlipped && record.flipType ? getFlipExplanation(record.flipType) : null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExportHTML = () => {
    const html = generateReportHTML(record);
    downloadFile(html, `${record.name || "轨迹记录"}_报告.html`, "text/html;charset=utf-8");
  };

  const handleExportTXT = () => {
    const txt = generateReportText(record);
    downloadFile(txt, `${record.name || "轨迹记录"}_报告.txt`, "text/plain;charset=utf-8");
  };

  const handleExportJSON = () => {
    const json = generateReportJSON(record);
    downloadFile(json, `${record.name || "轨迹记录"}.json`, "application/json");
  };

  const handleOpenHTML = () => {
    const html = generateReportHTML(record);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const stats = {
    total: record.annotations.length,
    byType: {} as Record<string, number>,
    byLabel: {} as Record<string, number>,
    snapped: 0,
  };
  for (const ann of record.annotations) {
    stats.byType[ann.type] = (stats.byType[ann.type] || 0) + 1;
    if (ann.label) stats.byLabel[ann.label] = (stats.byLabel[ann.label] || 0) + 1;
    if (ann.isSnapped) stats.snapped++;
  }

  return (
    <div className="h-screen flex flex-col bg-neutral-50">
      <Header />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/")}
                className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500"
                title="返回工作台"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-medical-600" />
                  标注审核报告
                </h1>
                <p className="text-sm text-neutral-500 mt-0.5">
                  {record.name} · 生成于 {formatDate(new Date().toISOString())}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenHTML}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-medical-600 text-white hover:bg-medical-700 transition shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                在新窗口打开
              </button>
              <button
                onClick={handleExportHTML}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg btn-secondary"
              >
                <Globe className="w-4 h-4" />
                导出 HTML
              </button>
              <button
                onClick={handleExportTXT}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg btn-secondary"
              >
                <FileText className="w-4 h-4" />
                导出 TXT
              </button>
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg btn-secondary"
              >
                <FileJson className="w-4 h-4" />
                导出 JSON
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="text-xs text-neutral-500">标注总数</div>
              <div className="text-3xl font-bold text-neutral-800 mt-1">{stats.total}</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-neutral-500">操作记录</div>
              <div className="text-3xl font-bold text-neutral-800 mt-1">{record.operations.length}</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-neutral-500">网格吸附</div>
              <div className="text-3xl font-bold text-success-600 mt-1">{stats.snapped}</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-neutral-500">比例尺</div>
              <div className="text-xl font-bold text-neutral-800 mt-2">
                {record.scale.value} px/{record.scale.unit}
              </div>
            </div>
          </div>

          {flipInfo && (
            <div className="bg-gradient-to-r from-warning-50 to-orange-50 border border-warning-200 rounded-2xl p-5 animate-slide-up">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-warning-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-warning-800">
                      ⚠️ 坐标变换说明 - {flipInfo.title}
                    </h3>
                    <span className="tag-warning">重要</span>
                  </div>
                  <p className="text-sm text-warning-700 mb-3">{flipInfo.detail}</p>
                  <div className="bg-white rounded-xl border border-warning-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm text-neutral-700 leading-relaxed">
                        {flipInfo.copyText}
                      </div>
                      <button
                        onClick={() => handleCopy(flipInfo.copyText!, "flip")}
                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-medical-50 text-medical-700 hover:bg-medical-100 transition"
                      >
                        {copiedId === "flip" ? (
                          <><Check className="w-3.5 h-3.5" />已复制</>
                        ) : (
                          <><Copy className="w-3.5 h-3.5" />复制给同事</>
                        )}
                      </button>
                    </div>
                    {record.flipReason && (
                      <div className="mt-3 pt-3 border-t border-warning-100 text-xs text-warning-600">
                        <strong>操作原因：</strong>{record.flipReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="card p-5">
            <h2 className="text-base font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-medical-600" />
              基本信息
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex gap-2">
                <span className="text-neutral-500 w-24 flex-shrink-0">轨迹编号</span>
                <span className="text-neutral-800 font-mono text-xs">{record.id}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-neutral-500 w-24 flex-shrink-0">影像文件</span>
                <span className="text-neutral-800 truncate">{record.imageName || record.imageUrl || "未上传"}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-neutral-500 w-24 flex-shrink-0">创建时间</span>
                <span className="text-neutral-800">{formatDate(record.createdAt)}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-neutral-500 w-24 flex-shrink-0">更新时间</span>
                <span className="text-neutral-800">{formatDate(record.updatedAt)}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-neutral-500 w-24 flex-shrink-0">坐标变换</span>
                <span className={record.isFlipped ? "text-warning-600 font-medium" : "text-neutral-800"}>
                  {record.isFlipped ? flipInfo?.title : "无"}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-neutral-500 w-24 flex-shrink-0">网格配置</span>
                <span className="text-neutral-800">
                  {record.gridConfig.enabled
                    ? `已启用（${record.gridConfig.size}px）`
                    : "未启用"}
                </span>
              </div>
            </div>

            {Object.keys(stats.byType).length > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <div className="text-xs text-neutral-500 mb-2">标注类型分布</div>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(stats.byType).map(([type, count]) => (
                    <span key={type} className="tag-info">
                      {typeLabelMap[type as Annotation["type"]]} × {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(stats.byLabel).length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-neutral-500 mb-2">标签分布</div>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(stats.byLabel).map(([label, count]) => (
                    <span key={label} className="tag bg-neutral-100 text-neutral-700">
                      {label} × {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="text-base font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-medical-600" />
              病灶标注详情
              <span className="text-sm font-normal text-neutral-400 ml-auto">
                可追溯到底图原始坐标
              </span>
            </h2>

            {record.annotations.length === 0 ? (
              <div className="text-center py-12 text-neutral-400">
                暂无标注数据
              </div>
            ) : (
              <div className="space-y-3">
                {record.annotations.map((ann, idx) => {
                  const bounds = calculateBounds(ann);
                  return (
                    <div
                      key={ann.id}
                      className="bg-neutral-50 rounded-xl p-4 border border-neutral-100"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: ann.color }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-neutral-800">
                              标注 {idx + 1}
                              {ann.label && (
                                <span className="ml-2 text-medical-600">【{ann.label}】</span>
                              )}
                            </span>
                            <span className="tag-info">{typeLabelMap[ann.type]}</span>
                            {ann.isSnapped && <span className="tag-success">已吸附网格</span>}
                          </div>
                          <div className="text-xs text-neutral-400 mt-1">
                            创建于 {formatDate(ann.createdAt)} · {ann.coordinates.length} 个坐标点
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs pl-6">
                        <div className="flex justify-between py-1 border-b border-neutral-100">
                          <span className="text-neutral-500">底图 X 范围</span>
                          <span className="text-neutral-800 font-mono">
                            {bounds.minX.toFixed(1)} ~ {bounds.maxX.toFixed(1)} px
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-neutral-100">
                          <span className="text-neutral-500">底图 Y 范围</span>
                          <span className="text-neutral-800 font-mono">
                            {bounds.minY.toFixed(1)} ~ {bounds.maxY.toFixed(1)} px
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-neutral-100">
                          <span className="text-neutral-500">像素尺寸</span>
                          <span className="text-neutral-800 font-mono">
                            {bounds.w.toFixed(1)} × {bounds.h.toFixed(1)} px
                          </span>
                        </div>
                        {record.scale.value > 0 && (
                          <div className="flex justify-between py-1 border-b border-neutral-100">
                            <span className="text-neutral-500">实际尺寸</span>
                            <span className="text-neutral-800 font-mono">
                              {(bounds.w / record.scale.value).toFixed(2)} ×{" "}
                              {(bounds.h / record.scale.value).toFixed(2)} {record.scale.unit}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between py-1 border-b border-neutral-100 col-span-2">
                          <span className="text-neutral-500">中心点坐标</span>
                          <span className="text-neutral-800 font-mono">
                            ({bounds.cx.toFixed(1)}, {bounds.cy.toFixed(1)}) px
                            {record.scale.value > 0 && (
                              <span className="text-neutral-500 ml-2">
                                ≈ ({(bounds.cx / record.scale.value).toFixed(2)},{" "}
                                {(bounds.cy / record.scale.value).toFixed(2)}) {record.scale.unit}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      <details className="mt-3 pl-6">
                        <summary className="text-xs text-medical-600 cursor-pointer hover:text-medical-700 select-none">
                          查看底图原始坐标点（{ann.originalCoords.length} 个）
                        </summary>
                        <div className="mt-2 p-3 bg-white rounded-lg border border-neutral-100 font-mono text-[11px] text-neutral-600 max-h-40 overflow-y-auto space-y-0.5">
                          {ann.originalCoords.map((p, i) => (
                            <div key={i} className="flex justify-between">
                              <span>点 {i + 1}</span>
                              <span>
                                ({p.x.toFixed(2)}, {p.y.toFixed(2)}) px
                                {record.scale.value > 0 && (
                                  <span className="text-neutral-400 ml-2">
                                    ≈ ({(p.x / record.scale.value).toFixed(3)},{" "}
                                    {(p.y / record.scale.value).toFixed(3)}) {record.scale.unit}
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="text-base font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-medical-600" />
              操作历史（可追溯）
            </h2>
            {record.operations.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-sm">
                暂无操作记录
              </div>
            ) : (
              <div className="space-y-0">
                {record.operations.map((op, idx) => (
                  <div
                    key={op.id}
                    className="flex gap-3 py-2.5 border-b border-neutral-50 last:border-0"
                  >
                    <div className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-mono">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-neutral-800">{op.description}</div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {formatDate(op.timestamp)}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`tag ${
                        op.type === "add" ? "bg-success-50 text-success-600" :
                        op.type === "delete" ? "bg-red-50 text-red-600" :
                        op.type === "flip" ? "bg-warning-50 text-warning-600" :
                        "bg-neutral-100 text-neutral-600"
                      }`}>
                        {
                          { add: "新增", update: "修改", delete: "删除", flip: "翻转", scale: "比例尺", import: "导入" }[op.type]
                        }
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-center text-xs text-neutral-400 py-6">
            报告由 医学影像病灶描绘系统 自动生成 · 所有坐标均可追溯到底图原始数据
          </div>
        </div>
      </div>
    </div>
  );
}
