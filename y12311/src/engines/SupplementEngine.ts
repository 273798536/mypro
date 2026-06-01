import { create } from 'zustand';
import {
  DataSupplement,
  ServiceRecord,
  Appointment,
  SUPPLEMENT_TRACKED_FIELDS,
} from '../types';

const generateId = () => Math.random().toString(36).substring(2, 11);

interface SupplementStore {
  supplements: DataSupplement[];
  setSupplements: (supplements: DataSupplement[]) => void;
  addSupplement: (supplement: DataSupplement) => void;
  getSupplementsByRecordId: (recordId: string) => DataSupplement[];
  getAffectedRecordIds: (supplementId: string) => string[];
  hasSupplements: (recordId: string) => boolean;
}

export const useSupplementStore = create<SupplementStore>((set, get) => ({
  supplements: [],

  setSupplements: (supplements) => set({ supplements }),

  addSupplement: (supplement) => set((state) => ({
    supplements: [...state.supplements, supplement],
  })),

  getSupplementsByRecordId: (recordId) =>
    get().supplements.filter((s) => s.recordId === recordId),

  getAffectedRecordIds: (supplementId) => {
    const supplement = get().supplements.find((s) => s.id === supplementId);
    return supplement?.affectedRecords || [];
  },

  hasSupplements: (recordId) =>
    get().supplements.some((s) => s.recordId === recordId || s.affectedRecords.includes(recordId)),
}));

export class SupplementEngine {
  private originalSnapshots: Map<string, Record<string, any>> = new Map();

  recordSupplement(
    recordId: string,
    fieldName: string,
    oldValue: any,
    newValue: any,
    operator: string,
    affectedRecords: string[] = [recordId]
  ): DataSupplement | null {
    if (!SUPPLEMENT_TRACKED_FIELDS.includes(fieldName as typeof SUPPLEMENT_TRACKED_FIELDS[number])) {
      return null;
    }

    if (oldValue === newValue) {
      return null;
    }

    const supplement: DataSupplement = {
      id: generateId(),
      recordId,
      fieldName,
      oldValue: String(oldValue),
      newValue: String(newValue),
      supplementTime: new Date(),
      operator,
      affectedRecords,
    };

    useSupplementStore.getState().addSupplement(supplement);

    return supplement;
  }

  preserveOriginalJudgment(recordId: string, record: ServiceRecord | Appointment): void {
    if (this.originalSnapshots.has(recordId)) {
      return;
    }

    const snapshot = this.createSnapshot(record);
    this.originalSnapshots.set(recordId, snapshot);
  }

  getOriginalJudgment(recordId: string): string | null {
    const snapshot = this.originalSnapshots.get(recordId);
    if (!snapshot) return null;

    return this.formatJudgment(snapshot);
  }

  getAffectedRecords(supplementId: string): string[] {
    return useSupplementStore.getState().getAffectedRecordIds(supplementId);
  }

  isAffectedBySupplement(recordId: string, supplementId: string): boolean {
    const affectedRecords = this.getAffectedRecords(supplementId);
    return affectedRecords.includes(recordId);
  }

  getSupplementsForRecord(recordId: string): DataSupplement[] {
    return useSupplementStore.getState().getSupplementsByRecordId(recordId);
  }

  hasSupplementHistory(recordId: string): boolean {
    return useSupplementStore.getState().hasSupplements(recordId);
  }

  getSupplementFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      appointment_no: '预约号',
      service_duration: '服务时长',
      end_time: '结束时间',
      window_id: '窗口编号',
    };
    return labels[fieldName] || fieldName;
  }

  calculateSupplementImpact(
    supplement: DataSupplement,
    records: ServiceRecord[],
    appointments: Appointment[]
  ): {
    affectedCount: number;
    judgmentChanges: string[];
  } {
    const affectedCount = supplement.affectedRecords.length;
    const judgmentChanges: string[] = [];

    supplement.affectedRecords.forEach((recordId) => {
      const originalJudgment = this.getOriginalJudgment(recordId);
      if (originalJudgment) {
        const record = records.find((r) => r.id === recordId) || appointments.find((a) => a.id === recordId);
        if (record) {
          const currentJudgment = this.formatJudgment(this.createSnapshot(record));
          if (originalJudgment !== currentJudgment) {
            judgmentChanges.push(`记录${recordId}："${originalJudgment}" → "${currentJudgment}"`);
          }
        }
      }
    });

    return { affectedCount, judgmentChanges };
  }

  findSupplementChain(recordId: string): DataSupplement[] {
    const chain: DataSupplement[] = [];
    const visited = new Set<string>();
    const supplements = useSupplementStore.getState().supplements;

    const findRelated = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const directSupplements = supplements.filter((s) => s.recordId === id || s.affectedRecords.includes(id));
      directSupplements.forEach((s) => {
        if (!chain.includes(s)) {
          chain.push(s);
          s.affectedRecords.forEach((rid) => findRelated(rid));
        }
      });
    };

    findRelated(recordId);
    return chain.sort((a, b) => a.supplementTime.getTime() - b.supplementTime.getTime());
  }

  private createSnapshot(record: ServiceRecord | Appointment): Record<string, any> {
    if ('serviceDuration' in record) {
      return {
        serviceDuration: record.serviceDuration,
        startTime: record.startTime,
        endTime: record.endTime,
        windowId: record.windowId,
        businessType: record.businessType,
        hasException: record.hasException,
      };
    } else {
      return {
        appointmentNo: record.appointmentNo,
        appointmentTime: record.appointmentTime,
        businessType: record.businessType,
        status: record.status,
      };
    }
  }

  private formatJudgment(snapshot: Record<string, any>): string {
    if (snapshot.serviceDuration !== undefined) {
      return `服务时长${snapshot.serviceDuration}分钟，窗口${snapshot.windowId}，${snapshot.hasException ? '存在异常' : '正常'}`;
    } else {
      const hasAppointment = snapshot.appointmentNo && snapshot.appointmentNo !== '';
      return hasAppointment ? `预约号${snapshot.appointmentNo}，状态${snapshot.status}` : '无预约号，视为现场取号';
    }
  }
}

export const supplementEngine = new SupplementEngine();
