import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Batch,
  Role,
  SolventType,
  Version,
  BatchStatus,
  RetestAdvice,
  BalanceResult,
} from "@/types";
import { SOLVENT_META } from "@/types";
import { SAMPLE_BATCHES } from "@/data/sampleBatches";

interface AppState {
  role: Role;
  setRole: (r: Role) => void;

  batches: Batch[];
  initSample: () => void;

  createBatch: (p: {
    solventType: SolventType;
    initialAmount: number;
    targetPurity: number;
    recoveredAmount: number;
  }) => { ok: boolean; batchId?: string; duplicate?: string; missing?: string[] };

  getBatch: (id: string) => Batch | undefined;
  getPublishedBatches: () => Batch[];
  getLatestVersion: (b: Batch) => Version | undefined;
  getPublishedVersion: (b: Batch) => Version | undefined;

  updateStatus: (batchId: string, status: BatchStatus) => void;
  addVersion: (p: {
    batchId: string;
    purityResult: number;
    explanation: string;
    changeNote: string;
  }) => { ok: boolean; message?: string };

  publishVersion: (batchId: string, versionId: string) => void;
  resolveRetest: (batchId: string, retestId: string) => void;

  calculateBalance: (p: {
    solventType: SolventType;
    initialAmount: number;
    targetPurity: number;
    reflowTemp?: number;
    reflowTime?: number;
    coolTemp?: number;
  }) => BalanceResult;

  stats: () => {
    total: number;
    published: number;
    retest: number;
    review: number;
    avgPurity: number;
  };
}

const uid = () => Math.random().toString(36).slice(2, 10);

const formatDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      role: "monitor",
      setRole: (r) => set({ role: r }),

      batches: [],
      initSample: () => {
        if (get().batches.length === 0) {
          set({ batches: JSON.parse(JSON.stringify(SAMPLE_BATCHES)) });
        }
      },

      createBatch: ({ solventType, initialAmount, targetPurity, recoveredAmount }) => {
        const missing: string[] = [];
        if (!solventType) missing.push("溶剂类型");
        if (!initialAmount || initialAmount <= 0) missing.push("初始投料量");
        if (!targetPurity || targetPurity <= 0 || targetPurity > 100) missing.push("目标纯度");
        if (!recoveredAmount || recoveredAmount < 0) missing.push("回收量");
        if (missing.length) return { ok: false, missing };

        const today = formatDate(new Date());
        const existing = get().batches.find(
          (b) =>
            b.solventType === solventType &&
            b.initialAmount === initialAmount &&
            b.targetPurity === targetPurity &&
            b.batchId.includes(today),
        );
        if (existing) {
          return { ok: false, duplicate: existing.batchId };
        }

        const sameDay = get().batches.filter((b) => b.batchId.includes(today) && b.solventType === solventType).length;
        const seq = String(sameDay + 1).padStart(3, "0");
        const batchId = `SOL-${SOLVENT_META[solventType].abbreviation}-${today}-${seq}`;

        const version: Version = {
          versionId: uid(),
          batchId,
          versionNum: 1,
          purityResult: 0,
          explanation: "",
          modifiedBy: get().role,
          modifiedAt: new Date().toISOString(),
          changeNote: "批次草稿创建",
          isPublished: false,
        };

        const nb: Batch = {
          batchId,
          solventType,
          initialAmount,
          targetPurity,
          recoveredAmount,
          status: "draft",
          createdBy: get().role,
          createdAt: new Date().toISOString(),
          reactionConditions: [
            { id: uid(), name: "回流温度", value: String(SOLVENT_META[solventType].boilingPoint), unit: "°C", category: "temperature" },
            { id: uid(), name: "回流时间", value: "30", unit: "min", category: "time" },
            { id: uid(), name: "蒸馏压力", value: "101.3", unit: "kPa", category: "pressure" },
            { id: uid(), name: "干燥剂", value: "分子筛4A", unit: "8g/L", category: "catalyst" },
            { id: uid(), name: "冷却水温", value: "10", unit: "°C", category: "other" },
          ],
          versions: [version],
          tempCurve: [],
          phLogs: [],
          steps: [
            { recordId: uid(), batchId, stepName: "投料", value: initialAmount, unit: "L", note: "" },
            { recordId: uid(), batchId, stepName: "收集产品", value: recoveredAmount, unit: "L", note: "" },
          ],
          retestAdvices: [],
        };
        set({ batches: [...get().batches, nb] });
        return { ok: true, batchId };
      },

      getBatch: (id) => get().batches.find((b) => b.batchId === id),

      getPublishedBatches: () =>
        get().batches.filter((b) => b.versions.some((v) => v.isPublished)),

      getLatestVersion: (b) =>
        [...b.versions].sort((a, b) => b.versionNum - a.versionNum)[0],

      getPublishedVersion: (b) =>
        [...b.versions].sort((a, b) => b.versionNum - a.versionNum).find((v) => v.isPublished),

      updateStatus: (batchId, status) =>
        set({
          batches: get().batches.map((b) => (b.batchId === batchId ? { ...b, status } : b)),
        }),

      addVersion: ({ batchId, purityResult, explanation, changeNote }) => {
        if (!explanation.trim()) {
          return { ok: false, message: "缺少结果解释，请填写1-2句专业说明后再提交" };
        }
        if (!changeNote.trim()) {
          return { ok: false, message: "缺少修改说明，留痕后才能生成新版本" };
        }
        if (purityResult <= 0 || purityResult > 100) {
          return { ok: false, message: "纯度结果数值无效，请确认范围在0~100之间" };
        }
        const b = get().getBatch(batchId);
        if (!b) return { ok: false, message: "批次不存在" };
        const latest = get().getLatestVersion(b);
        const nextNum = (latest?.versionNum ?? 0) + 1;
        const nv: Version = {
          versionId: uid(),
          batchId,
          versionNum: nextNum,
          purityResult,
          explanation,
          modifiedBy: get().role,
          modifiedAt: new Date().toISOString(),
          changeNote,
          isPublished: false,
        };
        set({
          batches: get().batches.map((x) =>
            x.batchId === batchId ? { ...x, versions: [...x.versions, nv], status: "review" } : x,
          ),
        });
        return { ok: true };
      },

      publishVersion: (batchId, versionId) =>
        set({
          batches: get().batches.map((b) =>
            b.batchId === batchId
              ? {
                  ...b,
                  versions: b.versions.map((v) => ({
                    ...v,
                    isPublished: v.versionId === versionId ? true : false,
                  })),
                  status: "published",
                }
              : b,
          ),
        }),

      resolveRetest: (batchId, retestId) =>
        set({
          batches: get().batches.map((b) =>
            b.batchId === batchId
              ? {
                  ...b,
                  retestAdvices: b.retestAdvices.map((r) =>
                    r.retestId === retestId ? { ...r, resolved: true } : r,
                  ),
                }
              : b,
          ),
        }),

      calculateBalance: ({ solventType, initialAmount, targetPurity, reflowTemp, reflowTime, coolTemp }) => {
        const meta = SOLVENT_META[solventType];
        const warnings: string[] = [];

        if (!initialAmount) warnings.push("缺少初始投料量（L），无法计算回收率");
        if (!targetPurity) warnings.push("缺少目标纯度（%），无法判定是否达标");
        if (!reflowTemp) warnings.push("缺少回流温度（°C），建议补充后核算能耗");
        if (!reflowTime) warnings.push("缺少回流时间（min），建议补充后评估产能");
        if (!coolTemp) warnings.push("缺少冷却水温（°C），无法核算冷凝效率");

        const baseRecovery = meta.standardPurity / 100;
        const targetFactor = targetPurity ? (targetPurity / 100) / baseRecovery : 1;
        const tempFactor =
          reflowTemp && meta.boilingPoint
            ? 1 - Math.min(0.2, Math.abs(reflowTemp - meta.boilingPoint) * 0.01)
            : 1;

        const theoreticalRecovery = Math.min(98, Math.max(60, baseRecovery * 100 * tempFactor / targetFactor));
        const theoreticalAmount = initialAmount ? +(initialAmount * theoreticalRecovery / 100).toFixed(2) : 0;

        const timeMin = reflowTime ?? 30;
        const energyEstimateKwh = +((initialAmount || 0) * 0.08 + timeMin * 0.04).toFixed(2);

        const phLow = solventType === "ACE" ? 6.3 : solventType === "MEOH" ? 6.5 : 6.2;
        const phHigh = solventType === "MEOH" ? 7.8 : 8.0;

        return {
          theoreticalRecovery: +theoreticalRecovery.toFixed(2),
          theoreticalAmount,
          energyEstimateKwh,
          timeEstimateMin: timeMin + 20,
          phRange: [phLow, phHigh],
          warnings,
        };
      },

      stats: () => {
        const b = get().batches;
        let sum = 0;
        let count = 0;
        for (const x of b) {
          const lv = get().getLatestVersion(x);
          if (lv && lv.purityResult > 0) {
            sum += lv.purityResult;
            count++;
          }
        }
        return {
          total: b.length,
          published: b.filter((x) => x.status === "published").length,
          retest: b.filter((x) => x.status === "retest").length,
          review: b.filter((x) => x.status === "review").length,
          avgPurity: count ? +(sum / count).toFixed(2) : 0,
        };
      },
    }),
    {
      name: "solvent-tracker-store",
      onRehydrateStorage: () => (state) => {
        if (state) state.initSample();
      },
    },
  ),
);
