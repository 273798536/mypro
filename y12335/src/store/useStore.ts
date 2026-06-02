import { create } from 'zustand';
import type {
  Volunteer,
  Position,
  Shift,
  Skill,
  LeaveRecord,
  Assignment,
  Anomaly,
  ConstraintNode,
  AssignmentResult,
  AlgorithmMode,
  FilterState,
  Correction,
  AnomalyType,
  ImportLog,
  DataSource,
} from '@/types';
import { SKILLS, VOLUNTEERS, POSITIONS, SHIFTS, LEAVE_RECORDS, TIME_SLOTS } from '@/data/mockData';
import { runAssignment } from '@/algo/networkFlow';

interface AppState {
  skills: Skill[];
  volunteers: Volunteer[];
  positions: Position[];
  shifts: Shift[];
  leaveRecords: LeaveRecord[];
  importLogs: ImportLog[];
  filter: FilterState;
  algorithmMode: AlgorithmMode;
  currentResult: AssignmentResult | null;
  previousResult: AssignmentResult | null;
  corrections: Correction[];
  selectedAssignmentId: string | null;
  constraintDrawerOpen: boolean;

  setFilter: (filter: Partial<FilterState>) => void;
  setAlgorithmMode: (mode: AlgorithmMode) => void;
  runAssignmentAlgorithm: () => void;
  updateVolunteerSkill: (volunteerId: string, skillIds: string[]) => void;
  setSelectedAssignment: (id: string | null) => void;
  setConstraintDrawerOpen: (open: boolean) => void;
  resetPreviousResult: () => void;

  importVolunteers: (csvText: string, filename: string) => ImportLog;
  importSkills: (csvText: string, filename: string) => ImportLog;
  importLeaveRecords: (csvText: string, filename: string) => ImportLog;
  addVolunteer: (name: string, skillIds: string[]) => void;
  addLeaveRecord: (volunteerId: string, timeSlot: string, reason: string) => void;

  getVolunteerById: (id: string) => Volunteer | undefined;
  getPositionById: (id: string) => Position | undefined;
  getShiftById: (id: string) => Shift | undefined;
  getSkillById: (id: string) => Skill | undefined;
  getLeaveRecordsForVolunteer: (volunteerId: string) => LeaveRecord[];
  getFilteredVolunteers: () => Volunteer[];
  getFilteredAssignments: () => Assignment[];
  getFilteredAnomalies: () => Anomaly[];
}

function parseCSV(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/);
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

export const useStore = create<AppState>((set, get) => ({
  skills: [...SKILLS],
  volunteers: VOLUNTEERS.map(v => ({ ...v, skillIds: [...v.skillIds], leaveSlots: [...v.leaveSlots] })),
  positions: POSITIONS.map(p => ({ ...p, requiredSkillIds: [...p.requiredSkillIds] })),
  shifts: [...SHIFTS],
  leaveRecords: [...LEAVE_RECORDS],
  importLogs: [],
  filter: {
    skillIds: [],
    timeSlot: null,
    anomalyTypes: [],
    searchQuery: '',
  },
  algorithmMode: 'min_cost_max_flow',
  currentResult: null,
  previousResult: null,
  corrections: [],
  selectedAssignmentId: null,
  constraintDrawerOpen: false,

  setFilter: (partial) =>
    set((state) => ({ filter: { ...state.filter, ...partial } })),

  setAlgorithmMode: (mode) => set({ algorithmMode: mode }),

  runAssignmentAlgorithm: () => {
    const state = get();
    const result = runAssignment(
      state.volunteers,
      state.positions,
      state.shifts,
      state.skills,
      state.leaveRecords,
      state.algorithmMode
    );
    set((state) => ({
      currentResult: result,
      previousResult: state.currentResult ? { ...state.currentResult } : null,
    }));
  },

  updateVolunteerSkill: (volunteerId, skillIds) => {
    const state = get();
    const volunteer = state.volunteers.find(v => v.id === volunteerId);
    if (!volunteer) return;

    const oldSkillNames = volunteer.skillIds.map(sid => state.getSkillById(sid)?.name || sid).join('、');
    const newSkillNames = skillIds.map(sid => state.getSkillById(sid)?.name || sid).join('、');

    const correction: Correction = {
      id: `cor_${Date.now()}`,
      volunteerId,
      field: 'skillIds',
      oldValue: oldSkillNames,
      newValue: newSkillNames,
      timestamp: new Date().toLocaleString('zh-CN'),
    };

    set((state) => ({
      volunteers: state.volunteers.map(v =>
        v.id === volunteerId ? { ...v, skillIds, source: { ...v.source, type: 'manual', manualEditTimestamp: new Date().toLocaleString('zh-CN') } } : v
      ),
      corrections: [...state.corrections, correction],
    }));

    get().runAssignmentAlgorithm();
  },

  setSelectedAssignment: (id) => set({ selectedAssignmentId: id, constraintDrawerOpen: id !== null }),
  setConstraintDrawerOpen: (open) => set({ constraintDrawerOpen: open }),
  resetPreviousResult: () => set({ previousResult: null }),

  importVolunteers: (csvText, filename) => {
    const rows = parseCSV(csvText);
    const errors: string[] = [];
    let successCount = 0;
    const newVolunteers: Volunteer[] = [];
    const timestamp = new Date().toLocaleString('zh-CN');
    const skillMap = new Map(get().skills.map(s => [s.name.toLowerCase(), s.id]));

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 2 || !row[0]) continue;

      try {
        const name = row[0].trim();
        const skillNames = row[1] ? row[1].split(/[，,、;；]/).map(s => s.trim().toLowerCase()).filter(Boolean) : [];
        const skillIds = skillNames.map(n => skillMap.get(n)).filter(Boolean) as string[];
        const leaveSlotNames = row[2] ? row[2].split(/[，,、;；]/).map(s => s.trim()).filter(Boolean) : [];
        const leaveSlots = leaveSlotNames.map(ls => {
          const ts = TIME_SLOTS.find(t => t.label === ls);
          return ts?.id || ls;
        });

        const source: DataSource = {
          type: 'import',
          filename,
          importTimestamp: timestamp,
          rowIndex: i,
        };

        newVolunteers.push({
          id: `v_import_${Date.now()}_${i}`,
          name,
          skillIds,
          leaveSlots,
          source,
        });
        successCount++;
      } catch (e) {
        errors.push(`第 ${i + 1} 行: ${e instanceof Error ? e.message : '解析错误'}`);
      }
    }

    const log: ImportLog = {
      id: `log_${Date.now()}`,
      filename,
      importType: 'volunteers',
      timestamp,
      recordCount: rows.length > 1 ? rows.length - 1 : 0,
      successCount,
      errorCount: errors.length,
      errors,
    };

    if (newVolunteers.length > 0) {
      set((state) => ({
        volunteers: [...state.volunteers, ...newVolunteers],
        importLogs: [log, ...state.importLogs],
      }));
    } else {
      set((state) => ({
        importLogs: [log, ...state.importLogs],
      }));
    }

    return log;
  },

  importSkills: (csvText, filename) => {
    const rows = parseCSV(csvText);
    const errors: string[] = [];
    let successCount = 0;
    const newSkills: Skill[] = [];
    const timestamp = new Date().toLocaleString('zh-CN');

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 2 || !row[0]) continue;

      try {
        const name = row[0].trim();
        const category = row[1]?.trim() || '其他';
        const existing = get().skills.find(s => s.name === name);
        if (existing) {
          errors.push(`第 ${i + 1} 行: 技能「${name}」已存在`);
          continue;
        }

        newSkills.push({
          id: `sk_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
          name,
          category,
          source: {
            type: 'import',
            filename,
            importTimestamp: timestamp,
            rowIndex: i,
          },
        });
        successCount++;
      } catch (e) {
        errors.push(`第 ${i + 1} 行: ${e instanceof Error ? e.message : '解析错误'}`);
      }
    }

    const log: ImportLog = {
      id: `log_${Date.now()}`,
      filename,
      importType: 'skills',
      timestamp,
      recordCount: rows.length > 1 ? rows.length - 1 : 0,
      successCount,
      errorCount: errors.length,
      errors,
    };

    if (newSkills.length > 0) {
      set((state) => ({
        skills: [...state.skills, ...newSkills],
        importLogs: [log, ...state.importLogs],
      }));
    } else {
      set((state) => ({
        importLogs: [log, ...state.importLogs],
      }));
    }

    return log;
  },

  importLeaveRecords: (csvText, filename) => {
    const rows = parseCSV(csvText);
    const errors: string[] = [];
    let successCount = 0;
    const newRecords: LeaveRecord[] = [];
    const timestamp = new Date().toLocaleString('zh-CN');
    const volunteerMap = new Map(get().volunteers.map(v => [v.name, v.id]));

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 3 || !row[0]) continue;

      try {
        const volunteerName = row[0].trim();
        const timeSlotLabel = row[1]?.trim() || '';
        const reason = row[2]?.trim() || '';

        const volunteerId = volunteerMap.get(volunteerName);
        if (!volunteerId) {
          errors.push(`第 ${i + 1} 行: 找不到志愿者「${volunteerName}」`);
          continue;
        }

        const ts = TIME_SLOTS.find(t => t.label === timeSlotLabel);
        if (!ts) {
          errors.push(`第 ${i + 1} 行: 无效时段「${timeSlotLabel}」`);
          continue;
        }

        newRecords.push({
          id: `lr_import_${Date.now()}_${i}`,
          volunteerId,
          timeSlot: ts.id,
          reason,
          source: {
            type: 'import',
            filename,
            importTimestamp: timestamp,
            rowIndex: i,
          },
        });
        successCount++;
      } catch (e) {
        errors.push(`第 ${i + 1} 行: ${e instanceof Error ? e.message : '解析错误'}`);
      }
    }

    const log: ImportLog = {
      id: `log_${Date.now()}`,
      filename,
      importType: 'leave',
      timestamp,
      recordCount: rows.length > 1 ? rows.length - 1 : 0,
      successCount,
      errorCount: errors.length,
      errors,
    };

    if (newRecords.length > 0) {
      const updatedVolunteerLeaveSlots: Record<string, string[]> = {};
      for (const r of newRecords) {
        if (!updatedVolunteerLeaveSlots[r.volunteerId]) {
          updatedVolunteerLeaveSlots[r.volunteerId] = [];
        }
        if (!updatedVolunteerLeaveSlots[r.volunteerId].includes(r.timeSlot)) {
          updatedVolunteerLeaveSlots[r.volunteerId].push(r.timeSlot);
        }
      }

      set((state) => ({
        leaveRecords: [...state.leaveRecords, ...newRecords],
        volunteers: state.volunteers.map(v =>
          updatedVolunteerLeaveSlots[v.id]
            ? { ...v, leaveSlots: [...new Set([...v.leaveSlots, ...updatedVolunteerLeaveSlots[v.id]])] }
            : v
        ),
        importLogs: [log, ...state.importLogs],
      }));
    } else {
      set((state) => ({
        importLogs: [log, ...state.importLogs],
      }));
    }

    return log;
  },

  addVolunteer: (name, skillIds) => {
    const source: DataSource = {
      type: 'manual',
      manualEditTimestamp: new Date().toLocaleString('zh-CN'),
    };
    set((state) => ({
      volunteers: [...state.volunteers, {
        id: `v_manual_${Date.now()}`,
        name,
        skillIds,
        leaveSlots: [],
        source,
      }],
    }));
  },

  addLeaveRecord: (volunteerId, timeSlot, reason) => {
    const source: DataSource = {
      type: 'manual',
      manualEditTimestamp: new Date().toLocaleString('zh-CN'),
    };
    set((state) => ({
      leaveRecords: [...state.leaveRecords, {
        id: `lr_manual_${Date.now()}`,
        volunteerId,
        timeSlot,
        reason,
        source,
      }],
      volunteers: state.volunteers.map(v =>
        v.id === volunteerId
          ? { ...v, leaveSlots: [...new Set([...v.leaveSlots, timeSlot])] }
          : v
      ),
    }));
  },

  getVolunteerById: (id) => get().volunteers.find(v => v.id === id),
  getPositionById: (id) => get().positions.find(p => p.id === id),
  getShiftById: (id) => get().shifts.find(s => s.id === id),
  getSkillById: (id) => get().skills.find(s => s.id === id),
  getLeaveRecordsForVolunteer: (volunteerId) => get().leaveRecords.filter(lr => lr.volunteerId === volunteerId),

  getFilteredVolunteers: () => {
    const state = get();
    let result = state.volunteers;
    if (state.filter.searchQuery) {
      const q = state.filter.searchQuery.toLowerCase();
      result = result.filter(v => v.name.toLowerCase().includes(q));
    }
    if (state.filter.skillIds.length > 0) {
      result = result.filter(v => state.filter.skillIds.some(sid => v.skillIds.includes(sid)));
    }
    if (state.filter.timeSlot) {
      result = result.filter(v => !v.leaveSlots.includes(state.filter.timeSlot!));
    }
    return result;
  },

  getFilteredAssignments: () => {
    const state = get();
    if (!state.currentResult) return [];
    let result = state.currentResult.assignments;
    if (state.filter.skillIds.length > 0) {
      result = result.filter(a => {
        const vol = state.getVolunteerById(a.volunteerId);
        return vol && state.filter.skillIds.some(sid => vol.skillIds.includes(sid));
      });
    }
    if (state.filter.timeSlot) {
      result = result.filter(a => {
        const sh = state.getShiftById(a.shiftId);
        return sh?.timeSlot === state.filter.timeSlot;
      });
    }
    if (state.filter.anomalyTypes.length > 0) {
      result = result.filter(a => a.isAnomaly && a.anomalyType && state.filter.anomalyTypes.includes(a.anomalyType));
    }
    return result;
  },

  getFilteredAnomalies: () => {
    const state = get();
    if (!state.currentResult) return [];
    let result = state.currentResult.anomalies;
    if (state.filter.anomalyTypes.length > 0) {
      result = result.filter(a => state.filter.anomalyTypes.includes(a.type));
    }
    if (state.filter.timeSlot) {
      result = result.filter(a => {
        if (a.shiftId) {
          const sh = state.getShiftById(a.shiftId);
          return sh?.timeSlot === state.filter.timeSlot;
        }
        return true;
      });
    }
    return result;
  },
}));
