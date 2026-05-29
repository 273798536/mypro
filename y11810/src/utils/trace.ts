import {
  request,
  generateTraceId as generateId,
  setTraceId as setId,
  getTraceId as getId,
  setOperatorInfo,
  getOperatorInfo,
  type RequestConfig,
  type OperatorInfo,
} from '../api/client';

export function generateTraceId(): string {
  return generateId();
}

export function setTraceId(traceId: string | null): void {
  setId(traceId);
}

export function getTraceId(): string | null {
  return getId();
}

export function setOperator(operator: OperatorInfo | null): void {
  setOperatorInfo(operator);
}

export function getOperator(): OperatorInfo | null {
  return getOperatorInfo();
}

export async function traceRequest<T>(config: RequestConfig, actionName?: string): Promise<T> {
  const traceId = getId() || generateId();
  setId(traceId);

  const startTime = Date.now();
  const operator = getOperatorInfo();

  try {
    const result = await request<T>(config);
    const duration = Date.now() - startTime;

    logAction({
      traceId,
      action: actionName || config.method || 'REQUEST',
      resourceType: config.url || 'unknown',
      resourceId: '',
      operator: operator?.operatorId || 'anonymous',
      operatorName: operator?.operatorName || '匿名用户',
      duration,
      success: true,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logAction({
      traceId,
      action: actionName || config.method || 'REQUEST',
      resourceType: config.url || 'unknown',
      resourceId: '',
      operator: operator?.operatorId || 'anonymous',
      operatorName: operator?.operatorName || '匿名用户',
      duration,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

interface ActionLogEntry {
  traceId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  operator: string;
  operatorName: string;
  duration?: number;
  success?: boolean;
  error?: string;
  beforeState?: unknown;
  afterState?: unknown;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

const actionLogs: ActionLogEntry[] = [];

export function logAction(entry: ActionLogEntry): void {
  const logEntry: ActionLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  } as ActionLogEntry;

  actionLogs.push(logEntry);

  if (actionLogs.length > 1000) {
    actionLogs.shift();
  }
}

export function getActionLogs(): ActionLogEntry[] {
  return [...actionLogs];
}

export function clearActionLogs(): void {
  actionLogs.length = 0;
}

export function withTrace<T>(fn: () => Promise<T>, customTraceId?: string): Promise<T> {
  const traceId = customTraceId || generateId();
  const previousTraceId = getId();

  setId(traceId);

  return fn()
    .then((result) => {
      setId(previousTraceId);
      return result;
    })
    .catch((error) => {
      setId(previousTraceId);
      throw error;
    });
}
