import { create } from "zustand";
import type { Order, QuotaLimit, RiskType, Settlement, ChangeRecord, QuotaLockRecord } from "../types";
import { levels } from "../data/levels";
import { calculateSettlement, generateQuotaLockRecords } from "../utils/settlement";

interface LevelState {
  status: "pending" | "in_progress" | "completed";
  score: number;
  settlement: Settlement | null;
}

interface GameState {
  levelStates: Record<string, LevelState>;
  currentLevelId: string | null;
  orders: Order[];
  quotas: QuotaLimit[];
  quotasLoaded: boolean;
  userMarkedRisks: Record<string, RiskType[]>;
  settlements: Settlement[];
  changeRecords: ChangeRecord[];
  quotaLockRecords: QuotaLockRecord[];
  orderEditorOpen: boolean;
  editingOrderId: string | null;

  startLevel: (levelId: string) => void;
  markRisk: (orderId: string, riskType: RiskType) => void;
  unmarkRisk: (orderId: string, riskType: RiskType) => void;
  setQuotasLoaded: (loaded: boolean) => void;
  submitJudgments: () => void;
  modifyOrder: (orderId: string, field: string, newValue: string | number | null) => void;
  setOrderEditorOpen: (open: boolean) => void;
  setEditingOrderId: (id: string | null) => void;
  resetLevel: (levelId: string) => void;
  getLevelState: (levelId: string) => LevelState;
  loadFromStorage: () => void;
}

const STORAGE_KEY = "fx-rcb-game-state";

function persistState(state: Partial<GameState>) {
  try {
    const toSave = {
      levelStates: state.levelStates,
      orders: state.orders,
      quotas: state.quotas,
      userMarkedRisks: state.userMarkedRisks,
      settlements: state.settlements,
      changeRecords: state.changeRecords,
      quotaLockRecords: state.quotaLockRecords,
      currentLevelId: state.currentLevelId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch { /* ignore */ }
}

function loadState(): Partial<GameState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

const saved = loadState();

export const useGameStore = create<GameState>((set, get) => ({
  levelStates: (saved?.levelStates as Record<string, LevelState>) ?? {
    "1": { status: "pending", score: 0, settlement: null },
    "2": { status: "pending", score: 0, settlement: null },
  },
  currentLevelId: (saved?.currentLevelId as string | null) ?? null,
  orders: (saved?.orders as Order[]) ?? [],
  quotas: (saved?.quotas as QuotaLimit[]) ?? [],
  quotasLoaded: true,
  userMarkedRisks: (saved?.userMarkedRisks as Record<string, RiskType[]>) ?? {},
  settlements: (saved?.settlements as Settlement[]) ?? [],
  changeRecords: (saved?.changeRecords as ChangeRecord[]) ?? [],
  quotaLockRecords: (saved?.quotaLockRecords as QuotaLockRecord[]) ?? [],
  orderEditorOpen: false,
  editingOrderId: null,

  loadFromStorage: () => {
    const loaded = loadState();
    if (!loaded) return;
    set({
      levelStates: (loaded.levelStates as Record<string, LevelState>) ?? get().levelStates,
      currentLevelId: (loaded.currentLevelId as string | null) ?? null,
      orders: (loaded.orders as Order[]) ?? [],
      quotas: (loaded.quotas as QuotaLimit[]) ?? [],
      userMarkedRisks: (loaded.userMarkedRisks as Record<string, RiskType[]>) ?? {},
      settlements: (loaded.settlements as Settlement[]) ?? [],
      changeRecords: (loaded.changeRecords as ChangeRecord[]) ?? [],
      quotaLockRecords: (loaded.quotaLockRecords as QuotaLockRecord[]) ?? [],
    });
  },

  startLevel: (levelId: string) => {
    const existing = get().levelStates[levelId];
    if (existing && existing.status === "completed") {
      set({ currentLevelId: levelId, quotasLoaded: true });
      return;
    }

    const level = levels.find((l) => l.id === levelId);
    if (!level) return;

    const deepClonedOrders = JSON.parse(JSON.stringify(level.orders)) as Order[];
    const deepClonedQuotas = JSON.parse(JSON.stringify(level.quotas)) as QuotaLimit[];

    const newState = {
      currentLevelId: levelId,
      orders: deepClonedOrders,
      quotas: deepClonedQuotas,
      quotasLoaded: level.quotaLoadDelay === 0,
      userMarkedRisks: {} as Record<string, RiskType[]>,
      quotaLockRecords: [] as QuotaLockRecord[],
      orderEditorOpen: false,
      editingOrderId: null as string | null,
      changeRecords: [] as ChangeRecord[],
      settlements: [] as Settlement[],
      levelStates: {
        ...get().levelStates,
        [levelId]: { status: "in_progress" as const, score: 0, settlement: null },
      },
    };
    set(newState);
    persistState(newState);

    if (level.quotaLoadDelay > 0) {
      setTimeout(() => {
        set({ quotasLoaded: true });
      }, level.quotaLoadDelay);
    }
  },

  markRisk: (orderId: string, riskType: RiskType) => {
    const current = get().userMarkedRisks;
    const currentRisks = current[orderId] || [];
    if (currentRisks.includes(riskType)) return;
    const updated = {
      userMarkedRisks: {
        ...current,
        [orderId]: [...currentRisks, riskType],
      },
    };
    set(updated);
    persistState({ ...get(), ...updated });
  },

  unmarkRisk: (orderId: string, riskType: RiskType) => {
    const current = get().userMarkedRisks;
    const currentRisks = current[orderId] || [];
    const updated = {
      userMarkedRisks: {
        ...current,
        [orderId]: currentRisks.filter((r) => r !== riskType),
      },
    };
    set(updated);
    persistState({ ...get(), ...updated });
  },

  setQuotasLoaded: (loaded: boolean) => {
    set({ quotasLoaded: loaded });
  },

  submitJudgments: () => {
    const { currentLevelId, orders, quotas, userMarkedRisks } = get();
    if (!currentLevelId) return;

    const level = levels.find((l) => l.id === currentLevelId);
    if (!level) return;

    const settlement = calculateSettlement(
      currentLevelId,
      orders,
      quotas,
      userMarkedRisks,
      level.expectedRisks
    );

    const lockRecords = generateQuotaLockRecords(orders, quotas);

    const updated = {
      settlements: [...get().settlements, settlement],
      quotaLockRecords: lockRecords,
      levelStates: {
        ...get().levelStates,
        [currentLevelId]: {
          status: "completed" as const,
          score: settlement.totalScore,
          settlement,
        },
      },
    };
    set(updated);
    persistState({ ...get(), ...updated });
  },

  modifyOrder: (orderId: string, field: string, newValue: string | number | null) => {
    const { orders, currentLevelId, settlements, quotas } = get();
    if (!currentLevelId) return;

    const oldOrder = orders.find((o) => o.id === orderId);
    if (!oldOrder) return;

    const oldValue = String((oldOrder as unknown as Record<string, unknown>)[field] ?? "");

    const newOrders = orders.map((o) => {
      if (o.id !== orderId) return o;
      const updated = { ...o, [field]: newValue, modifiedFrom: orderId };
      return updated;
    });

    const oldSettlement = [...settlements].reverse().find((s) => s.levelId === currentLevelId);

    const level = levels.find((l) => l.id === currentLevelId);
    if (!level) return;

    const newSettlement = calculateSettlement(
      currentLevelId,
      newOrders,
      quotas,
      get().userMarkedRisks,
      level.expectedRisks
    );

    const changeRecord: ChangeRecord = {
      id: `CR-${Date.now()}`,
      orderId,
      field,
      oldValue,
      newValue: String(newValue ?? ""),
      oldSettlementId: oldSettlement?.id ?? "",
      newSettlementId: newSettlement.id,
      timestamp: Date.now(),
    };

    const updated = {
      orders: newOrders,
      settlements: [...get().settlements, newSettlement],
      changeRecords: [...get().changeRecords, changeRecord],
      levelStates: {
        ...get().levelStates,
        [currentLevelId]: {
          status: "completed" as const,
          score: newSettlement.totalScore,
          settlement: newSettlement,
        },
      },
    };
    set(updated);
    persistState({ ...get(), ...updated });
  },

  setOrderEditorOpen: (open: boolean) => set({ orderEditorOpen: open }),
  setEditingOrderId: (id: string | null) => set({ editingOrderId: id }),

  resetLevel: (levelId: string) => {
    const updated = {
      levelStates: {
        ...get().levelStates,
        [levelId]: { status: "pending" as const, score: 0, settlement: null },
      },
      currentLevelId: null,
      orders: [],
      quotas: [],
      quotasLoaded: false,
      userMarkedRisks: {},
      quotaLockRecords: [],
      orderEditorOpen: false,
      editingOrderId: null,
      settlements: get().settlements.filter((s) => s.levelId !== levelId),
      changeRecords: get().changeRecords.filter((c) => !c.orderId.startsWith("ORD-" + levelId)),
    };
    set(updated);
    persistState({ ...get(), ...updated });
  },

  getLevelState: (levelId: string) => {
    return get().levelStates[levelId] || { status: "pending" as const, score: 0, settlement: null };
  },
}));
