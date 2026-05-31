import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ThresholdConfig } from '../types';
import { DEFAULT_THRESHOLD_CONFIG } from '../utils/constants';
import { db } from '../db';

interface ThresholdState {
  config: ThresholdConfig;
  isLoading: boolean;
  error: string | null;
  loadConfig: () => Promise<void>;
  updateConfig: (newConfig: Partial<ThresholdConfig>) => Promise<void>;
  resetConfig: () => Promise<void>;
}

export const useThresholdStore = create<ThresholdState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_THRESHOLD_CONFIG,
      isLoading: false,
      error: null,

      loadConfig: async () => {
        set({ isLoading: true, error: null });
        try {
          const config = await db.getActiveThresholdConfig();
          set({ config, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '加载阈值配置失败',
            isLoading: false,
          });
        }
      },

      updateConfig: async (newConfig: Partial<ThresholdConfig>) => {
        set({ isLoading: true, error: null });
        try {
          const currentConfig = get().config;
          const mergedConfig = {
            ...currentConfig,
            ...newConfig,
            brakeDistance: { ...currentConfig.brakeDistance, ...newConfig.brakeDistance },
            speedGap: { ...currentConfig.speedGap, ...newConfig.speedGap },
            brakeDelay: { ...currentConfig.brakeDelay, ...newConfig.brakeDelay },
            load: { ...currentConfig.load, ...newConfig.load },
            friction: { ...currentConfig.friction, ...newConfig.friction },
          };
          
          await db.setActiveThresholdConfig(mergedConfig);
          set({ config: mergedConfig, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '更新阈值配置失败',
            isLoading: false,
          });
        }
      },

      resetConfig: async () => {
        set({ isLoading: true, error: null });
        try {
          await db.setActiveThresholdConfig(DEFAULT_THRESHOLD_CONFIG);
          set({ config: DEFAULT_THRESHOLD_CONFIG, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '重置阈值配置失败',
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'threshold-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
