import { create } from "zustand";
import type {
  BuildingBlock,
  SectionConclusion,
  SectionPlane,
  SunlightDataset,
  TraceChain,
  NormalAxis,
  SectionStatus,
} from "@/types";
import {
  MOCK_BUILDING_BLOCKS,
  MOCK_CONCLUSIONS,
  MOCK_DATASETS,
  MOCK_SECTION_PLANES,
  MOCK_TRACE_CHAINS,
} from "@/data/mockData";
import { uid } from "@/utils/format";

interface DataStore {
  datasets: SunlightDataset[];
  blocks: BuildingBlock[];
  planes: SectionPlane[];
  conclusions: SectionConclusion[];
  traceChains: TraceChain[];
  activeDatasetId: string | null;
  setActiveDataset: (id: string | null) => void;

  addDataset: (dataset: Omit<SunlightDataset, "id" | "importedAt">) => SunlightDataset;
  addPlane: (
    plane: Omit<SectionPlane, "id">,
  ) => SectionPlane;
  updatePlaneStatus: (
    planeId: string,
    status: SectionStatus,
    extra?: { overrunNote?: string; resolutionNote?: string },
  ) => void;
  updatePlanePosition: (planeId: string, position: number) => void;
  addOrUpdateConclusion: (
    conclusion: Omit<SectionConclusion, "id" | "generatedAt"> & { id?: string },
  ) => SectionConclusion;
  linkConclusionToPlane: (planeId: string, conclusionId: string) => void;
  addTraceChain: (chain: Omit<TraceChain, "id">) => void;
  getPlaneConclusion: (planeId: string) => SectionConclusion | undefined;
  getPlaneTraceChain: (planeId: string) => TraceChain | undefined;
  addBlocks: (blocks: Omit<BuildingBlock, "id">[]) => void;
}

export const useDataStore = create<DataStore>((set, get) => ({
  datasets: MOCK_DATASETS,
  blocks: MOCK_BUILDING_BLOCKS,
  planes: MOCK_SECTION_PLANES,
  conclusions: MOCK_CONCLUSIONS,
  traceChains: MOCK_TRACE_CHAINS,
  activeDatasetId: MOCK_DATASETS[0]?.id ?? null,

  setActiveDataset: (id) => set({ activeDatasetId: id }),

  addDataset: (dataset) => {
    const newDs: SunlightDataset = {
      ...dataset,
      id: uid("ds-"),
      importedAt: Date.now(),
    };
    set((s) => ({ datasets: [newDs, ...s.datasets], activeDatasetId: newDs.id }));
    return newDs;
  },

  addPlane: (plane) => {
    const newPlane: SectionPlane = { ...plane, id: uid("p-") } as SectionPlane;
    set((s) => ({ planes: [...s.planes, newPlane] }));
    return newPlane;
  },

  updatePlaneStatus: (planeId, status, extra) => {
    set((s) => ({
      planes: s.planes.map((p) =>
        p.id === planeId
          ? { ...p, status, overrunNote: extra?.overrunNote ?? p.overrunNote, resolutionNote: extra?.resolutionNote ?? p.resolutionNote }
          : p,
      ),
    }));
  },

  updatePlanePosition: (planeId, position) => {
    set((s) => ({
      planes: s.planes.map((p) =>
        p.id === planeId ? { ...p, position } : p,
      ),
    }));
  },

  addOrUpdateConclusion: (conclusion) => {
    if (conclusion.id) {
      let updated: SectionConclusion | undefined;
      set((s) => ({
        conclusions: s.conclusions.map((c) => {
          if (c.id === conclusion.id) {
            updated = { ...c, ...conclusion, generatedAt: Date.now() } as SectionConclusion;
            return updated;
          }
          return c;
        }),
      }));
      return updated!;
    }
    const newC: SectionConclusion = {
      ...conclusion,
      id: uid("c-"),
      generatedAt: Date.now(),
    } as SectionConclusion;
    set((s) => ({ conclusions: [...s.conclusions, newC] }));
    return newC;
  },

  linkConclusionToPlane: (planeId, conclusionId) => {
    set((s) => ({
      conclusions: s.conclusions.map((c) =>
        c.id === conclusionId ? { ...c, planeId, isLinkedTo3D: true } : c,
      ),
    }));
  },

  addTraceChain: (chain) => {
    set((s) => ({
      traceChains: [
        ...s.traceChains.filter((t) => t.planeId !== chain.planeId),
        { ...chain, id: uid("tc-") },
      ],
    }));
  },

  getPlaneConclusion: (planeId) => get().conclusions.find((c) => c.planeId === planeId),
  getPlaneTraceChain: (planeId) => get().traceChains.find((t) => t.planeId === planeId),

  addBlocks: (blocks) => {
    const newBlocks = blocks.map((b) => ({ ...b, id: uid("b-") })) as BuildingBlock[];
    set((s) => ({ blocks: [...s.blocks, ...newBlocks] }));
  },
}));

export function planeWorldPosition(
  plane: SectionPlane,
): [number, number, number] {
  switch (plane.normalAxis as NormalAxis) {
    case "X":
      return [plane.position, 7.5, 0];
    case "Y":
      return [0, plane.position, 0];
    case "Z":
      return [0, 7.5, plane.position];
  }
}
