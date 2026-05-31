import { create } from "zustand";
import { persist } from "zustand/middleware";
import { RatioVersion } from "@/types";
import { useChangeLogStore } from "./employeeStore";

interface RatioState {
  ratioVersions: RatioVersion[];
  setRatioVersions: (versions: RatioVersion[]) => void;
  addRatioVersion: (version: Omit<RatioVersion, "id" | "createdAt" | "updatedAt">) => void;
  updateRatioVersion: (id: string, updates: Partial<RatioVersion>) => void;
  deleteRatioVersion: (id: string) => void;
  getVersionByMonth: (month: string) => RatioVersion | undefined;
  getLatestVersion: () => RatioVersion | undefined;
}

const initialRatioVersions: RatioVersion[] = [
  {
    id: "r1",
    personalRatio: 0.04,
    companyRatio: 0.08,
    effectiveMonth: "2024-01",
    expireMonth: "2024-06",
    isDelayed: false,
    description: "2024年上半年缴费比例",
    createdAt: "2023-12-01T00:00:00Z",
    updatedAt: "2023-12-01T00:00:00Z",
  },
  {
    id: "r2",
    personalRatio: 0.05,
    companyRatio: 0.10,
    effectiveMonth: "2024-07",
    expireMonth: "2024-11",
    isDelayed: true,
    delayedMonths: 1,
    description: "2024年下半年缴费比例（延迟到版1个月）",
    createdAt: "2024-07-15T00:00:00Z",
    updatedAt: "2024-08-01T00:00:00Z",
  },
  {
    id: "r3",
    personalRatio: 0.06,
    companyRatio: 0.12,
    effectiveMonth: "2024-12",
    isDelayed: false,
    description: "2024年12月起执行新比例",
    createdAt: "2024-11-20T00:00:00Z",
    updatedAt: "2024-11-20T00:00:00Z",
  },
];

export const useRatioStore = create<RatioState>()(
  persist(
    (set, get) => ({
      ratioVersions: initialRatioVersions,
      setRatioVersions: (versions) => set({ ratioVersions: versions }),
      addRatioVersion: (version) => {
        const now = new Date().toISOString();
        const newVersion: RatioVersion = {
          ...version,
          id: "r" + Date.now().toString(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ ratioVersions: [...state.ratioVersions, newVersion] }));
      },
      updateRatioVersion: (id, updates) => {
        const oldVersion = get().ratioVersions.find((v) => v.id === id);
        if (!oldVersion) return;

        const now = new Date().toISOString();
        set((state) => ({
          ratioVersions: state.ratioVersions.map((v) =>
          v.id === id ? { ...v, ...updates, updatedAt: now } : v
          ),
        }));

        Object.entries(updates).forEach(([field, newValue]) => {
          const oldValue = oldVersion[field as keyof RatioVersion];
          if (oldValue !== newValue) {
            useChangeLogStore.getState().addChangeLog({
              entityType: "ratio",
              entityId: id,
              field,
              oldValue: String(oldValue || ""),
              newValue: String(newValue || ""),
              operator: "当前用户",
            });
          }
        });
      },
      deleteRatioVersion: (id) =>
        set((state) => ({
          ratioVersions: state.ratioVersions.filter((v) => v.id !== id),
        })),
      getVersionByMonth: (month) => {
        const versions = get().ratioVersions;
        return versions.find(
          (v) =>
            v.effectiveMonth <= month &&
            (!v.expireMonth || v.expireMonth >= month)
        );
      },
      getLatestVersion: () => {
        const versions = get().ratioVersions;
        return versions.sort(
          (a, b) =>
            new Date(b.effectiveMonth).getTime() -
            new Date(a.effectiveMonth).getTime()
        )[0];
      },
    }),
    { name: "ratio-store" }
  )
);
