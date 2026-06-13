export const TARGET_FIELDS = [
  { key: 'experimentId', label: '实验编号', required: true },
  { key: 'experimentDate', label: '实验日期', required: true },
  { key: 'modelName', label: '模型名称', required: true },
  { key: 'windSpeed', label: '风速', required: true },
  { key: 'angleOfAttack', label: '攻角', required: true },
  { key: 'liftCoefficient', label: '升力系数', required: false },
  { key: 'dragCoefficient', label: '阻力系数', required: false },
  { key: 'pressureCoefficient', label: '压力系数', required: false },
  { key: 'reynoldsNumber', label: '雷诺数', required: false },
  { key: 'machNumber', label: '马赫数', required: false },
  { key: 'maintenanceRemark', label: '维修备注', required: false },
  { key: 'operator', label: '操作员', required: false },
  { key: 'remark', label: '备注', required: false },
] as const;

export const FIELD_NAME_SYNONYMS: Record<string, string[]> = {
  experimentId: ['实验编号', '试验编号', '实验号', '试验号', 'Experiment ID', 'Exp ID', 'exp_id', 'experiment_id'],
  experimentDate: ['实验日期', '试验日期', '测试日期', '日期', 'Date', 'Test Date', 'experiment_date'],
  modelName: ['模型名称', '模型', '型号', 'Model', 'Model Name', 'model_name'],
  windSpeed: ['风速', '来流风速', '风速值', 'Wind Speed', 'V', 'wind_speed'],
  angleOfAttack: ['攻角', '迎角', 'α', 'Angle of Attack', 'AOA', 'angle_of_attack'],
  liftCoefficient: ['升力系数', '升力', 'Cl', 'C_L', 'CL', 'Lift Coefficient', 'lift_coefficient'],
  dragCoefficient: ['阻力系数', '阻力', 'Cd', 'C_D', 'CD', 'Drag Coefficient', 'drag_coefficient'],
  pressureCoefficient: ['压力系数', '压力', 'Cp', 'C_P', 'CP', 'Pressure Coefficient', 'pressure_coefficient'],
  reynoldsNumber: ['雷诺数', 'Re', 'Reynolds Number', 'reynolds_number'],
  machNumber: ['马赫数', 'M', 'Ma', 'Mach Number', 'mach_number'],
  maintenanceRemark: ['维修备注', '维护备注', '维修记录', '维护记录', '修备记录', '维修说明', 'Maintenance Remark', 'maintenance_remark'],
  operator: ['操作员', '操作人', '测试员', 'Operator', 'operator'],
  remark: ['备注', '说明', '注释', 'Remark', 'Note', 'remark', 'note'],
};

export const getSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().replace(/[\s_]/g, '');
  const s2 = str2.toLowerCase().replace(/[\s_]/g, '');
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8;
  }
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[s1.length][s2.length];
  const maxLen = Math.max(s1.length, s2.length);
  
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
};

export const findBestFieldMatch = (sourceField: string): { targetField: string; confidence: number } => {
  let bestMatch = '';
  let bestConfidence = 0;
  
  for (const [target, synonyms] of Object.entries(FIELD_NAME_SYNONYMS)) {
    for (const synonym of synonyms) {
      const similarity = getSimilarity(sourceField, synonym);
      if (similarity > bestConfidence) {
        bestConfidence = similarity;
        bestMatch = target;
      }
    }
  }
  
  if (bestConfidence < 0.5) {
    bestMatch = '';
  }
  
  return { targetField: bestMatch, confidence: bestConfidence };
};
