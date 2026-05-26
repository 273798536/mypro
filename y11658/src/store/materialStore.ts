import { create } from "zustand";
import type {
  Coil,
  MergeStrategy,
  Rail,
  Report,
  Spreader,
  Task,
  Zone,
} from "@/types";
import {
  SEED_COILS,
  SEED_RAILS,
  SEED_SPREADERS,
  SEED_TASKS,
  SEED_ZONES,
} from "@/data/seed";
import { readKey, writeKey } from "@/utils/storage";
import {
  mergeCoils,
  mergeRails,
  mergeReports,
  mergeSpreaders,
  mergeTasks,
  mergeZones,
} from "@/utils/merge";

type MaterialStore = {
  coils: Coil[];
  spreaders: Spreader[];
  rails: Rail[];
  zones: Zone[];
  tasks: Task[];
  reports: Report[];
  selectedTaskId: string | null;

  ensureSeed: () => void;
  setSelectedTaskId: (id: string | null) => void;

  importCoils: (
    incoming: Coil[],
    strategy: MergeStrategy,
    source: string,
    operator?: string,
  ) => void;
  importSpreaders: (
    incoming: Spreader[],
    strategy: MergeStrategy,
    source: string,
    operator?: string,
  ) => void;
  importRails: (
    incoming: Rail[],
    strategy: MergeStrategy,
    source: string,
    operator?: string,
  ) => void;
  importZones: (
    incoming: Zone[],
    strategy: MergeStrategy,
    source: string,
    operator?: string,
  ) => void;
  importTasks: (
    incoming: Task[],
    strategy: MergeStrategy,
    source: string,
    operator?: string,
  ) => void;

  addTask: (task: Task) => void;
  saveReport: (report: Report) => void;
};

const LS_COILS = "coils";
const LS_SPREADERS = "spreaders";
const LS_RAILS = "rails";
const LS_ZONES = "zones";
const LS_TASKS = "tasks";
const LS_REPORTS = "reports";
const LS_SELECTED_TASK = "selectedTaskId";

export const useMaterialStore = create<MaterialStore>((set, get) => ({
  coils: [],
  spreaders: [],
  rails: [],
  zones: [],
  tasks: [],
  reports: [],
  selectedTaskId: null,

  ensureSeed: () => {
    const c = readKey<Coil[]>(LS_COILS, []);
    const s = readKey<Spreader[]>(LS_SPREADERS, []);
    const r = readKey<Rail[]>(LS_RAILS, []);
    const z = readKey<Zone[]>(LS_ZONES, []);
    const t = readKey<Task[]>(LS_TASKS, []);
    const rp = readKey<Report[]>(LS_REPORTS, []);
    const sel = readKey<string | null>(LS_SELECTED_TASK, null);
    set({
      coils: c.length ? c : SEED_COILS,
      spreaders: s.length ? s : SEED_SPREADERS,
      rails: r.length ? r : SEED_RAILS,
      zones: z.length ? z : SEED_ZONES,
      tasks: t.length ? t : SEED_TASKS,
      reports: rp,
      selectedTaskId: sel,
    });
    if (!c.length) writeKey(LS_COILS, get().coils);
    if (!s.length) writeKey(LS_SPREADERS, get().spreaders);
    if (!r.length) writeKey(LS_RAILS, get().rails);
    if (!z.length) writeKey(LS_ZONES, get().zones);
    if (!t.length) writeKey(LS_TASKS, get().tasks);
  },

  setSelectedTaskId: (id) => {
    set({ selectedTaskId: id });
    writeKey(LS_SELECTED_TASK, id);
  },

  importCoils: (incoming, strategy, source, operator = "trainer") => {
    const merged = mergeCoils(get().coils, incoming, strategy, source, operator);
    set({ coils: merged });
    writeKey(LS_COILS, merged);
  },
  importSpreaders: (incoming, strategy, source, operator = "trainer") => {
    const merged = mergeSpreaders(
      get().spreaders,
      incoming,
      strategy,
      source,
      operator,
    );
    set({ spreaders: merged });
    writeKey(LS_SPREADERS, merged);
  },
  importRails: (incoming, strategy, source, operator = "trainer") => {
    const merged = mergeRails(get().rails, incoming, strategy, source, operator);
    set({ rails: merged });
    writeKey(LS_RAILS, merged);
  },
  importZones: (incoming, strategy, source, operator = "trainer") => {
    const merged = mergeZones(get().zones, incoming, strategy, source, operator);
    set({ zones: merged });
    writeKey(LS_ZONES, merged);
  },
  importTasks: (incoming, strategy, source, operator = "trainer") => {
    const merged = mergeTasks(get().tasks, incoming, strategy, source, operator);
    set({ tasks: merged });
    writeKey(LS_TASKS, merged);
  },

  addTask: (task) => {
    const tasks = [...get().tasks, task];
    set({ tasks, selectedTaskId: task.id });
    writeKey(LS_TASKS, tasks);
    writeKey(LS_SELECTED_TASK, task.id);
  },

  saveReport: (report) => {
    const reports = mergeReports(get().reports, [report], "overwrite");
    set({ reports });
    writeKey(LS_REPORTS, reports);
  },
}));
