import { getStore, saveStore } from '../db/database';
import { generateId } from '../utils/helpers';
import { AuditLogEntry, RunContext, RunStatus } from '../types';

export function createRun(context: Omit<RunContext, 'runId' | 'timestamp'> & { timestamp?: number }): RunContext {
  const store = getStore();
  const runId = generateId('run');
  const timestamp = context.timestamp ?? Date.now();

  const newRun = {
    ...context,
    runId,
    timestamp,
    status: 'PENDING' as RunStatus,
  };

  store.runs.push(newRun);
  saveStore();

  writeAuditLog({
    entityType: 'RUN',
    entityId: runId,
    action: 'CREATE',
    operator: context.operator,
    note: context.description ?? `创建运行: ${context.source}`,
    runId,
    afterState: { status: 'PENDING', ...context },
  });

  return { ...context, runId, timestamp };
}

export function updateRunStatus(runId: string, status: RunStatus, operator: string): void {
  const store = getStore();
  const run = store.runs.find((r) => r.runId === runId);
  const before = run ? { status: run.status } : undefined;

  if (run) {
    run.status = status;
    saveStore();
  }

  writeAuditLog({
    entityType: 'RUN',
    entityId: runId,
    action: 'UPDATE',
    operator,
    runId,
    beforeState: before,
    afterState: { status },
    note: `运行状态更新为 ${status}`,
  });
}

export function getRun(runId: string): (RunContext & { status: RunStatus }) | null {
  const store = getStore();
  const run = store.runs.find((r) => r.runId === runId);
  return run ?? null;
}

export function listRuns(limit = 50): (RunContext & { status: RunStatus })[] {
  const store = getStore();
  return [...store.runs]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export function writeAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'> & { timestamp?: number }): string {
  const store = getStore();
  const id = generateId('audit');
  const timestamp = entry.timestamp ?? Date.now();

  const newEntry: AuditLogEntry = {
    id,
    runId: entry.runId,
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    operator: entry.operator,
    beforeState: entry.beforeState,
    afterState: entry.afterState,
    note: entry.note,
    timestamp,
  };

  store.auditLogs.push(newEntry);
  saveStore();

  return id;
}

export function getAuditLogs(runId: string, entityType?: string): AuditLogEntry[] {
  const store = getStore();
  let logs = store.auditLogs.filter((log) => log.runId === runId);

  if (entityType) {
    logs = logs.filter((log) => log.entityType === entityType);
  }

  return logs.sort((a, b) => a.timestamp - b.timestamp);
}
