import { useState } from "react";
import {
  FileText,
  User,
  Clock,
  Link2Off,
  Link2,
  Edit3,
  Save,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  ArrowUpRightFromSquare,
} from "lucide-react";
import { useDataStore } from "@/store/dataStore";
import { useGameStore } from "@/store/gameStore";
import { formatTimestamp } from "@/utils/format";
import type { SectionStatus } from "@/types";

export default function ConclusionPanel() {
  const selectedPlaneId = useGameStore((s) => s.selectedPlaneId);
  const pushLog = useGameStore((s) => s.pushLog);
  const incrementStat = useGameStore((s) => s.incrementStat);
  const setCameraFocus = useGameStore((s) => s.setCameraFocus);

  const planes = useDataStore((s) => s.planes);
  const getConclusion = useDataStore((s) => s.getPlaneConclusion);
  const getTraceChain = useDataStore((s) => s.getPlaneTraceChain);
  const updatePlaneStatus = useDataStore((s) => s.updatePlaneStatus);
  const addOrUpdateConclusion = useDataStore((s) => s.addOrUpdateConclusion);
  const addTraceChain = useDataStore((s) => s.addTraceChain);
  const linkConclusionToPlane = useDataStore((s) => s.linkConclusionToPlane);
  const datasets = useDataStore((s) => s.datasets);

  const plane = planes.find((p) => p.id === selectedPlaneId) ?? null;
  const conclusion = plane ? getConclusion(plane.id) : undefined;
  const traceChain = plane ? getTraceChain(plane.id) : undefined;

  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(conclusion?.content ?? "");
  const [overrunNote, setOverrunNote] = useState(plane?.overrunNote ?? "");
  const [resolutionNote, setResolutionNote] = useState(plane?.resolutionNote ?? "");

  if (!plane) {
    return (
      <div className="glass-card p-5 flex flex-col items-center justify-center h-full text-center">
        <FileText size={32} className="text-zinc-600 mb-3" />
        <div className="text-sm text-zinc-400">在左侧列表或三维视图中选择一个剖切面</div>
        <div className="text-xs text-zinc-500 mt-2">
          点击可查看日照结论、标记越界、填写处理记录
        </div>
      </div>
    );
  }

  const dataset = datasets.find((d) => d.id === plane.datasetId);

  const handleMarkStatus = (status: SectionStatus) => {
    updatePlaneStatus(plane.id, status, {
      overrunNote: status === "overrun" ? overrunNote || plane.overrunNote || "待填写" : undefined,
      resolutionNote: status === "resolved" ? resolutionNote || plane.resolutionNote || "待填写" : undefined,
    });
    if (status === "overrun") incrementStat("overrunCount");
    incrementStat("totalRecords");
    pushLog({
      type: status === "overrun" ? "mark_overrun" : "resolve_overrun",
      targetId: plane.id,
      detail: { status, note: status === "overrun" ? overrunNote : resolutionNote },
      cameraSnapshot: {
        position: [28, 22, 32],
        target: [0, plane.position, 0],
      },
    });
    if (traceChain === undefined && status !== "normal") {
      addTraceChain({
        planeId: plane.id,
        sourceDataset: plane.datasetId,
        importTime: dataset?.importedAt ?? Date.now(),
        operatorName: "当前操作人",
        correctionAction:
          status === "overrun"
            ? overrunNote || "标记越界待处理"
            : resolutionNote || "已修正越界",
        conclusionId: conclusion?.id ?? "",
      });
    }
  };

  const handleSaveConclusion = () => {
    const c = addOrUpdateConclusion({
      id: conclusion?.id,
      planeId: plane.id,
      content: content.trim() || "（未填写结论）",
      operator: "当前操作人",
      isLinkedTo3D: true,
    });
    linkConclusionToPlane(plane.id, c.id);
    incrementStat("totalRecords");
    pushLog({
      type: "link_conclusion",
      targetId: c.id,
      detail: { planeId: plane.id, content: c.content.slice(0, 60) },
      cameraSnapshot: {
        position: [28, 22, 32],
        target: [0, plane.position, 0],
      },
    });
    setEditing(false);
  };

  const handleJumpTo3D = () => {
    const target =
      plane.normalAxis === "X"
        ? ([plane.position, 7.5, 0] as [number, number, number])
        : plane.normalAxis === "Y"
          ? ([0, plane.position, 0] as [number, number, number])
          : ([0, 7.5, plane.position] as [number, number, number]);
    setCameraFocus({
      position: [target[0] + 28, target[1] + 20, target[2] + 32],
      target,
    });
  };

  return (
    <div className="glass-card p-4 md:p-5 flex flex-col h-full min-h-0">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <FileText size={14} className="text-lime-400" />
            剖面 {plane.index}-{plane.index} 结论联动
          </div>
          <div className="text-[11px] font-mono-app text-zinc-500 mt-0.5">
            {plane.normalAxis} = {plane.position.toFixed(1)}m ·{" "}
            {dataset?.buildingName}
          </div>
        </div>
        <button
          onClick={handleJumpTo3D}
          className="btn-pill text-[11px] bg-cool-400/15 border-cool-400/30 text-cool-400 hover:bg-cool-400/25"
        >
          <ArrowUpRightFromSquare size={12} /> 回跳三维视图
        </button>
      </div>

      <div className="divider-soft mb-3" />

      <div className="space-y-3 mb-3">
        <div>
          <div className="text-[11px] text-zinc-400 mb-1.5 flex items-center gap-1.5">
            <AlertTriangle size={11} className="text-alert-400" /> 越界说明
          </div>
          <textarea
            value={overrunNote}
            onChange={(e) => setOverrunNote(e.target.value)}
            rows={2}
            placeholder="例如：超出日照间距控制线0.8m…"
            className="w-full text-xs rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-alert-400/50"
          />
        </div>
        <div>
          <div className="text-[11px] text-zinc-400 mb-1.5 flex items-center gap-1.5">
            <CheckCircle size={11} className="text-lime-400" /> 修正说明
          </div>
          <textarea
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            rows={2}
            placeholder="例如：将剖切位置回调至3m与红线对齐…"
            className="w-full text-xs rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-lime-400/50"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleMarkStatus("normal")}
            className="btn-pill text-[11px] bg-cool-400/15 border-cool-400/30 text-cool-400 hover:bg-cool-400/25"
          >
            标记正常
          </button>
          <button
            onClick={() => handleMarkStatus("overrun")}
            className="btn-pill text-[11px] bg-alert-400/15 border-alert-400/40 text-alert-400 hover:bg-alert-400/25"
          >
            <AlertTriangle size={12} /> 标记越界
          </button>
          <button
            onClick={() => handleMarkStatus("resolved")}
            className="btn-pill text-[11px] bg-lime-400/15 border-lime-400/40 text-lime-400 hover:bg-lime-400/25"
          >
            <RotateCcw size={12} /> 标记已修正
          </button>
        </div>
      </div>

      <div className="divider-soft mb-3" />

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <FileText size={11} className="text-cool-400" /> 日照分析结论
          </div>
          {editing ? (
            <button
              onClick={handleSaveConclusion}
              className="btn-pill text-[11px] bg-lime-400/15 border-lime-400/40 text-lime-400 hover:bg-lime-400/25"
            >
              <Save size={12} /> 保存
            </button>
          ) : (
            <button
              onClick={() => {
                setContent(conclusion?.content ?? "");
                setEditing(true);
              }}
              className="btn-pill text-[11px] bg-white/5 border-white/15 text-zinc-300 hover:bg-white/10"
            >
              <Edit3 size={12} /> 编辑
            </button>
          )}
        </div>

        {editing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="请输入该剖面的日照分析正式结论…"
            className="flex-1 w-full text-xs rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-lime-400/50 resize-none"
          />
        ) : (
          <div className="flex-1 overflow-y-auto rounded-xl bg-black/30 border border-white/10 px-3 py-3 min-h-[100px]">
            {conclusion?.content ? (
              <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {conclusion.content}
              </p>
            ) : (
              <p className="text-xs text-zinc-500">尚未生成结论，点击右上角「编辑」填写。</p>
            )}
          </div>
        )}

        {conclusion && (
          <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] font-mono-app text-zinc-500">
            <span className="flex items-center gap-1">
              <User size={10} /> {conclusion.operator}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={10} /> {formatTimestamp(conclusion.generatedAt)}
            </span>
            <span className="flex items-center gap-1">
              {conclusion.isLinkedTo3D ? (
                <>
                  <Link2 size={10} className="text-lime-400" />
                  <span className="text-lime-400">已关联三维</span>
                </>
              ) : (
                <>
                  <Link2Off size={10} /> 未关联三维
                </>
              )}
            </span>
          </div>
        )}

        {traceChain && (
          <div className="mt-3 rounded-xl bg-purple-400/5 border border-purple-400/20 p-2.5">
            <div className="text-[10px] font-mono-app text-purple-300 mb-1.5">追溯链路</div>
            <div className="text-[10px] text-zinc-400 space-y-0.5">
              <div>来源数据：{dataset?.fileName}</div>
              <div>导入时间：{formatTimestamp(traceChain.importTime)}</div>
              <div>操作人：{traceChain.operatorName}</div>
              <div>修正动作：{traceChain.correctionAction}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
