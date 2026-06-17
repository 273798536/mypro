import type { AppDataSet } from "@/types";
import { mockDataSet } from "@/data/mockData";

const STORAGE_KEY = "cs_judgement_data_v1";
const INIT_FLAG_KEY = "cs_judgement_initialized_v1";

export const storage = {
  load(): AppDataSet {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as AppDataSet;
    } catch (e) {
      console.warn("读取本地数据失败，回退初始数据", e);
    }
    return JSON.parse(JSON.stringify(mockDataSet));
  },

  save(data: AppDataSet): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("保存本地数据失败", e);
    }
  },

  reset(): AppDataSet {
    const fresh = JSON.parse(JSON.stringify(mockDataSet)) as AppDataSet;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    localStorage.setItem(INIT_FLAG_KEY, new Date().toISOString());
    return fresh;
  },

  ensureInitialized(): AppDataSet {
    const initialized = localStorage.getItem(INIT_FLAG_KEY);
    if (!initialized) {
      return this.reset();
    }
    return this.load();
  },
};
