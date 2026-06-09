import { create } from "zustand";
import { Batch, Material, Anomaly, DraftGap, BatchParams } from "@/types";
import { mockBatches } from "@/data/mockBatches";
import { approximateVolume } from "@/utils/approximateVolume";
import { validateConstraints } from "@/utils/constraintValidator";

const FIELD_LABELS: Record<string, string> = {
  length: "长",
  width: "宽",
  height: "高",
  quantity: "数量",
};

function processBatch(batch: Batch): Batch {
  const anomalies: Anomaly[] = [];
  const draftGaps: DraftGap[] = [];
  let totalVolume = 0;

  const processedMaterials: Material[] = batch.materials.map((m, idx) => {
    const matParams = { ...batch.params };
    if (m.boundaryType === "zero_division") {
      matParams.fillRate = 0;
    }

    const result = approximateVolume(m, matParams);
    totalVolume += result.approxVolume;

    const material: Material = {
      ...m,
      approxVolume: result.approxVolume,
      errorRate: result.errorRate ?? undefined,
    };

    if (result.hasGap && result.gapField) {
      draftGaps.push({
        id: `gap-${m.id}`,
        materialId: m.id,
        missingField: result.gapField,
        impactDescription: `补全 ${FIELD_LABELS[result.gapField]} 后可得出准确近似体积，预计影响总容积约 ${Math.round((idx + 1) * 80000 / batch.materials.length).toLocaleString()} cm³`,
      });
      anomalies.push({
        id: `anom-gap-${m.id}`,
        materialId: m.id,
        type: "draft_gap",
        humanMessage: `${m.name} 的${FIELD_LABELS[result.gapField]}字段没填，先跳过了这一条，等你补全后再算`,
        detail: result.anomalyMessage ?? "",
        suggestion: `请在材料清单中填入${FIELD_LABELS[result.gapField]}数值，或标记该条为"不计入"`,
        severity: 2,
      });
    }

    if (result.anomalyType === "bad_data") {
      anomalies.push({
        id: `anom-bad-${m.id}`,
        materialId: m.id,
        type: "bad_data",
        humanMessage: `${m.name} 的尺寸或数量看起来像手填时带进来的小麻烦（负数或乱码），目前按 0 体积记了`,
        detail: result.anomalyMessage ?? "",
        suggestion: "请复核实测尺寸，修正后重新计算",
        severity: 3,
      });
    }

    if (result.anomalyType === "empty_set") {
      anomalies.push({
        id: `anom-empty-${m.id}`,
        materialId: m.id,
        type: "empty_set",
        humanMessage: `${m.name} 的数量是 0，这批里它暂时不占体积，但别忘了后面可能要装箱`,
        detail: result.anomalyMessage ?? "",
        suggestion: "如果确实不装箱可忽略，否则请填入实际数量",
        severity: 1,
      });
    }

    if (result.anomalyType === "zero_division") {
      anomalies.push({
        id: `anom-zero-${m.id}`,
        materialId: m.id,
        type: "zero_division",
        humanMessage: `${m.name} 校验时填充率碰到了 0，我用默认值 0.8 兜底算了一版，你确认下参数对不对`,
        detail: result.anomalyMessage ?? "",
        suggestion: "请检查参数表中的填充率设置，避免除零风险",
        severity: 2,
      });
    }

    if (
      result.errorRate !== null &&
      result.errorRate !== undefined &&
      result.errorRate > batch.params.errorThreshold &&
      !result.hasGap
    ) {
      anomalies.push({
        id: `anom-error-${m.id}`,
        materialId: m.id,
        type: "large_error",
        humanMessage: `${m.name} 体积近似误差 ${result.errorRate}%，超过了 ${batch.params.errorThreshold}% 的阈值，建议你抽时间复核实测尺寸`,
        detail: `近似体积 ${result.approxVolume.toLocaleString()} cm³，真实体积 ${m.realVolume?.toLocaleString()} cm³`,
        suggestion: "优先核对尺寸数据，如近似公式不适用于此类材料可调整填充率参数",
        severity: 3,
      });
    }

    return material;
  });

  const processed: Batch = {
    ...batch,
    materials: processedMaterials,
    totalApproxVolume: totalVolume,
    anomalies,
    draftGaps,
  };
  processed.constraints = validateConstraints(processed);
  return processed;
}

interface VolumeState {
  batches: Batch[];
  currentBatchId: string;
  compareBatchId: string | null;
  selectedMaterialId: string | null;
  activeTab: string;

  currentBatch: Batch;
  compareBatch: Batch | null;

  setCurrentBatchId: (id: string) => void;
  setCompareBatchId: (id: string | null) => void;
  setSelectedMaterialId: (id: string | null) => void;
  setActiveTab: (tab: string) => void;

  updateMaterial: (materialId: string, patch: Partial<Material>) => void;
  updateParams: (patch: Partial<BatchParams>) => void;
  fillDraftGap: (materialId: string, field: string, value: number) => void;
}

const initialBatches = mockBatches.map(processBatch);

export const useVolumeStore = create<VolumeState>((set, get) => ({
  batches: initialBatches,
  currentBatchId: initialBatches[0].id,
  compareBatchId: initialBatches[1]?.id ?? null,
  selectedMaterialId: null,
  activeTab: "overview",

  get currentBatch() {
    return get().batches.find((b) => b.id === get().currentBatchId) ?? get().batches[0];
  },
  get compareBatch() {
    const id = get().compareBatchId;
    if (!id) return null;
    return get().batches.find((b) => b.id === id) ?? null;
  },

  setCurrentBatchId: (id) => set({ currentBatchId: id }),
  setCompareBatchId: (id) => set({ compareBatchId: id }),
  setSelectedMaterialId: (id) => set({ selectedMaterialId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  updateMaterial: (materialId, patch) => {
    set((state) => {
      const batches = state.batches.map((b) => {
        if (b.id !== state.currentBatchId) return b;
        const materials = b.materials.map((m) =>
          m.id === materialId ? { ...m, ...patch } : m
        );
        return processBatch({ ...b, materials });
      });
      return { batches };
    });
  },

  updateParams: (patch) => {
    set((state) => {
      const batches = state.batches.map((b) => {
        if (b.id !== state.currentBatchId) return b;
        return processBatch({ ...b, params: { ...b.params, ...patch } });
      });
      return { batches };
    });
  },

  fillDraftGap: (materialId, field, value) => {
    set((state) => {
      const batches = state.batches.map((b) => {
        if (b.id !== state.currentBatchId) return b;
        const materials = b.materials.map((m) => {
          if (m.id !== materialId) return m;
          const updated = { ...m, [field]: value, hasDraftGap: false } as Material;
          delete updated.gapField;
          return updated;
        });
        return processBatch({ ...b, materials });
      });
      return { batches };
    });
  },
}));
