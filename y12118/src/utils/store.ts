import { create } from "zustand";
import type { Channel, Material, AllocationOutput, ScenarioPreset } from "@/utils/types";
import { allocateBudget } from "@/utils/allocator";
import { getScenarioData } from "@/utils/scenarios";

interface AppState {
  channels: Channel[];
  materials: Material[];
  totalBudget: number;
  scenarioLabel: string;
  output: AllocationOutput | null;
  selectedChannelId: string | null;

  setTotalBudget: (budget: number) => void;
  setChannels: (channels: Channel[]) => void;
  setMaterials: (materials: Material[]) => void;
  loadScenario: (preset: ScenarioPreset) => void;
  runAllocation: () => void;
  selectChannel: (channelId: string | null) => void;
  updateChannel: (id: string, field: keyof Channel, value: number | string) => void;
  addChannel: () => void;
  removeChannel: (id: string) => void;
  updateMaterial: (id: string, field: keyof Material, value: string | string[]) => void;
  addMaterial: () => void;
  removeMaterial: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  channels: [],
  materials: [],
  totalBudget: 8000,
  scenarioLabel: "",
  output: null,
  selectedChannelId: null,

  setTotalBudget: (budget) => set({ totalBudget: budget }),

  setChannels: (channels) => set({ channels }),

  setMaterials: (materials) => set({ materials }),

  loadScenario: (preset) => {
    const data = getScenarioData(preset);
    set({
      channels: data.channels,
      materials: data.materials,
      totalBudget: data.totalBudget,
      scenarioLabel: data.label,
      output: null,
      selectedChannelId: null,
    });
  },

  runAllocation: () => {
    const { channels, materials, totalBudget } = get();
    const output = allocateBudget(channels, materials, totalBudget);
    set({ output, selectedChannelId: null });
  },

  selectChannel: (channelId) => set({ selectedChannelId: channelId }),

  updateChannel: (id, field, value) =>
    set((state) => ({
      channels: state.channels.map((ch) =>
        ch.id === id ? { ...ch, [field]: value } : ch
      ),
    })),

  addChannel: () =>
    set((state) => ({
      channels: [
        ...state.channels,
        {
          id: `ch_${Date.now()}`,
          name: "新渠道",
          dailyCap: 5000,
          cpaBid: 80,
          conversionRate: 0.03,
          conversionDelayDays: 0,
          efficiencyAlpha: 0.002,
        },
      ],
    })),

  removeChannel: (id) =>
    set((state) => ({
      channels: state.channels.filter((ch) => ch.id !== id),
      materials: state.materials.filter((m) => m.channelId !== id),
    })),

  updateMaterial: (id, field, value) =>
    set((state) => ({
      materials: state.materials.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      ),
    })),

  addMaterial: () =>
    set((state) => {
      const firstChannelId = state.channels[0]?.id ?? "";
      return {
        materials: [
          ...state.materials,
          {
            id: `m_${Date.now()}`,
            name: "新素材",
            channelId: firstChannelId,
            tags: [],
          },
        ],
      };
    }),

  removeMaterial: (id) =>
    set((state) => ({
      materials: state.materials.filter((m) => m.id !== id),
    })),
}));
