import { create } from "zustand";
import type { Parameter, ParameterStatus, OperationType } from "@/types";
import { mockParameters } from "@/utils/mockData";
import { useTimelineStore } from "./useTimelineStore";

interface ParameterState {
  parameters: Parameter[];
  selectedParameterId: string | null;
  filterStatus: ParameterStatus | "all";
  filterValueType: "all" | "empty_set" | "zero" | "normal";
  searchQuery: string;
  selectedCategory: string | "all";
  setSelectedParameter: (id: string | null) => void;
  setFilterStatus: (status: ParameterStatus | "all") => void;
  setFilterValueType: (type: "all" | "empty_set" | "zero" | "normal") => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | "all") => void;
  getParameterById: (id: string) => Parameter | undefined;
  updateParameterValue: (id: string, value: number | null, valueType: Parameter["valueType"], reason: string) => void;
  updateParameterStatus: (id: string, status: ParameterStatus, reason: string) => void;
  supplementParameter: (id: string, value: number | null, valueType: Parameter["valueType"], reason: string) => void;
  withdrawParameter: (id: string, reason: string) => void;
  rejudgeParameter: (id: string, status: ParameterStatus, reason: string) => void;
  addParameters: (params: Parameter[]) => void;
  getFilteredParameters: () => Parameter[];
  getCategories: () => string[];
}

function generateId() {
  return `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useParameterStore = create<ParameterState>((set, get) => ({
  parameters: mockParameters,
  selectedParameterId: null,
  filterStatus: "all",
  filterValueType: "all",
  searchQuery: "",
  selectedCategory: "all",

  setSelectedParameter: (id) => set({ selectedParameterId: id }),

  setFilterStatus: (status) => set({ filterStatus: status }),

  setFilterValueType: (type) => set({ filterValueType: type }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedCategory: (category) => set({ selectedCategory: category }),

  getParameterById: (id) => get().parameters.find((p) => p.id === id),

  updateParameterValue: (id, value, valueType, reason) => {
    const param = get().getParameterById(id);
    if (!param) return;

    const oldValue = param.value;
    const oldValueType = param.valueType;

    set((state) => ({
      parameters: state.parameters.map((p) =>
        p.id === id
          ? { ...p, value, valueType, updatedAt: new Date().toISOString() }
          : p,
      ),
    }));

    useTimelineStore.getState().addEntry({
      id: generateId(),
      parameterId: id,
      parameterName: param.name,
      operationType: "update",
      oldValue,
      newValue: value,
      oldStatus: param.status,
      newStatus: param.status,
      reason,
      operator: "老叶",
      timestamp: new Date().toISOString(),
      details: { oldValueType, newValueType: valueType },
    });
  },

  updateParameterStatus: (id, status, reason) => {
    const param = get().getParameterById(id);
    if (!param) return;

    const oldStatus = param.status;
    let operationType: OperationType = "update";
    if (status === "approved") operationType = "approve";
    else if (status === "rejected") operationType = "reject";

    set((state) => ({
      parameters: state.parameters.map((p) =>
        p.id === id
          ? { ...p, status, updatedAt: new Date().toISOString() }
          : p,
      ),
    }));

    useTimelineStore.getState().addEntry({
      id: generateId(),
      parameterId: id,
      parameterName: param.name,
      operationType,
      oldValue: param.value,
      newValue: param.value,
      oldStatus,
      newStatus: status,
      reason,
      operator: "老叶",
      timestamp: new Date().toISOString(),
    });
  },

  supplementParameter: (id, value, valueType, reason) => {
    const param = get().getParameterById(id);
    if (!param) return;

    const oldValue = param.value;

    set((state) => ({
      parameters: state.parameters.map((p) =>
        p.id === id
          ? {
              ...p,
              value,
              valueType,
              status: "needs_review",
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));

    useTimelineStore.getState().addEntry({
      id: generateId(),
      parameterId: id,
      parameterName: param.name,
      operationType: "supplement",
      oldValue,
      newValue: value,
      oldStatus: param.status,
      newStatus: "needs_review",
      reason,
      operator: "老叶",
      timestamp: new Date().toISOString(),
    });
  },

  withdrawParameter: (id, reason) => {
    const param = get().getParameterById(id);
    if (!param) return;

    const oldValue = param.value;

    set((state) => ({
      parameters: state.parameters.map((p) =>
        p.id === id
          ? {
              ...p,
              value: null,
              valueType: "null",
              status: "pending",
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));

    useTimelineStore.getState().addEntry({
      id: generateId(),
      parameterId: id,
      parameterName: param.name,
      operationType: "withdraw",
      oldValue,
      newValue: null,
      oldStatus: param.status,
      newStatus: "pending",
      reason,
      operator: "老叶",
      timestamp: new Date().toISOString(),
    });
  },

  rejudgeParameter: (id, status, reason) => {
    const param = get().getParameterById(id);
    if (!param) return;

    const oldStatus = param.status;

    set((state) => ({
      parameters: state.parameters.map((p) =>
        p.id === id
          ? { ...p, status, updatedAt: new Date().toISOString() }
          : p,
      ),
    }));

    useTimelineStore.getState().addEntry({
      id: generateId(),
      parameterId: id,
      parameterName: param.name,
      operationType: "rejudge",
      oldValue: param.value,
      newValue: param.value,
      oldStatus,
      newStatus: status,
      reason,
      operator: "老叶",
      timestamp: new Date().toISOString(),
    });
  },

  addParameters: (params) => {
    set((state) => ({
      parameters: [...state.parameters, ...params],
    }));

    params.forEach((param) => {
      useTimelineStore.getState().addEntry({
        id: generateId(),
        parameterId: param.id,
        parameterName: param.name,
        operationType: "create",
        newValue: param.value,
        newStatus: param.status,
        reason: "批次运行新增",
        operator: "系统",
        timestamp: new Date().toISOString(),
      });
    });
  },

  getFilteredParameters: () => {
    const { parameters, filterStatus, filterValueType, searchQuery, selectedCategory } = get();
    return parameters.filter((p) => {
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterValueType !== "all" && p.valueType !== filterValueType) return false;
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.description.toLowerCase().includes(q) &&
          !p.category.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  },

  getCategories: () => {
    const categories = new Set(get().parameters.map((p) => p.category));
    return Array.from(categories);
  },
}));
