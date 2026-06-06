import { create } from "zustand";
import type {
  Move,
  Layer,
  HistoryState,
  Project,
  Issue,
  MoveStatus,
  Player,
} from "../types";
import { sampleProjects } from "../data/samples";

interface ReplayStore {
  projects: Project[];
  currentProjectId: string | null;
  history: HistoryState[];
  historyIndex: number;
  selectedMoveId: string | null;
  errorMessage: string | null;

  loadProjects: () => void;
  setCurrentProject: (id: string | null) => void;
  getCurrentProject: () => Project | null;

  addMove: (x: number, y: number, player: Player, layerId: string) => void;
  updateMoveStatus: (moveId: string, status: MoveStatus) => void;
  updateMoveNote: (moveId: string, note: string) => void;
  removeMove: (moveId: string) => void;
  selectMove: (moveId: string | null) => void;

  addLayer: (name: string, color: string) => void;
  toggleLayer: (layerId: string) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  resetBoard: () => void;

  clearError: () => void;
  validateProject: (projectId: string) => Issue[];
  updateProjectStatus: (projectId: string, status: Project["status"]) => void;
}

interface StoreHelpers {
  get: () => ReplayStore;
  set: (partial: Partial<ReplayStore> | ((s: ReplayStore) => Partial<ReplayStore>)) => void;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function snapshotHistory(
  moves: Move[],
  layers: Layer[]
): HistoryState {
  return {
    moves: JSON.parse(JSON.stringify(moves)),
    layers: JSON.parse(JSON.stringify(layers)),
  };
}

function pushHistory(api: StoreHelpers) {
  const { get, set } = api;
  const project = get().getCurrentProject();
  if (!project) return;
  const current = snapshotHistory(project.moves, project.layers);
  const newHistory = get().history.slice(0, get().historyIndex + 1);
  newHistory.push(current);
  set({
    history: newHistory,
    historyIndex: newHistory.length - 1,
  });
  const { projects, currentProjectId } = get();
  set({
    projects: projects.map((p) =>
      p.id === currentProjectId ? { ...p, updatedAt: Date.now() } : p
    ),
  });
}

function applyFromHistory(api: StoreHelpers) {
  const { get, set } = api;
  const { history, historyIndex, projects, currentProjectId } = get();
  if (historyIndex < 0 || historyIndex >= history.length) return;
  const state = history[historyIndex];
  set({
    projects: projects.map((p) =>
      p.id === currentProjectId
        ? {
            ...p,
            moves: state.moves,
            layers: state.layers,
            updatedAt: Date.now(),
          }
        : p
    ),
  });
}

export const useReplayStore = create<ReplayStore>((set, get) => ({
  projects: [],
  currentProjectId: null,
  history: [],
  historyIndex: -1,
  selectedMoveId: null,
  errorMessage: null,

  loadProjects: () => {
    set({ projects: sampleProjects });
  },

  setCurrentProject: (id) => {
    const project = get().projects.find((p) => p.id === id);
    if (!project && id !== null) {
      set({
        errorMessage: `未找到项目「${id}」，请确认项目是否存在或从首页重新选择。`,
        currentProjectId: null,
      });
      return;
    }
    if (project) {
      const initial = snapshotHistory(project.moves, project.layers);
      set({
        currentProjectId: id,
        history: [initial],
        historyIndex: 0,
        selectedMoveId: null,
        errorMessage: null,
      });
    } else {
      set({
        currentProjectId: null,
        history: [],
        historyIndex: -1,
        selectedMoveId: null,
        errorMessage: null,
      });
    }
  },

  getCurrentProject: () => {
    const { projects, currentProjectId } = get();
    return projects.find((p) => p.id === currentProjectId) || null;
  },

  addMove: (x, y, player, layerId) => {
    const project = get().getCurrentProject();
    if (!project) {
      set({ errorMessage: "当前未打开任何复盘项目，请先从首页选择项目。" });
      return;
    }
    if (x < 0 || y < 0 || x >= project.boardSize || y >= project.boardSize) {
      set({
        errorMessage: `落子坐标 (${x}, ${y}) 越界：${project.boardSize}×${project.boardSize} 棋盘的有效范围为 x∈[0, ${project.boardSize - 1}]，y∈[0, ${project.boardSize - 1}]。`,
      });
      return;
    }
    const occupied = project.moves.find(
      (m) => m.x === x && m.y === y && m.status !== "undone"
    );
    if (occupied) {
      set({
        errorMessage: `坐标 (${x}, ${y}) 已被第 ${occupied.order} 手占用，请选择空位。`,
      });
      return;
    }
    const nextOrder = Math.max(0, ...project.moves.map((m) => m.order)) + 1;
    const newMove: Move = {
      id: generateId("mv"),
      x,
      y,
      player,
      timestamp: Date.now(),
      layerId,
      status: "normal",
      order: nextOrder,
    };
    const { projects, currentProjectId } = get();
    set({
      projects: projects.map((p) =>
        p.id === currentProjectId ? { ...p, moves: [...p.moves, newMove] } : p
      ),
    });
    pushHistory({ get, set });
    set({ errorMessage: null });
  },

  updateMoveStatus: (moveId, status) => {
    const { projects, currentProjectId } = get();
    set({
      projects: projects.map((p) =>
        p.id === currentProjectId
          ? {
              ...p,
              moves: p.moves.map((m) => (m.id === moveId ? { ...m, status } : m)),
            }
          : p
      ),
    });
    pushHistory({ get, set });
  },

  updateMoveNote: (moveId, note) => {
    const { projects, currentProjectId } = get();
    set({
      projects: projects.map((p) =>
        p.id === currentProjectId
          ? {
              ...p,
              moves: p.moves.map((m) => (m.id === moveId ? { ...m, note } : m)),
            }
          : p
      ),
    });
    pushHistory({ get, set });
  },

  removeMove: (moveId) => {
    const { projects, currentProjectId, selectedMoveId } = get();
    set({
      projects: projects.map((p) =>
        p.id === currentProjectId
          ? {
              ...p,
              moves: p.moves
                .filter((m) => m.id !== moveId)
                .sort((a, b) => a.order - b.order)
                .map((m, i) => ({ ...m, order: i + 1 })),
            }
          : p
      ),
      selectedMoveId: selectedMoveId === moveId ? null : selectedMoveId,
    });
    pushHistory({ get, set });
  },

  selectMove: (moveId) => set({ selectedMoveId: moveId }),

  addLayer: (name, color) => {
    const { projects, currentProjectId } = get();
    const newLayer: Layer = {
      id: generateId("ly"),
      name,
      color,
      visible: true,
    };
    set({
      projects: projects.map((p) =>
        p.id === currentProjectId ? { ...p, layers: [...p.layers, newLayer] } : p
      ),
    });
    pushHistory({ get, set });
  },

  toggleLayer: (layerId) => {
    const { projects, currentProjectId } = get();
    set({
      projects: projects.map((p) =>
        p.id === currentProjectId
          ? {
              ...p,
              layers: p.layers.map((l) =>
                l.id === layerId ? { ...l, visible: !l.visible } : l
              ),
            }
          : p
      ),
    });
    pushHistory({ get, set });
  },

  removeLayer: (layerId) => {
    const { projects, currentProjectId } = get();
    const project = projects.find((p) => p.id === currentProjectId);
    if (!project) return;
    if (project.layers.length <= 1) {
      set({ errorMessage: "至少保留一个图层，无法删除最后一个图层。" });
      return;
    }
    set({
      projects: projects.map((p) =>
        p.id === currentProjectId
          ? { ...p, layers: p.layers.filter((l) => l.id !== layerId) }
          : p
      ),
    });
    pushHistory({ get, set });
    set({ errorMessage: null });
  },

  updateLayer: (layerId, updates) => {
    const { projects, currentProjectId } = get();
    set({
      projects: projects.map((p) =>
        p.id === currentProjectId
          ? {
              ...p,
              layers: p.layers.map((l) =>
                l.id === layerId ? { ...l, ...updates } : l
              ),
            }
          : p
      ),
    });
    pushHistory({ get, set });
  },

  undo: () => {
    if (!get().canUndo()) {
      set({ errorMessage: "已无更早的历史记录可供撤销。" });
      return;
    }
    set((s) => ({ historyIndex: s.historyIndex - 1 }));
    applyFromHistory({ get, set });
    set({ errorMessage: null });
  },

  redo: () => {
    if (!get().canRedo()) {
      set({ errorMessage: "已无更新的历史记录可供重做。" });
      return;
    }
    set((s) => ({ historyIndex: s.historyIndex + 1 }));
    applyFromHistory({ get, set });
    set({ errorMessage: null });
  },

  canUndo: () => get().historyIndex > 0,

  canRedo: () => get().historyIndex < get().history.length - 1,

  resetBoard: () => {
    const project = get().getCurrentProject();
    if (!project) return;
    const { projects, currentProjectId } = get();
    const resetMoves: Move[] = [];
    set({
      projects: projects.map((p) =>
        p.id === currentProjectId ? { ...p, moves: resetMoves } : p
      ),
      selectedMoveId: null,
    });
    pushHistory({ get, set });
    set({ errorMessage: null });
  },

  clearError: () => set({ errorMessage: null }),

  validateProject: (projectId) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) {
      return [
        {
          id: generateId("iss"),
          type: "missing_trace" as const,
          severity: "error" as const,
          message: "项目不存在或轨迹记录缺失",
          actionable:
            "请从首页重新选择项目，或确认轨迹文件是否完整（缺少项目 ID 对应的数据）。",
        },
      ];
    }
    const issues: Issue[] = [];

    project.moves.forEach((m) => {
      if (
        m.x < 0 ||
        m.y < 0 ||
        m.x >= project.boardSize ||
        m.y >= project.boardSize
      ) {
        issues.push({
          id: generateId("iss"),
          type: "boundary_error",
          severity: "error",
          message: `第 ${m.order} 手坐标越界`,
          actionable: `第 ${m.order} 手坐标 (${m.x}, ${m.y}) 超出 ${project.boardSize}×${project.boardSize} 棋盘边界，请修正坐标范围至 x∈[0, ${project.boardSize - 1}]，y∈[0, ${project.boardSize - 1}]。`,
          relatedMoveId: m.id,
        });
      }
      if (m.status === "pending") {
        issues.push({
          id: generateId("iss"),
          type: "inconsistent_status",
          severity: "warning",
          message: `第 ${m.order} 手状态待确认`,
          actionable: `请标记第 ${m.order} 手状态：训练员可直接点击轨迹记录卡片将其改为「已确认」，如存疑请联系地图编辑复核。`,
          relatedMoveId: m.id,
        });
      }
    });

    const confirmedCount = project.moves.filter(
      (m) => m.status === "confirmed" || m.status === "normal"
    ).length;
    const totalCount = project.moves.filter((m) => m.status !== "undone").length;
    if (totalCount > 0 && confirmedCount < totalCount) {
      issues.push({
        id: generateId("iss"),
        type: "other",
        severity: "info",
        message: `共 ${totalCount - confirmedCount} 手需要复核`,
        actionable:
          "可前往结算页查看完整问题清单，导出时会一并标注需要地图编辑复核的内容。",
      });
    }

    return issues;
  },

  updateProjectStatus: (projectId, status) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, status, updatedAt: Date.now() } : p
      ),
    }));
  },
}));
