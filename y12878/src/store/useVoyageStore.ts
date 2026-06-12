import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Vessel,
  Voyage,
  FuelRecord,
  WeatherData,
  WeatherRaw,
  TideData,
  BuoySupplement,
  Correction,
  AuditLog,
  WaterAlert,
  DuplicateGroup,
  FuelRecordStatus
} from '@/types';
import {
  vessels as mockVessels,
  voyages as mockVoyages,
  fuelRecords as mockFuelRecords,
  weatherData as mockWeatherData,
  weatherRaws as mockWeatherRaws,
  tideData as mockTideData,
  buoySupplements as mockBuoySupplements,
  corrections as mockCorrections,
  auditLogs as mockAuditLogs,
  waterAlerts as mockWaterAlerts,
  duplicateGroups as mockDuplicateGroups
} from '@/data/mockData';

const generateId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;

const now = () => new Date().toISOString();

const adaptVoyage = (v: any): Voyage => ({
  id: v.id,
  vesselId: v.vesselId,
  startDate: v.departureTime || v.startDate,
  endDate: v.arrivalTime || v.endDate,
  route: `${v.departurePort || ''}→${v.arrivalPort || ''}` || v.route,
  startLat: v.startLat ?? 0,
  startLng: v.startLng ?? 0,
  endLat: v.endLat ?? 0,
  endLng: v.endLng ?? 0,
  departurePort: v.departurePort,
  arrivalPort: v.arrivalPort,
  voyageNo: v.voyageNo,
  totalFuel: v.totalFuel,
  totalDistance: v.totalDistance
});

const adaptFuelRecord = (r: any): FuelRecord => ({
  id: r.id,
  voyageId: r.voyageId,
  timestamp: r.timestamp,
  fuelConsumption: r.fuelConsumption,
  expectedFuel: r.expectedFuel ?? r.fuelConsumption * 0.95,
  speed: r.speed,
  source: r.source ?? '船载终端',
  status: (r.status === 'normal' ? 'approved' : r.status) as FuelRecordStatus,
  lat: r.lat ?? r.latitude ?? 0,
  lng: r.lng ?? r.longitude ?? 0,
  hasCorrection: r.hasCorrection ?? false
});

const adaptWeatherData = (w: any): WeatherData => ({
  id: w.id,
  fuelRecordId: w.fuelRecordId ?? w.rawId ?? '',
  timestamp: w.timestamp ?? '',
  windSpeed: w.windSpeed,
  windDirection: w.windDirection,
  waveHeight: w.waveHeight,
  temperature: w.temperature,
  remark: w.remark ?? '',
  isNullFilled: w.isNullFilled ?? false,
  nullFillSource: w.nullFillSource ?? (w.nullFilledFields?.join(',') || ''),
  isDuplicateRemoved: w.isDuplicateRemoved ?? false,
  parsedFromRemark: w.parsedFromRemark ?? w.isRemarkParsed ?? false
});

const adaptWeatherRaw = (w: any): WeatherRaw => ({
  timestamp: w.timestamp,
  windSpeed: w.windSpeed,
  windDirection: w.windDirection ?? '',
  waveHeight: w.waveHeight,
  temperature: w.temperature,
  remark: w.remark ?? ''
});

const adaptTideData = (t: any): TideData => ({
  id: t.id,
  fuelRecordId: t.fuelRecordId ?? '',
  tideLevel: t.tideLevel,
  timezone: t.timezone,
  hasTimezoneError: t.hasTimezoneError ?? false,
  correctedTideLevel: t.correctedTideLevel ?? undefined
});

const adaptBuoySupplement = (b: any): BuoySupplement => ({
  id: b.id,
  voyageId: b.voyageId ?? '',
  supplementTime: b.supplementTime,
  operator: b.operator ?? b.recordedBy ?? '',
  originalRemark: b.originalRemark ?? b.remark ?? '',
  fuelRecordId: b.fuelRecordId
});

const adaptCorrection = (c: any): Correction => ({
  id: c.id,
  recordId: c.recordId ?? c.targetId ?? '',
  operator: c.operator ?? c.createdBy ?? '',
  operateTime: c.operateTime ?? c.createdAt ?? now(),
  beforeValue: c.beforeValue ?? Number(c.oldValue ?? 0),
  afterValue: c.afterValue ?? Number(c.newValue ?? 0),
  reason: c.reason,
  fromStatus: (c.fromStatus ?? 'pending') as FuelRecordStatus,
  toStatus: (c.toStatus ?? c.status ?? 'approved') as FuelRecordStatus
});

const adaptAuditLog = (a: any): AuditLog => ({
  id: a.id,
  recordId: a.recordId ?? a.targetId ?? '',
  action: a.action ?? a.actionType ?? '',
  operator: a.operator,
  timestamp: a.timestamp ?? a.actionTime ?? now(),
  detail: typeof a.detail === 'string' ? a.detail : JSON.stringify(a.detail)
});

const adaptWaterAlert = (w: any): WaterAlert => ({
  id: w.id,
  voyageId: w.voyageId ?? (w.relatedVoyageIds?.[0] ?? ''),
  alertType: w.alertType ?? w.indicator ?? '',
  severity: w.severity,
  alertDate: w.alertDate ?? w.alertTime ?? '',
  description: w.description,
  affectedFuelRecords: w.affectedFuelRecords ?? []
});

const adaptDuplicateGroup = (d: any): DuplicateGroup => ({
  groupId: d.groupId ?? d.id ?? '',
  records: d.records ?? d.recordIds ?? [],
  confidence: d.confidence ?? 0.95,
  conflictingFields: d.conflictingFields ?? [],
  resolved: d.resolved,
  chosenRecordId: d.chosenRecordId
});

const initialVessels: Vessel[] = mockVessels as Vessel[];
const initialVoyages: Voyage[] = mockVoyages.map(adaptVoyage);
const initialFuelRecords: FuelRecord[] = mockFuelRecords.map(adaptFuelRecord);
const initialWeatherData: WeatherData[] = mockWeatherData.map(adaptWeatherData);
const initialWeatherRaws: WeatherRaw[] = mockWeatherRaws.map(adaptWeatherRaw);
const initialTideData: TideData[] = mockTideData.map(adaptTideData);
const initialBuoySupplements: BuoySupplement[] = mockBuoySupplements.map(adaptBuoySupplement);
const initialCorrections: Correction[] = mockCorrections.map(adaptCorrection);
const initialAuditLogs: AuditLog[] = mockAuditLogs.map(adaptAuditLog);
const initialWaterAlerts: WaterAlert[] = mockWaterAlerts.map(adaptWaterAlert);
const initialDuplicateGroups: DuplicateGroup[] = mockDuplicateGroups.map(adaptDuplicateGroup);

interface VoyageState {
  vessels: Vessel[];
  voyages: Voyage[];
  fuelRecords: FuelRecord[];
  weatherData: WeatherData[];
  weatherRaws: WeatherRaw[];
  tideData: TideData[];
  buoySupplements: BuoySupplement[];
  corrections: Correction[];
  auditLogs: AuditLog[];
  waterAlerts: WaterAlert[];
  duplicateGroups: DuplicateGroup[];
  selectedVesselId: string | null;
  selectedDate: string;
  currentRecordId: string | null;

  selectVessel: (vesselId: string) => void;
  selectDate: (date: string) => void;
  selectRecord: (recordId: string) => void;
  approveRecord: (recordId: string, reason: string) => void;
  rejectRecord: (recordId: string, reason: string) => void;
  correctFuelValue: (recordId: string, newValue: number, reason: string, operator: string) => void;
  resolveDuplicate: (groupId: string, chosenRecordId: string) => void;
  addAuditLog: (recordId: string, action: string, detail: any, operator: string) => void;

  getVoyageByVesselAndDate: (vesselId: string, date: string) => Voyage | undefined;
  getFuelRecordsByVoyage: (voyageId: string) => FuelRecord[];
  getWeatherByFuelRecord: (recordId: string) => WeatherData | undefined;
  getTideByFuelRecord: (recordId: string) => TideData | undefined;
  getCorrectionsByRecord: (recordId: string) => Correction[];
  getAuditLogsByRecord: (recordId: string) => AuditLog[];
  getTimezoneErrorRecord: () => TideData | undefined;
  getPendingRecords: () => FuelRecord[];
  getPendingDuplicates: () => DuplicateGroup[];
  getLatestFuelRecordByVessel: (vesselId: string) => FuelRecord | undefined;
  getVoyagesByVessel: (vesselId: string) => Voyage[];
  getPendingCorrectionsCount: () => number;
  getUnresolvedDuplicatesCount: () => number;
  getPendingWaterAlertsCount: () => number;
}

export const useVoyageStore = create<VoyageState>()(
  persist(
    (set, get) => ({
      vessels: initialVessels,
      voyages: initialVoyages,
      fuelRecords: initialFuelRecords,
      weatherData: initialWeatherData,
      weatherRaws: initialWeatherRaws,
      tideData: initialTideData,
      buoySupplements: initialBuoySupplements,
      corrections: initialCorrections,
      auditLogs: initialAuditLogs,
      waterAlerts: initialWaterAlerts,
      duplicateGroups: initialDuplicateGroups,
      selectedVesselId: initialVessels[0]?.id ?? null,
      selectedDate: new Date().toISOString().slice(0, 10),
      currentRecordId: null,

      selectVessel: (vesselId: string) => {
        set({ selectedVesselId: vesselId });
      },

      selectDate: (date: string) => {
        set({ selectedDate: date });
      },

      selectRecord: (recordId: string) => {
        set({ currentRecordId: recordId });
      },

      approveRecord: (recordId: string, reason: string) => {
        const state = get();
        const record = state.fuelRecords.find((r) => r.id === recordId);
        if (!record) return;

        const correction: Correction = {
          id: generateId('corr'),
          recordId,
          operator: '当前操作员',
          operateTime: now(),
          beforeValue: record.fuelConsumption,
          afterValue: record.fuelConsumption,
          reason,
          fromStatus: record.status,
          toStatus: 'approved'
        };

        const auditLog: AuditLog = {
          id: generateId('audit'),
          recordId,
          action: 'approve',
          operator: '当前操作员',
          timestamp: now(),
          detail: reason
        };

        set({
          fuelRecords: state.fuelRecords.map((r) =>
            r.id === recordId ? { ...r, status: 'approved' as FuelRecordStatus } : r
          ),
          corrections: [...state.corrections, correction],
          auditLogs: [...state.auditLogs, auditLog]
        });
      },

      rejectRecord: (recordId: string, reason: string) => {
        const state = get();
        const record = state.fuelRecords.find((r) => r.id === recordId);
        if (!record) return;

        const auditLog: AuditLog = {
          id: generateId('audit'),
          recordId,
          action: 'reject',
          operator: '当前操作员',
          timestamp: now(),
          detail: reason
        };

        set({
          fuelRecords: state.fuelRecords.map((r) =>
            r.id === recordId ? { ...r, status: 'rejected' as FuelRecordStatus } : r
          ),
          auditLogs: [...state.auditLogs, auditLog]
        });
      },

      correctFuelValue: (recordId: string, newValue: number, reason: string, operator: string) => {
        const state = get();
        const record = state.fuelRecords.find((r) => r.id === recordId);
        if (!record) return;

        const correction: Correction = {
          id: generateId('corr'),
          recordId,
          operator,
          operateTime: now(),
          beforeValue: record.fuelConsumption,
          afterValue: newValue,
          reason,
          fromStatus: record.status,
          toStatus: record.status
        };

        const auditLog: AuditLog = {
          id: generateId('audit'),
          recordId,
          action: 'correct',
          operator,
          timestamp: now(),
          detail: `${record.fuelConsumption} → ${newValue}, 原因: ${reason}`
        };

        set({
          fuelRecords: state.fuelRecords.map((r) =>
            r.id === recordId ? { ...r, fuelConsumption: newValue, hasCorrection: true } : r
          ),
          corrections: [...state.corrections, correction],
          auditLogs: [...state.auditLogs, auditLog]
        });
      },

      resolveDuplicate: (groupId: string, chosenRecordId: string) => {
        const state = get();
        const group = state.duplicateGroups.find((g) => g.groupId === groupId);
        if (!group) return;

        const auditLog: AuditLog = {
          id: generateId('audit'),
          recordId: chosenRecordId,
          action: 'resolveDuplicate',
          operator: '当前操作员',
          timestamp: now(),
          detail: `解决重复组 ${groupId}，保留记录 ${chosenRecordId}`
        };

        set({
          duplicateGroups: state.duplicateGroups.map((g) =>
            g.groupId === groupId ? { ...g, resolved: true, chosenRecordId } : g
          ),
          auditLogs: [...state.auditLogs, auditLog]
        });
      },

      addAuditLog: (recordId: string, action: string, detail: any, operator: string) => {
        const state = get();
        const auditLog: AuditLog = {
          id: generateId('audit'),
          recordId,
          action,
          operator,
          timestamp: now(),
          detail: typeof detail === 'string' ? detail : JSON.stringify(detail)
        };
        set({ auditLogs: [...state.auditLogs, auditLog] });
      },

      getVoyageByVesselAndDate: (vesselId: string, date: string) => {
        const state = get();
        return state.voyages.find((v) => {
          if (v.vesselId !== vesselId) return false;
          const start = new Date(v.startDate).toISOString().slice(0, 10);
          const end = new Date(v.endDate).toISOString().slice(0, 10);
          return date >= start && date <= end;
        });
      },

      getFuelRecordsByVoyage: (voyageId: string) => {
        const state = get();
        return state.fuelRecords.filter((r) => r.voyageId === voyageId);
      },

      getWeatherByFuelRecord: (recordId: string) => {
        const state = get();
        return state.weatherData.find((w) => w.fuelRecordId === recordId);
      },

      getTideByFuelRecord: (recordId: string) => {
        const state = get();
        return state.tideData.find((t) => t.fuelRecordId === recordId);
      },

      getCorrectionsByRecord: (recordId: string) => {
        const state = get();
        return state.corrections.filter((c) => c.recordId === recordId);
      },

      getAuditLogsByRecord: (recordId: string) => {
        const state = get();
        return state.auditLogs.filter((a) => a.recordId === recordId);
      },

      getTimezoneErrorRecord: () => {
        const state = get();
        return state.tideData.find((t) => t.hasTimezoneError);
      },

      getPendingRecords: () => {
        const state = get();
        return state.fuelRecords.filter((r) => r.status === 'pending');
      },

      getPendingDuplicates: () => {
        const state = get();
        return state.duplicateGroups.filter((g) => !g.resolved);
      },

      getLatestFuelRecordByVessel: (vesselId: string) => {
        const state = get();
        const vesselVoyages = state.voyages.filter((v) => v.vesselId === vesselId);
        const vesselVoyageIds = new Set(vesselVoyages.map((v) => v.id));
        const vesselFuelRecords = state.fuelRecords.filter((r) => vesselVoyageIds.has(r.voyageId));
        if (vesselFuelRecords.length === 0) return undefined;
        return vesselFuelRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      },

      getVoyagesByVessel: (vesselId: string) => {
        const state = get();
        return state.voyages.filter((v) => v.vesselId === vesselId);
      },

      getPendingCorrectionsCount: () => {
        const state = get();
        const correctionsCount = state.corrections.filter((c) => c.toStatus !== 'approved').length;
        const pendingRecordsCount = state.fuelRecords.filter((r) => r.status === 'pending').length;
        return correctionsCount + pendingRecordsCount;
      },

      getUnresolvedDuplicatesCount: () => {
        const state = get();
        return state.duplicateGroups.filter((g) => !g.resolved).length;
      },

      getPendingWaterAlertsCount: () => {
        const state = get();
        return state.waterAlerts.filter((w) => w.severity === 'high' || w.severity === 'critical').length;
      }
    }),
    {
      name: 'voyage-store',
      partialize: (state) => ({
        corrections: state.corrections,
        auditLogs: state.auditLogs
      })
    }
  )
);
