import tasksData from '@/mock/tasks.json';
import exceptionsData from '@/mock/exceptions.json';
import callChainsData from '@/mock/callChains.json';
import permissionsData from '@/mock/permissions.json';
import schemasData from '@/mock/schemas.json';
import opinionsData from '@/mock/opinions.json';
import auditVersionsData from '@/mock/auditVersions.json';
import type {
  ReplayTask,
  ExceptionRecord,
  CallChainNode,
  PermissionSnapshot,
  TableSchemaSnapshot,
  TreatmentOpinion,
  PermissionAuditVersion,
  FilterState,
} from '@/types';

export const delay = <T>(data: T, ms: number = 300 + Math.random() * 400): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));

export const api = {
  getTasks: (): Promise<ReplayTask[]> =>
    delay(tasksData as ReplayTask[]),

  getExceptions: (taskId?: string, filters?: FilterState): Promise<ExceptionRecord[]> => {
    let data = exceptionsData as ExceptionRecord[];
    if (taskId) data = data.filter((e) => e.taskId === taskId);
    if (filters) {
      if (filters.exceptionTypes.length > 0)
        data = data.filter((e) => filters.exceptionTypes.includes(e.type));
      if (filters.severities.length > 0)
        data = data.filter((e) => filters.severities.includes(e.severity));
      if (filters.statuses.length > 0)
        data = data.filter((e) => filters.statuses.includes(e.status));
      if (filters.searchKeyword) {
        const kw = filters.searchKeyword.toLowerCase();
        data = data.filter(
          (e) =>
            e.id.toLowerCase().includes(kw) ||
            e.tableName.toLowerCase().includes(kw) ||
            e.sourceService.toLowerCase().includes(kw) ||
            e.description.toLowerCase().includes(kw)
        );
      }
    }
    return delay(data, 400);
  },

  getCallChain: (recordId: string): Promise<CallChainNode[]> => {
    const data = (callChainsData as CallChainNode[])
      .filter((n) => n.recordId === recordId)
      .sort((a, b) => a.order - b.order);
    return delay(data);
  },

  getPermissionSnapshots: (recordId?: string): Promise<PermissionSnapshot[]> => {
    let data = permissionsData as PermissionSnapshot[];
    if (recordId) data = data.filter((s) => s.recordId === recordId);
    return delay(data);
  },

  getPermissionSnapshot: (snapshotId: string): Promise<PermissionSnapshot | undefined> =>
    delay(
      (permissionsData as PermissionSnapshot[]).find((s) => s.id === snapshotId),
      200
    ),

  getSchemaSnapshot: (recordId?: string): Promise<TableSchemaSnapshot | undefined> => {
    const data = schemasData as TableSchemaSnapshot[];
    const result = recordId ? data.find((s) => s.recordId === recordId) : data[0];
    return delay(result);
  },

  getTreatmentOpinions: (recordId: string): Promise<TreatmentOpinion[]> => {
    const data = (opinionsData as TreatmentOpinion[])
      .filter((o) => o.recordId === recordId)
      .sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime());
    return delay(data);
  },

  getAuditVersions: (): Promise<PermissionAuditVersion[]> =>
    delay(auditVersionsData as PermissionAuditVersion[]),

  updateExceptionStatus: (
    recordId: string,
    status: 'pending' | 'reviewing' | 'confirmed'
  ): Promise<boolean> => {
    const item = (exceptionsData as ExceptionRecord[]).find((e) => e.id === recordId);
    if (item) item.status = status;
    return delay(true, 500);
  },
};
