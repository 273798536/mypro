import { create } from 'zustand';
import { Alarm } from '../types';
import { mockAlarms } from '../data/mockData';

interface AlarmStore {
  alarms: Alarm[];
  selectedAlarm: Alarm | null;

  setAlarms: (alarms: Alarm[]) => void;
  setSelectedAlarm: (alarm: Alarm | null) => void;
  getAlarmById: (id: string) => Alarm | undefined;
  getAlarmsByLevel: (level: Alarm['level']) => Alarm[];
  getAlarmsByRelatedObject: (objectId: string) => Alarm[];
}

export const useAlarmStore = create<AlarmStore>((set, get) => ({
  alarms: mockAlarms,
  selectedAlarm: null,

  setAlarms: (alarms) => set({ alarms }),
  setSelectedAlarm: (alarm) => set({ selectedAlarm: alarm }),

  getAlarmById: (id) => get().alarms.find((a) => a.id === id),

  getAlarmsByLevel: (level) =>
    get().alarms.filter((a) => a.level === level),

  getAlarmsByRelatedObject: (objectId) =>
    get().alarms.filter((a) =>
      a.clues.some((c) => c.relatedId === objectId) || a.relatedObjectId === objectId
    ),
}));
