import type { BridgeVersion, Member, VersionDiff, ChangeLog } from '../types';

const COMPARABLE_FIELDS: (keyof Member)[] = [
  'area',
  'elasticModulus',
  'yieldStrength',
  'unitCost',
  'material',
];

const FIELD_LABELS: Record<string, string> = {
  area: '截面积',
  elasticModulus: '弹性模量',
  yieldStrength: '屈服强度',
  unitCost: '单位造价',
  material: '材料类型',
};

const MATERIAL_LABELS: Record<string, string> = {
  steel: '钢材',
  aluminum: '铝合金',
  wood: '木材',
};

function formatValue(field: string, value: string | number): string {
  if (field === 'material') {
    return MATERIAL_LABELS[value as string] || String(value);
  }
  if (field === 'area') {
    return `${value}cm²`;
  }
  if (field === 'elasticModulus') {
    return `${value}GPa`;
  }
  if (field === 'yieldStrength') {
    return `${value}MPa`;
  }
  if (field === 'unitCost') {
    return `¥${value}/m`;
  }
  return String(value);
}

export function compareVersions(
  v1: BridgeVersion,
  v2: BridgeVersion
): VersionDiff {
  const changedMembers: VersionDiff['changedMembers'] = [];

  const v1MembersById = new Map(v1.members.map(m => [m.id, m]));
  const v2MembersById = new Map(v2.members.map(m => [m.id, m]));

  const allMemberIds = new Set([...v1MembersById.keys(), ...v2MembersById.keys()]);
  const sortedMemberIds = Array.from(allMemberIds).sort();

  let maxStressChange = 0;

  for (const memberId of sortedMemberIds) {
    const m1 = v1MembersById.get(memberId);
    const m2 = v2MembersById.get(memberId);

    if (!m1 || !m2) continue;

    for (const field of COMPARABLE_FIELDS) {
      const v1Val = m1[field];
      const v2Val = m2[field];

      if (v1Val !== v2Val) {
        changedMembers.push({
          memberId,
          field,
          oldValue: formatValue(field, v1Val as string | number),
          newValue: formatValue(field, v2Val as string | number),
        });
      }
    }
  }

  const budgetChange = v2.budget - v1.budget;

  let description = `版本V${v1.versionNumber}→V${v2.versionNumber}：`;

  if (changedMembers.length === 0) {
    description += '无杆件参数变化';
  } else {
    const changeDescriptions = changedMembers.map(cm => {
      return `杆件#${cm.memberId.slice(1)}${FIELD_LABELS[cm.field]}由${cm.oldValue}改为${cm.newValue}`;
    });
    description += changeDescriptions.join('；');
  }

  if (budgetChange !== 0) {
    description += `；预算${budgetChange > 0 ? '增加' : '减少'}¥${Math.abs(budgetChange).toFixed(0)}`;
  }

  return {
    changedMembers,
    budgetChange,
    maxStressChange,
    description,
  };
}

export function generateChangeLogs(
  v1: BridgeVersion,
  v2: BridgeVersion
): ChangeLog[] {
  const logs: ChangeLog[] = [];
  const diff = compareVersions(v1, v2);
  const now = new Date().toISOString();

  for (const cm of diff.changedMembers) {
    logs.push({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      versionId: v2.id,
      field: cm.field,
      oldValue: cm.oldValue,
      newValue: cm.newValue,
      memberId: cm.memberId,
      description: `杆件#${cm.memberId.slice(1)} ${FIELD_LABELS[cm.field]}：${cm.oldValue} → ${cm.newValue}`,
      timestamp: now,
    });
  }

  if (diff.budgetChange !== 0) {
    logs.push({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      versionId: v2.id,
      field: 'budget',
      oldValue: `¥${v1.budget.toFixed(0)}`,
      newValue: `¥${v2.budget.toFixed(0)}`,
      description: `预算${diff.budgetChange > 0 ? '增加' : '减少'}¥${Math.abs(diff.budgetChange).toFixed(0)}`,
      timestamp: now,
    });
  }

  return logs;
}

export function generateVersionName(
  baseName: string,
  versionNumber: number
): string {
  return `${baseName} V${versionNumber}`;
}
