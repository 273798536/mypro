import { diffJson, Change } from 'diff';

export interface DiffResult {
  field: string;
  oldValue: any;
  newValue: any;
  changes: string[];
}

export function compareObjects(oldObj: any, newObj: any): DiffResult[] {
  const results: DiffResult[] = [];
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
  
  for (const key of allKeys) {
    const oldVal = oldObj?.[key];
    const newVal = newObj?.[key];
    
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      const changes = diffJson(
        { [key]: oldVal },
        { [key]: newVal }
      ).filter((c: Change) => c.added || c.removed).map((c: Change) => 
        (c.added ? '+ ' : '- ') + c.value.trim()
      );
      
      results.push({
        field: key,
        oldValue: oldVal,
        newValue: newVal,
        changes
      });
    }
  }
  
  return results;
}

export function generateDiffSummary(diffs: DiffResult[]): string {
  if (diffs.length === 0) return '无变更';
  
  const summaries = diffs.map(d => {
    const oldStr = String(d.oldValue ?? '空');
    const newStr = String(d.newValue ?? '空');
    return `${d.field}: "${oldStr}" → "${newStr}"`;
  });
  
  return summaries.join('; ');
}

export function maskSensitiveData(obj: any, sensitiveFields: string[]): any {
  if (!obj) return obj;
  
  const masked = { ...obj };
  
  for (const field of sensitiveFields) {
    if (masked[field] !== undefined) {
      const value = String(masked[field]);
      if (value.length <= 4) {
        masked[field] = '****';
      } else {
        masked[field] = value.slice(0, 2) + '****' + value.slice(-2);
      }
    }
  }
  
  return masked;
}
