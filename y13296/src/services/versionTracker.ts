import { Material, MaterialVersion, VersionDiff } from '../types';

export function createVersion(material: Material, content: string, uploader: string, isLateArrival: boolean = false, note?: string): Material {
  const newVersion: MaterialVersion = {
    id: `${material.id}-v${material.currentVersion + 1}`,
    version: material.currentVersion + 1,
    content,
    uploadTime: new Date(),
    uploader,
    isLateArrival,
    note,
  };

  return {
    ...material,
    versions: [...material.versions, newVersion],
    currentVersion: newVersion.version,
  };
}

export function getVersion(material: Material, version: number): MaterialVersion | undefined {
  return material.versions.find(v => v.version === version);
}

export function getCurrentVersion(material: Material): MaterialVersion {
  return material.versions[material.versions.length - 1];
}

export function hasVersionConflict(material: Material): boolean {
  if (material.versions.length < 2) return false;
  
  const latest = getCurrentVersion(material);
  const previous = material.versions[material.versions.length - 2];
  
  return latest.content !== previous.content;
}

export function compareVersions(material: Material, v1: number, v2: number): VersionDiff | null {
  const version1 = getVersion(material, v1);
  const version2 = getVersion(material, v2);
  
  if (!version1 || !version2) return null;
  
  const lines1 = version1.content.split('\n');
  const lines2 = version2.content.split('\n');
  
  const changedFields: VersionDiff['changedFields'] = [];
  
  const maxLines = Math.max(lines1.length, lines2.length);
  for (let i = 0; i < maxLines; i++) {
    const line1 = lines1[i] || '';
    const line2 = lines2[i] || '';
    
    if (line1 !== line2) {
      const fieldMatch1 = line1.match(/^(.+?)[:：](.+)$/);
      const fieldMatch2 = line2.match(/^(.+?)[:：](.+)$/);
      
      if (fieldMatch1 && fieldMatch2 && fieldMatch1[1].trim() === fieldMatch2[1].trim()) {
        const field = fieldMatch1[1].trim();
        const oldValue = fieldMatch1[2].trim();
        const newValue = fieldMatch2[2].trim();
        
        const impact = calculateImpact(field, oldValue, newValue);
        changedFields.push({ field, oldValue, newValue, impact });
      } else {
        changedFields.push({
          field: `第${i + 1}行`,
          oldValue: line1 || '(空)',
          newValue: line2 || '(空)',
          impact: 'medium',
        });
      }
    }
  }
  
  const overallImpact = calculateOverallImpact(changedFields);
  
  return {
    versionFrom: v1,
    versionTo: v2,
    changedFields,
    overallImpact,
    summary: generateDiffSummary(changedFields, overallImpact),
  };
}

function calculateImpact(field: string, oldValue: string, newValue: string): 'low' | 'medium' | 'high' {
  const highImpactFields = ['座椅数量', '座位数', '容量', '投诉内容', '位置', '街道', '路口'];
  const mediumImpactFields = ['时间', '日期', '投诉人', '联系方式'];
  
  if (highImpactFields.some(f => field.includes(f))) {
    const numOld = extractNumber(oldValue);
    const numNew = extractNumber(newValue);
    if (numOld !== null && numNew !== null && Math.abs(numOld - numNew) >= 2) {
      return 'high';
    }
    return 'high';
  }
  
  if (mediumImpactFields.some(f => field.includes(f))) {
    return 'medium';
  }
  
  return 'low';
}

function extractNumber(text: string): number | null {
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function calculateOverallImpact(fields: VersionDiff['changedFields']): 'low' | 'medium' | 'high' {
  if (fields.some(f => f.impact === 'high')) return 'high';
  if (fields.some(f => f.impact === 'medium')) return 'medium';
  return 'low';
}

function generateDiffSummary(fields: VersionDiff['changedFields'], impact: 'low' | 'medium' | 'high'): string {
  if (fields.length === 0) return '无变化';
  
  const fieldNames = fields.map(f => f.field).join('、');
  const impactText = { low: '较小', medium: '中等', high: '较大' }[impact];
  
  return `检测到${fields.length}处变更（${fieldNames}），对结论影响${impactText}`;
}

export function getAllVersionDiffs(material: Material): VersionDiff[] {
  const diffs: VersionDiff[] = [];
  for (let i = 1; i < material.versions.length; i++) {
    const diff = compareVersions(material, i, i + 1);
    if (diff) {
      diffs.push(diff);
    }
  }
  return diffs;
}

export function wasContentChanged(material: Material): boolean {
  return material.versions.some((v, i) => {
    if (i === 0) return false;
    return v.content !== material.versions[i - 1].content;
  });
}

export function getLateArrivingVersions(material: Material): MaterialVersion[] {
  return material.versions.filter(v => v.isLateArrival);
}
