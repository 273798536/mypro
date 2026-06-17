import { create } from "zustand";
import {
  torqueRecords,
  defaultParameterSet,
  recalculate,
  checkConsistency,
  motorComponents as allComponents
} from "@/data/mock";
const applyFilters = (records, timeWindow, filters, selectedComponent) => {
  const compTypeById = /* @__PURE__ */ new Map();
  allComponents.forEach((c) => compTypeById.set(c.id, c.type));
  let result = records;
  if (filters.equipmentId) {
    result = result.filter((r) => r.equipmentId === filters.equipmentId);
  }
  if (timeWindow.start && timeWindow.end) {
    result = result.filter(
      (r) => r.timestamp >= timeWindow.start && r.timestamp <= timeWindow.end
    );
  }
  if (selectedComponent) {
    result = result.filter((r) => r.componentId === selectedComponent.id);
  }
  if (!selectedComponent && filters.componentType) {
    result = result.filter(
      (r) => compTypeById.get(r.componentId) === filters.componentType
    );
  }
  if (filters.severity.length > 0) {
    result = result.filter((r) => filters.severity.includes(r.severity));
  }
  return result;
};
const initialTimeWindow = { start: "2025-03-10T08:00:00", end: "2025-03-13T08:00:00" };
const initialFilters = { equipmentId: "EQ-001", severity: [], componentType: null, source: null };
const useAttributionStore = create((set, get) => ({
  selectedComponent: null,
  timeWindow: initialTimeWindow,
  filters: initialFilters,
  parameterSet: { ...defaultParameterSet },
  recalcResults: [],
  consistencyCheck: null,
  filteredRecords: applyFilters(torqueRecords, initialTimeWindow, initialFilters, null),
  selectComponent: (component) => {
    const state = get();
    const nextFilters = state.filters;
    const clearComponentType = component !== null && state.filters.componentType !== null;
    const appliedFilters = clearComponentType ? { ...nextFilters, componentType: null } : nextFilters;
    const newRecords = applyFilters(
      torqueRecords,
      state.timeWindow,
      appliedFilters,
      component
    );
    const patch = {
      selectedComponent: component,
      filteredRecords: newRecords
    };
    if (clearComponentType) patch.filters = appliedFilters;
    set(patch);
  },
  setTimeWindow: (timeWindow) => {
    const state = get();
    const newRecords = applyFilters(torqueRecords, timeWindow, state.filters, state.selectedComponent);
    set({ timeWindow, filteredRecords: newRecords });
  },
  setFilters: (filters) => {
    const state = get();
    const clearSelected = filters.componentType !== null && state.selectedComponent !== null;
    const appliedComponent = clearSelected ? null : state.selectedComponent;
    const newRecords = applyFilters(
      torqueRecords,
      state.timeWindow,
      filters,
      appliedComponent
    );
    const patch = {
      filters,
      filteredRecords: newRecords
    };
    if (clearSelected) patch.selectedComponent = appliedComponent;
    set(patch);
  },
  updateParameterSet: (params) => {
    set({ parameterSet: params });
  },
  recalculateAll: () => {
    const state = get();
    const previousThreshold = defaultParameterSet.safetyThreshold;
    const results = allComponents.map((cmp) => {
      const componentRecords = torqueRecords.filter((r) => r.componentId === cmp.id);
      const avgError = componentRecords.length > 0 ? componentRecords.reduce((s, r) => s + r.errorPercent, 0) / componentRecords.length : 0;
      return recalculate(state.parameterSet, cmp.id, cmp.name, avgError, previousThreshold);
    });
    set({ recalcResults: results });
  },
  runConsistencyCheck: () => {
    const state = get();
    const pageRecords = state.filteredRecords;
    const csvRecords = state.getFilteredRecords();
    const result = checkConsistency(pageRecords, csvRecords);
    set({ consistencyCheck: result });
  },
  getFilteredRecords: () => {
    const state = get();
    return applyFilters(torqueRecords, state.timeWindow, state.filters, state.selectedComponent);
  },
  exportCSV: () => {
    const records = get().getFilteredRecords();
    const compNameById = /* @__PURE__ */ new Map();
    const compTypeById = /* @__PURE__ */ new Map();
    const compTypeLabel = {
      stator: "\u5B9A\u5B50",
      rotor: "\u8F6C\u5B50",
      bearing: "\u8F74\u627F",
      shaft: "\u8F74",
      housing: "\u58F3\u4F53",
      winding: "\u7ED5\u7EC4",
      sensor: "\u4F20\u611F\u5668"
    };
    allComponents.forEach((c) => {
      compNameById.set(c.id, c.name);
      compTypeById.set(c.id, compTypeLabel[c.type] ?? c.type);
    });
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const header = [
      "ID",
      "\u8BBE\u5907ID",
      "\u96F6\u90E8\u4EF6ID",
      "\u96F6\u90E8\u4EF6\u540D\u79F0",
      "\u96F6\u90E8\u4EF6\u7C7B\u578B",
      "\u5B9E\u6D4B\u626D\u77E9(N\xB7m)",
      "\u989D\u5B9A\u626D\u77E9(N\xB7m)",
      "\u8BEF\u5DEE(%)",
      "\u4E25\u91CD\u7B49\u7EA7",
      "\u65F6\u95F4\u6233"
    ].map(q).join(",");
    const severityLabel = {
      normal: "\u6B63\u5E38",
      warning: "\u8B66\u544A",
      critical: "\u4E25\u91CD"
    };
    const rows = records.map((r) => [
      r.id,
      r.equipmentId,
      r.componentId,
      compNameById.get(r.componentId) ?? r.componentId,
      compTypeById.get(r.componentId) ?? "",
      r.measuredTorque.toFixed(2),
      String(r.ratedTorque),
      String(r.errorPercent),
      severityLabel[r.severity] ?? r.severity,
      new Date(r.timestamp).toLocaleString("zh-CN", { hour12: false })
    ].map(q).join(","));
    return [header, ...rows].join("\r\n");
  },
  exportCSVWithBOM: () => {
    const csv = get().exportCSV();
    const BOM = "\uFEFF";
    return new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  }
}));
export {
  useAttributionStore
};
