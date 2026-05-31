import type { Series, Calculation, ChangeLog } from '@/types';
import { generateId } from '@/utils/storage';

export interface ChangeInput {
  seriesId: string;
  calculationId?: string;
  operator: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  changeReason: string;
}

export function createChangeLog(
  input: ChangeInput,
  calculations: Calculation[]
): ChangeLog {
  const affectedCalculations = calculations
    .filter(c => c.seriesId === input.seriesId)
    .map(c => c.id);
  
  return {
    id: generateId('log'),
    seriesId: input.seriesId,
    calculationId: input.calculationId,
    operator: input.operator,
    fieldName: input.fieldName,
    oldValue: input.oldValue,
    newValue: input.newValue,
    changeReason: input.changeReason,
    affectedCalculations,
    createdAt: new Date().toISOString(),
  };
}

export function detectChanges<T extends Record<string, unknown>>(
  oldObj: T,
  newObj: T,
  ignoreFields: string[] = ['updatedAt', 'createdAt', 'id']
): Array<{ field: string; oldValue: string; newValue: string }> {
  const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];
  
  Object.keys(newObj).forEach(key => {
    if (ignoreFields.includes(key)) return;
    
    const oldVal = oldObj[key];
    const newVal = newObj[key];
    
    if (oldVal !== newVal) {
      changes.push({
        field: key,
        oldValue: String(oldVal ?? ''),
        newValue: String(newVal ?? ''),
      });
    }
  });
  
  return changes;
}

export function getChangeImpactDescription(change: ChangeLog): string {
  const fieldLabels: Record<string, string> = {
    name: '剧集名称',
    episodes: '集数',
    productionCost: '制作成本',
    authorization: '授权方',
    status: '状态',
  };
  
  const fieldName = fieldLabels[change.fieldName] || change.fieldName;
  return `${change.operator} 修改了「${fieldName}」：从「${change.oldValue}」改为「${change.newValue}」`;
}

export function buildInfluenceChain(
  series: Series,
  changeLogs: ChangeLog[],
  calculations: Calculation[]
): Array<{
  change: ChangeLog;
  affectedCalculations: Calculation[];
}> {
  const seriesChanges = changeLogs
    .filter(log => log.seriesId === series.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  return seriesChanges.map(change => ({
    change,
    affectedCalculations: calculations.filter(c => change.affectedCalculations.includes(c.id)),
  }));
}

export function getCurrentOperator(): string {
  const stored = localStorage.getItem('dramacalc_operator');
  return stored || '当前用户';
}

export function setCurrentOperator(name: string): void {
  localStorage.setItem('dramacalc_operator', name);
}
