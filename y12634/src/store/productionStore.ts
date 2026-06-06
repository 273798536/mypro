import { create } from 'zustand';
import { BeatNode, ProductionData } from '@/types';
import { mockProductionData } from '@/utils/mockData';
import { rerunAllHitDetection } from '@/utils/hitDetection';
import { generateMandarinExplanation } from '@/utils/reportGenerator';

interface ProductionStore {
  productionData: ProductionData;
  selectedNodeId: string | null;
  recentHitNodeIds: string[];
  selectNode: (nodeId: string | null) => void;
  uploadScreenshot: (nodeId: string, file?: File) => void;
  updateNodeCaliber: (nodeId: string, patch: Partial<BeatNode>) => void;
  rerunHitDetection: () => void;
  flashHitNodes: (nodeIds: string[]) => void;
  clearFlash: () => void;
}

function applyHitDetection(data: ProductionData): ProductionData {
  const updatedLanes = data.lanes.map((lane) => ({
    ...lane,
    nodes: rerunAllHitDetection(lane.nodes),
  }));
  return {
    ...data,
    lanes: updatedLanes,
    mandarinExplanation: generateMandarinExplanation({ ...data, lanes: updatedLanes }),
  };
}

const initialData = applyHitDetection(mockProductionData);

export const useProductionStore = create<ProductionStore>((set, get) => ({
  productionData: initialData,
  selectedNodeId: null,
  recentHitNodeIds: [],

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  uploadScreenshot: (nodeId) => {
    const { productionData, rerunHitDetection, flashHitNodes } = get();
    const updatedLanes = productionData.lanes.map((lane) => ({
      ...lane,
      nodes: lane.nodes.map((n) =>
        n.id === nodeId ? { ...n, hasScreenshot: true, screenshotUrl: `screenshot://${nodeId}` } : n
      ),
    }));
    const newData = applyHitDetection({ ...productionData, lanes: updatedLanes });
    set({ productionData: newData });
    rerunHitDetection();
    const affected = newData.lanes.flatMap((l) => l.nodes).filter((n) => n.id === nodeId).map((n) => n.id);
    flashHitNodes(affected);
  },

  updateNodeCaliber: (nodeId, patch) => {
    const { productionData, rerunHitDetection, flashHitNodes } = get();
    const updatedLanes = productionData.lanes.map((lane) => ({
      ...lane,
      nodes: lane.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
    }));
    const newData = applyHitDetection({ ...productionData, lanes: updatedLanes });
    set({ productionData: newData });
    rerunHitDetection();
    flashHitNodes([nodeId]);
  },

  rerunHitDetection: () => {
    const { productionData } = get();
    set({ productionData: applyHitDetection(productionData) });
  },

  flashHitNodes: (nodeIds) => {
    set({ recentHitNodeIds: nodeIds });
    setTimeout(() => get().clearFlash(), 800);
  },

  clearFlash: () => set({ recentHitNodeIds: [] }),
}));

export function getAllNodes(data: ProductionData): BeatNode[] {
  return data.lanes.flatMap((lane) => lane.nodes);
}

export function getNeedMaterialNodes(data: ProductionData): BeatNode[] {
  return getAllNodes(data).filter((n) => n.anomalyType === 'need_material');
}

export function getNeedCaliberNodes(data: ProductionData): BeatNode[] {
  return getAllNodes(data).filter((n) => n.anomalyType === 'need_caliber');
}
