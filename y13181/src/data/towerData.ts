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

function generateData(): TowerData[] {
  const data: TowerData[] = [];
  
  for (let i = 0; i < 50; i++) {
    const baseValue = 80 + Math.random() * 40;
    const threshold = 100;
    const deviation = Math.round((baseValue - threshold) / threshold * 1000) / 10;
    const status = baseValue < 95 ? 'normal' : baseValue < 110 ? 'warning' : 'critical';
    const towerId = towerIds[i % towerIds.length];
    const materialIdx = i % materials.length;
    const materialName = materials[materialIdx];
    
    const date = new Date();
    date.setHours(date.getHours() - i * 2);
    
    const item: TowerData = {
      id: `TD-${String(i + 1).padStart(4, '0')}`,
      towerId,
      dropletValue: Math.round(baseValue * 10) / 10,
      threshold,
      deviation,
      status,
      timestamp: date.toISOString(),
      materialName,
      isNoiseSuspected: false,
      isOldNote: false,
      isNameMismatch: false,
      isVerbalNote: false,
      judgeResult: 'none',
      judgeReason: '',
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
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
  data[3].judgeTime = new Date(Date.now() - 3600000 * 5).toISOString();
  
  data[17].judgeResult = 'noise';
  data[17].judgeReason = '确认是噪声，与现场实际情况不符';
  data[17].judgeOperator = '李工';
  data[17].judgeTime = new Date(Date.now() - 3600000 * 3).toISOString();
  
  data[7].judgeResult = 'pending';
  data[7].judgeReason = '需要补充维修材料清单';
  data[7].judgeOperator = '王工';
  data[7].judgeTime = new Date(Date.now() - 3600000 * 8).toISOString();
  
  data[22].judgeResult = 'pending';
  data[22].judgeReason = '待核实型号匹配问题';
  data[22].judgeOperator = '赵工';
  data[22].judgeTime = new Date(Date.now() - 3600000 * 12).toISOString();
  
  return data;
}

export const towerData: TowerData[] = generateData();
