import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useReplayStore } from "../store/useReplayStore";
import { Board } from "../components/Board";
import { LayerPanel } from "../components/LayerPanel";
import { MoveList } from "../components/MoveList";
import { ActionBar } from "../components/ActionBar";
import { ErrorToast } from "../components/Feedback";
import { exportProjectToJSON, formatFriendlyError } from "../utils/export";
import type { Player, ExportResult } from "../types";
import { ArrowLeft, Save, FileJson } from "lucide-react";

type ToastState = {
  type: "error" | "warning" | "success" | "info";
  message: string;
  actionable?: string;
} | null;

export function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    projects,
    currentProjectId,
    errorMessage,
    selectedMoveId,
    canUndo,
    canRedo,
    loadProjects,
    setCurrentProject,
    getCurrentProject,
    addMove,
    updateMoveStatus,
    updateMoveNote,
    removeMove,
    selectMove,
    addLayer,
    toggleLayer,
    removeLayer,
    updateLayer,
    undo,
    redo,
    resetBoard,
    clearError,
  } = useReplayStore();

  const [currentPlayer, setCurrentPlayer] = useState<Player>("black");
  const [activeLayerId, setActiveLayerId] = useState<string>("");
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (projects.length === 0) {
      loadProjects();
    }
  }, [projects.length, loadProjects]);

  useEffect(() => {
    if (id && currentProjectId !== id) {
      setCurrentProject(id);
    }
  }, [id, currentProjectId, setCurrentProject]);

  const project = getCurrentProject();

  useEffect(() => {
    if (project && project.layers.length > 0 && !activeLayerId) {
      setActiveLayerId(project.layers[0].id);
    }
  }, [project, activeLayerId]);

  useEffect(() => {
    if (errorMessage) {
      const formatted = formatFriendlyError(new Error(errorMessage), "编辑操作");
      setToast({
        type: "error",
        message: formatted.message,
        actionable: formatted.actionable,
      });
    }
  }, [errorMessage]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z") ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y")
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      if (!project) return;
      addMove(x, y, currentPlayer, activeLayerId || project.layers[0]?.id);
      setCurrentPlayer((p) => (p === "black" ? "white" : "black"));
    },
    [project, currentPlayer, activeLayerId, addMove]
  );

  const handleExport = useCallback(() => {
    if (!project) return;
    let result: ExportResult;
    try {
      result = exportProjectToJSON(project);
    } catch (err) {
      const f = formatFriendlyError(err, "导出复盘数据");
      setToast({ type: "error", message: f.message, actionable: f.actionable });
      return;
    }

    if (result.status === "success") {
      setToast({ type: "success", message: result.message });
    } else if (result.status === "warning") {
      setToast({
        type: "warning",
        message: result.message,
        actionable:
          result.issues && result.issues.length > 0
            ? result.issues.map((i) => i.actionable).join(" ")
            : undefined,
      });
    } else {
      setToast({ type: "error", message: result.message });
    }
  }, [project]);

  const handleGoToResult = useCallback(() => {
    if (!project) return;
    navigate(`/result/${project.id}`);
  }, [project, navigate]);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center max-w-md">
          <div className="text-4xl mb-3">🫥</div>
          <h2 className="text-lg font-semibold text-slate-800 mb-1">
            未找到复盘项目
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            项目 ID「{id}」不存在，或示例数据尚未加载。
          </p>
          <button onClick={() => navigate("/")} className="btn-primary">
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const activeLayer =
    project.layers.find((l) => l.id === activeLayerId) ?? project.layers[0];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-5 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="btn-ghost !px-2.5 !py-1.5"
            title="返回首页"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-slate-900 truncate">
              {project.name}
            </h1>
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <span>{project.boardSize}×{project.boardSize} 棋盘</span>
              <span>·</span>
              <span>{project.moves.filter(m => m.status !== "undone").length} 手有效落子</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: activeLayer?.color ?? "#666" }}
                />
                当前图层：{activeLayer?.name ?? "-"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="btn-secondary !px-3 !py-1.5 text-xs"
            >
              <FileJson className="w-3.5 h-3.5" />
              导出
            </button>
            <button onClick={handleGoToResult} className="btn-primary !px-3 !py-1.5 text-xs">
              <Save className="w-3.5 h-3.5" />
              查看结算
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-5 py-4">
        <div className="mb-4">
          <ActionBar
            canUndo={canUndo()}
            canRedo={canRedo()}
            currentPlayer={currentPlayer}
            onPlayerChange={setCurrentPlayer}
            onUndo={undo}
            onRedo={redo}
            onReset={resetBoard}
            onExport={handleExport}
            onGoToResult={handleGoToResult}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 min-h-0">
          <div className="flex flex-col items-center justify-start gap-4 min-h-0">
            <div className="card p-5 w-full flex items-center justify-center">
              <Board
                size={project.boardSize}
                moves={project.moves}
                layers={project.layers}
                selectedMoveId={selectedMoveId}
                onCellClick={handleCellClick}
                onMoveClick={selectMove}
                currentPlayer={currentPlayer}
                cellSize={44}
              />
            </div>

            <div className="hidden lg:block w-full">
              <LayerPanel
                layers={project.layers}
                activeLayerId={activeLayerId}
                onToggleLayer={toggleLayer}
                onRemoveLayer={removeLayer}
                onAddLayer={addLayer}
                onUpdateLayer={updateLayer}
                onSelectLayer={setActiveLayerId}
              />
            </div>
          </div>

          <div className="space-y-4 flex flex-col min-h-[500px] lg:min-h-0">
            <div className="lg:hidden">
              <LayerPanel
                layers={project.layers}
                activeLayerId={activeLayerId}
                onToggleLayer={toggleLayer}
                onRemoveLayer={removeLayer}
                onAddLayer={addLayer}
                onUpdateLayer={updateLayer}
                onSelectLayer={setActiveLayerId}
              />
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <MoveList
                moves={project.moves}
                layers={project.layers}
                selectedMoveId={selectedMoveId}
                onSelectMove={selectMove}
                onUpdateStatus={updateMoveStatus}
                onUpdateNote={updateMoveNote}
                onRemoveMove={removeMove}
              />
            </div>
          </div>
        </div>
      </main>

      {toast && (
        <div className="fixed top-20 right-5 z-50">
          <ErrorToast
            type={toast.type}
            message={toast.message}
            actionable={toast.actionable}
            onClose={() => {
              setToast(null);
              clearError();
            }}
          />
        </div>
      )}
    </div>
  );
}
