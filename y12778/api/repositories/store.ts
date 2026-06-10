import type {
  Reagent,
  Calculation,
  AuditLog,
  BatchInfo,
  TraceLink,
} from '../../shared/types';
import {
  initialReagents,
  initialCalculations,
  initialAuditLogs,
  initialBatches,
} from '../data/mockData';

class DataStore {
  private reagents: Reagent[] = [...initialReagents];
  private calculations: Calculation[] = [...initialCalculations];
  private auditLogs: AuditLog[] = [...initialAuditLogs];
  private batches: BatchInfo[] = [...initialBatches];

  getReagents(): Reagent[] {
    return [...this.reagents];
  }

  getReagentById(id: string): Reagent | undefined {
    return this.reagents.find((r) => r.id === id);
  }

  getReagentByBatchNo(batchNo: string): Reagent | undefined {
    return this.reagents.find(
      (r) => r.batchNo === batchNo && r.status === 'active'
    );
  }

  addReagent(reagent: Reagent): Reagent {
    this.reagents.push(reagent);
    return reagent;
  }

  updateReagent(id: string, updates: Partial<Reagent>): Reagent | undefined {
    const idx = this.reagents.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    this.reagents[idx] = { ...this.reagents[idx], ...updates };
    return this.reagents[idx];
  }

  supersededReagent(oldId: string, newReagent: Reagent): Reagent {
    const idx = this.reagents.findIndex((r) => r.id === oldId);
    if (idx !== -1) {
      this.reagents[idx] = {
        ...this.reagents[idx],
        status: 'superseded',
        supersededById: newReagent.id,
      };
    }
    this.reagents.push(newReagent);
    return newReagent;
  }

  getCalculations(): Calculation[] {
    return [...this.calculations].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getCalculationById(id: string): Calculation | undefined {
    return this.calculations.find((c) => c.id === id);
  }

  addCalculation(calc: Calculation): Calculation {
    this.calculations.push(calc);
    return calc;
  }

  updateCalculation(
    id: string,
    updates: Partial<Calculation>
  ): Calculation | undefined {
    const idx = this.calculations.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.calculations[idx] = { ...this.calculations[idx], ...updates };
    return this.calculations[idx];
  }

  getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  getAuditLogsByEntity(
    entityType: AuditLog['entityType'],
    entityId: string
  ): AuditLog[] {
    return this.auditLogs.filter(
      (l) => l.entityType === entityType && l.entityId === entityId
    );
  }

  addAuditLog(log: AuditLog): AuditLog {
    this.auditLogs.push(log);
    return log;
  }

  getBatches(): BatchInfo[] {
    return [...this.batches];
  }

  getBatchByNo(batchNo: string): BatchInfo | undefined {
    return this.batches.find((b) => b.batchNo === batchNo);
  }

  updateBatch(batchNo: string, updates: Partial<BatchInfo>): BatchInfo | undefined {
    const idx = this.batches.findIndex((b) => b.batchNo === batchNo);
    if (idx === -1) return undefined;
    this.batches[idx] = { ...this.batches[idx], ...updates };
    return this.batches[idx];
  }
}

export const dataStore = new DataStore();

export type { TraceLink };
