import { create } from "zustand";
import { anomalies as seedAnomalies, cablewayObjects } from "@/utils/mockData";
import type {
  Anomaly,
  CablewayObject,
  FilterState,
  ObjectStatus,
  ObjectType,
  ResolveStatus,
  Severity,
} from "@/shared/types";
import { loadStorage, saveStorage } from "@/utils/storage";

interface FilterAndSelectionState {
  filters: FilterState;
  anomalies: Anomaly[];
  objects: CablewayObject[];
  selectedObjectId: string | null;
  toggleFloor: (f: string) => void;
  toggleUnit: (u: string) => void;
  toggleType: (t: ObjectType) => void;
  toggleStatus: (s: ObjectStatus) => void;
  selectObject: (id: string | null) => void;
  setFilters: (next: FilterState) => void;
  confirmAnomaly: (id: string, resolver: string) => void;
  resolveAnomaly: (id: string, resolver: string) => void;
  isObjectVisible: (obj: CablewayObject, statusAtTime: ObjectStatus) => boolean;
  filteredAnomalies: () => Anomaly[];
}

const defaultFilters: FilterState = {
  floors: [],
  units: [],
  types: [],
  statuses: [],
};

const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 0,
  MAJOR: 1,
  MINOR: 2,
};

const RESOLVE_ORDER: Record<ResolveStatus, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  RESOLVED: 2,
};

export const useFilterStore = create<FilterAndSelectionState>((set, get) => ({
  filters: loadStorage("filters", defaultFilters),
  anomalies: loadStorage("anomalies", seedAnomalies),
  objects: cablewayObjects,
  selectedObjectId: null,
  toggleFloor: (f) => {
    const cur = get().filters.floors;
    const next = cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f];
    const filters = { ...get().filters, floors: next };
    set({ filters });
    saveStorage("filters", filters);
  },
  toggleUnit: (u) => {
    const cur = get().filters.units;
    const next = cur.includes(u) ? cur.filter((x) => x !== u) : [...cur, u];
    const filters = { ...get().filters, units: next };
    set({ filters });
    saveStorage("filters", filters);
  },
  toggleType: (t) => {
    const cur = get().filters.types;
    const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
    const filters = { ...get().filters, types: next };
    set({ filters });
    saveStorage("filters", filters);
  },
  toggleStatus: (s) => {
    const cur = get().filters.statuses;
    const next = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s];
    const filters = { ...get().filters, statuses: next };
    set({ filters });
    saveStorage("filters", filters);
  },
  selectObject: (id) => set({ selectedObjectId: id }),
  setFilters: (next) => {
    set({ filters: next });
    saveStorage("filters", next);
  },
  confirmAnomaly: (id, resolver) => {
    const next = get().anomalies.map((a) =>
      a.id === id ? { ...a, resolved: "CONFIRMED" as const, resolver } : a
    );
    set({ anomalies: next });
    saveStorage("anomalies", next);
  },
  resolveAnomaly: (id, resolver) => {
    const next = get().anomalies.map((a) =>
      a.id === id ? { ...a, resolved: "RESOLVED" as const, resolver } : a
    );
    set({ anomalies: next });
    saveStorage("anomalies", next);
  },
  isObjectVisible: (obj, statusAtTime) => {
    const f = get().filters;
    if (f.floors.length && !f.floors.includes(obj.floor)) return false;
    if (f.units.length && !f.units.includes(obj.unit)) return false;
    if (f.types.length && !f.types.includes(obj.type)) return false;
    if (f.statuses.length && !f.statuses.includes(statusAtTime)) return false;
    return true;
  },
  filteredAnomalies: () => {
    const { filters, anomalies, objects } = get();
    const objMap = new Map(objects.map((o) => [o.id, o]));
    return anomalies
      .filter((a) => {
        const obj = objMap.get(a.objectId);
        if (!obj) return false;
        if (filters.floors.length && !filters.floors.includes(obj.floor))
          return false;
        if (filters.units.length && !filters.units.includes(obj.unit))
          return false;
        if (filters.types.length && !filters.types.includes(obj.type))
          return false;
        return true;
      })
      .sort((a, b) => {
        if (a.resolved !== b.resolved)
          return RESOLVE_ORDER[a.resolved] - RESOLVE_ORDER[b.resolved];
        return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      });
  },
}));
