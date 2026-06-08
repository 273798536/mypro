import { create } from "zustand";
import type { SandboxStore, Block, Corridor, ReviewLog, HistoryLog } from "@/types";
import { detectCollisions } from "@/utils/collisionDetector";
import { generateReport } from "@/utils/reportGenerator";
import { createSampleProject, createEmptyProject } from "@/utils/sampleData";

const STORAGE_KEY = "wind_corridor_sandbox_project";

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("加载项目数据失败", e);
  }
  return null;
}

function saveToStorage(project: unknown) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch (e) {
    console.warn("保存项目数据失败", e);
  }
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const useSandboxStore = create<SandboxStore>((set, get) => {
  const saved = loadFromStorage();
  const initialProject = saved || createSampleProject();

  return {
    currentProject: initialProject,
    selectedBlockId: null,
    selectedCollisionId: null,
    isDetecting: false,
    activePanel: "collision",

    selectBlock: (id) => set({ selectedBlockId: id }),
    selectCollision: (id) => set({ selectedCollisionId: id }),
    setActivePanel: (panel) => set({ activePanel: panel }),

    updateCorridorParam: (id, key, value) => {
      const { currentProject, addHistoryLog } = get();
      const corridors = currentProject.corridors.map((c: Corridor) => {
        if (c.id !== id) return c;
        if (key === "width" || key === "height" || key === "angle") {
          return { ...c, [key]: value };
        }
        return c;
      });

      const updatedProject = {
        ...currentProject,
        corridors,
        updatedAt: new Date().toISOString(),
      };

      saveToStorage(updatedProject);
      set({ currentProject: updatedProject });

      const corridor = corridors.find((c: Corridor) => c.id === id);
      if (corridor) {
        addHistoryLog({
          actionType: "param_change",
          operator: "当前用户",
          description: `调整${corridor.name}的${key}为${value}`,
          snapshot: {
            parameters: { [key]: value },
          },
        });
      }
    },

    updateBlockPosition: (id, position) => {
      const { currentProject, addHistoryLog } = get();
      const blocks = currentProject.blocks.map((b: Block) =>
        b.id === id ? { ...b, position: { ...b.position, ...position } } : b
      );

      const updatedProject = {
        ...currentProject,
        blocks,
        updatedAt: new Date().toISOString(),
      };

      saveToStorage(updatedProject);
      set({ currentProject: updatedProject });

      const block = blocks.find((b: Block) => b.id === id);
      if (block && Object.keys(position).length > 0) {
        addHistoryLog({
          actionType: "param_change",
          operator: "当前用户",
          description: `移动${block.name}的位置`,
          snapshot: {
            coordinates: {
              x: position.x ?? block.position.x,
              y: position.y ?? block.position.y,
              z: position.z ?? block.position.z,
            },
          },
        });
      }
    },

    updateBlockSize: (id, size) => {
      const { currentProject } = get();
      const blocks = currentProject.blocks.map((b: Block) =>
        b.id === id ? { ...b, size: { ...b.size, ...size } } : b
      );

      const updatedProject = {
        ...currentProject,
        blocks,
        updatedAt: new Date().toISOString(),
      };

      saveToStorage(updatedProject);
      set({ currentProject: updatedProject });
    },

    runCollisionDetection: () => {
      const { currentProject, addHistoryLog } = get();
      set({ isDetecting: true });

      setTimeout(() => {
        const collisions = detectCollisions(
          currentProject.blocks,
          currentProject.corridors
        );

        const existingReviewed = currentProject.collisions.filter((c) => c.status === "reviewed");
        const newPending = collisions.map((nc) => {
          const matched = existingReviewed.find(
            (er) =>
              er.blockA === nc.blockA &&
              er.blockB === nc.blockB &&
              er.collisionType === nc.collisionType
          );
          return matched ? { ...nc, status: "reviewed" as const, review: matched.review } : nc;
        });

        const updatedProject = {
          ...currentProject,
          collisions: newPending,
          updatedAt: new Date().toISOString(),
        };

        saveToStorage(updatedProject);
        set({ currentProject: updatedProject, isDetecting: false });

        addHistoryLog({
          actionType: "collision_detect",
          operator: "当前用户",
          description: `执行碰撞检测，发现${newPending.length}项问题（高${newPending.filter(c=>c.severity==='high').length}，中${newPending.filter(c=>c.severity==='medium').length}，低${newPending.filter(c=>c.severity==='low').length}）`,
          snapshot: {
            parameters: {
              collisionCount: newPending.length,
              highCount: newPending.filter((c) => c.severity === "high").length,
              mediumCount: newPending.filter((c) => c.severity === "medium").length,
              lowCount: newPending.filter((c) => c.severity === "low").length,
            },
          },
        });
      }, 600);
    },

    reviewCollision: (collisionId, review) => {
      const { currentProject, addHistoryLog } = get();
      const reviewLog: ReviewLog = {
        ...review,
        id: genId("review"),
        reviewedAt: new Date().toISOString(),
      };

      const collisions = currentProject.collisions.map((c) =>
        c.id === collisionId
          ? { ...c, status: "reviewed" as const, review: reviewLog }
          : c
      );

      const updatedProject = {
        ...currentProject,
        collisions,
        updatedAt: new Date().toISOString(),
      };

      saveToStorage(updatedProject);
      set({ currentProject: updatedProject });

      const col = collisions.find((c) => c.id === collisionId);
      if (col) {
        addHistoryLog({
          actionType: "review",
          operator: review.reviewer,
          description: `复核${review.approved ? "通过" : "驳回"}：${col.description}`,
          snapshot: {
            collisionId,
            coordinates: col.coordinates,
          },
        });
      }
    },

    addHistoryLog: (log) => {
      const { currentProject } = get();
      const historyLog: HistoryLog = {
        ...log,
        id: genId("hist"),
        timestamp: new Date().toISOString(),
      };

      const updatedProject = {
        ...currentProject,
        history: [historyLog, ...currentProject.history].slice(0, 100),
        updatedAt: new Date().toISOString(),
      };

      saveToStorage(updatedProject);
      set({ currentProject: updatedProject });
    },

    generateReport: () => {
      return generateReport(get().currentProject);
    },

    loadSampleData: () => {
      const sample = createSampleProject();
      saveToStorage(sample);
      set({ currentProject: sample });
    },

    resetProject: () => {
      const empty = createEmptyProject();
      saveToStorage(empty);
      set({ currentProject: empty, selectedBlockId: null, selectedCollisionId: null });
    },
  };
});
