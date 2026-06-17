import type { TowerData } from '@/types';

const towerIds = ['CT-001', 'CT-002', 'CT-003', 'CT-004', 'CT-005'];
const materials = [
  'PVC冷却塔填料',
  'PP冷却塔填料',
  '玻璃钢冷却塔',
  '冷却塔喷头',
  '冷却塔收水器',
  '冷却塔风机',
  '冷却塔布水器',
];

const mismatchedMaterials: Record<string, string> = {
  'PVC冷却填料': 'PVC冷却塔填料',
  'PP填料片': 'PP冷却塔填料',
};

const BASELINE_DATETIME = '2026-06-18T09:00:00.000Z';

const fixedDropletValues = [
  87.3,  92.1,  95.4,  88.7,  103.2, 97.8,  108.5, 91.2,
  85.6,  99.3,  112.7, 94.8,  89.5,  105.1, 98.2,  86.4,
  101.7, 93.6,  115.8, 88.9,  96.3,  107.4, 90.1,  84.7,
  109.2, 97.5,  87.8,  104.6, 92.9,  113.5, 95.7,  89.1,
  106.8, 91.4,  83.5,  102.3, 96.7,  110.9, 88.2,  94.3,
  108.1, 93.8,  86.9,  105.7, 98.6,  114.2, 90.5,  85.2,
  103.8, 97.1,
];

function getTimeOffset(hoursAgo: number): string {
  const base = new Date(BASELINE_DATETIME).getTime();
  return new Date(base - hoursAgo * 3600000).toISOString();
}

function buildData(): TowerData[] {
  const data: TowerData[] = [];
  const threshold = 100;

  for (let i = 0; i < 50; i++) {
    const baseValue = fixedDropletValues[i];
    const deviation = Math.round((baseValue - threshold) / threshold * 1000) / 10;
    const status = baseValue < 95 ? 'normal' : baseValue < 110 ? 'warning' : 'critical';
    const towerId = towerIds[i % towerIds.length];
    const materialIdx = i % materials.length;
    const materialName = materials[materialIdx];

    const hoursAgo = i * 2;

    const item: TowerData = {
      id: `TD-${String(i + 1).padStart(4, '0')}`,
      towerId,
      dropletValue: Math.round(baseValue * 10) / 10,
      threshold,
      deviation,
      status,
      timestamp: getTimeOffset(hoursAgo),
      materialName,
      isNoiseSuspected: false,
      isOldNote: false,
      isNameMismatch: false,
      isVerbalNote: false,
      judgeResult: 'none',
      judgeReason: '',
      createdAt: getTimeOffset(hoursAgo),
      updatedAt: getTimeOffset(hoursAgo),
    };

    data.push(item);
  }

  data[3].dropletValue = 245.6;
  data[3].deviation = 145.6;
  data[3].status = 'critical';
  data[3].isNoiseSuspected = true;

  data[17].dropletValue = 267.3;
  data[17].deviation = 167.3;
  data[17].status = 'critical';
  data[17].isNoiseSuspected = true;

  data[31].dropletValue = 231.8;
  data[31].deviation = 131.8;
  data[31].status = 'critical';
  data[31].isNoiseSuspected = true;

  data[7].isOldNote = true;
  data[22].isOldNote = true;

  data[11].materialName = 'PVC冷却填料';
  data[11].standardMaterialName = mismatchedMaterials['PVC冷却填料'];
  data[11].isNameMismatch = true;

  data[37].materialName = 'PP填料片';
  data[37].standardMaterialName = mismatchedMaterials['PP填料片'];
  data[37].isNameMismatch = true;

  data[5].isVerbalNote = true;
  data[19].isVerbalNote = true;
  data[42].isVerbalNote = true;

  data[3].judgeResult = 'normal';
  data[3].judgeReason = '经核实为传感器瞬时波动，已恢复正常';
  data[3].judgeOperator = '张工';
  data[3].judgeTime = getTimeOffset(5);

  data[17].judgeResult = 'noise';
  data[17].judgeReason = '确认是噪声，与现场实际情况不符';
  data[17].judgeOperator = '李工';
  data[17].judgeTime = getTimeOffset(3);

  data[7].judgeResult = 'pending';
  data[7].judgeReason = '需要补充维修材料清单';
  data[7].judgeOperator = '王工';
  data[7].judgeTime = getTimeOffset(8);

  data[22].judgeResult = 'pending';
  data[22].judgeReason = '待核实型号匹配问题';
  data[22].judgeOperator = '赵工';
  data[22].judgeTime = getTimeOffset(12);

  return data;
}

export const towerData: TowerData[] = buildData();
