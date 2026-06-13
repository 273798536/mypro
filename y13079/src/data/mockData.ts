import type { PointData, PhaseData, AnomalyResult, DecisionItem } from '@/types';

export const phases: PhaseData[] = [
  {
    id: 'phase-1',
    name: '初版方案',
    date: '2026-05-20',
    description: '基于原始图纸的初步点位布置',
  },
  {
    id: 'phase-2',
    name: '复核版',
    date: '2026-06-01',
    description: '现场勘查后调整，加入实测温度数据',
  },
  {
    id: 'phase-3',
    name: '终版待审',
    date: '2026-06-10',
    description: '更新附件，待方案经理审批放行',
  },
];

const RACK_NAMES_A = [
  'A-01', 'A-02', 'A-03', 'A-04', 'A-05', 'A-06',
  'A-07', 'A-08', 'A-09', 'A-10', 'A-11', 'A-12',
];
const RACK_NAMES_B = [
  'B-01', 'B-02', 'B-03', 'B-04', 'B-05', 'B-06',
  'B-07', 'B-08', 'B-09', 'B-10', 'B-11', 'B-12',
];

const calcFormulas = [
  'T_out = T_in + P/(ρ×Cp×Q)',
  'ΔP = λ×(L/D)×(ρ×v²/2)',
  'Q = v×A×3600',
  'η = (T_supply - T_return)/(T_supply - T_air_in)',
  'Re = ρ×v×D/μ',
];

const sourceFiles = [
  '冷通道点位表_V1.xlsx',
  '机柜布局坐标_20260518.csv',
  '现场勘测记录_机房A.xlsx',
];

type PointOverride = Partial<Pick<PointData, 'status' | 'note' | 'attachments' | 'temperature' | 'airflow'>>;

function buildPhasePoints(
  phaseId: string,
  overrides: Record<number, PointOverride>,
  tempShift: number,
  airflowShift: number
): PointData[] {
  const allNames = [...RACK_NAMES_A, ...RACK_NAMES_B];
  const points: PointData[] = [];

  for (let idx = 0; idx < allNames.length; idx++) {
    const row = idx < 12 ? 0 : 1;
    const col = idx % 12;
    const name = allNames[idx];
    const id = `P-${phaseId}-${String(idx).padStart(3, '0')}`;
    const x = (col - 6 + 0.5) * 1.2;
    const z = (row - 0.5) * 3.0;
    const y = 0;

    const ov = overrides[idx];
    const status: PointData['status'] = ov?.status ?? 'normal';
    const defaultAttachments: string[] =
      status === 'missing'
        ? status === 'missing' && idx === 19
          ? []
          : ['点位坐标确认单.pdf']
        : status === 'late'
        ? ['点位坐标确认单.pdf']
        : ['点位坐标确认单.pdf', '现场照片.jpg'];

    points.push({
      id,
      name,
      rackIndex: col,
      rowIndex: row,
      x,
      y,
      z,
      status,
      calcFormula: calcFormulas[idx % calcFormulas.length],
      sourceRow: idx + 3,
      sourceFile: sourceFiles[idx % sourceFiles.length],
      attachments: ov?.attachments ?? defaultAttachments,
      phaseId,
      temperature: ov?.temperature ?? 22 + Math.sin(idx * 0.5) * 3 + tempShift,
      airflow: ov?.airflow ?? 3000 + Math.cos(idx * 0.7) * 800 + airflowShift,
      note: ov?.note,
    });
  }

  return points;
}

const PHASE3_OVERRIDES: Record<number, PointOverride> = {
  3: {
    status: 'overlap',
    note: '与A-05机柜送风方向冲突，A-04背面朝向热通道',
  },
  11: {
    status: 'overlap',
    note: '温感探头与走线架位置重叠，探头在机柜顶部被走线架遮挡',
  },
  19: {
    status: 'overlap',
    note: 'B-08与B-09机柜间距仅450mm，规范要求≥600mm',
  },
  7: {
    status: 'bad_data',
    note: 'Z坐标值4500mm超出机房层高3800mm，疑似录入错误',
    temperature: 99.9,
  },
  15: {
    status: 'bad_data',
    note: '风量值-1200 m³/h为负数，疑似录入时符号错误',
    airflow: -1200,
  },
  8: {
    status: 'missing',
    note: '缺少现场复核照片附件',
    attachments: ['点位坐标确认单.pdf'],
  },
  20: {
    status: 'missing',
    note: '坐标确认单和现场照片均缺失',
    attachments: [],
  },
  5: {
    status: 'late',
    note: '现场照片标注"晚到附件-待补"，预计6月12日提交',
    attachments: ['点位坐标确认单.pdf'],
  },
};

const PHASE2_OVERRIDES: Record<number, PointOverride> = {
  3: {
    status: 'overlap',
    note: '与A-05机柜送风方向冲突',
  },
  7: {
    status: 'bad_data',
    note: 'Z坐标值异常，超出机房层高范围',
    temperature: 55,
  },
  8: {
    status: 'missing',
    note: '缺少现场复核照片',
    attachments: ['点位坐标确认单.pdf'],
  },
};

const PHASE1_OVERRIDES: Record<number, PointOverride> = {
  3: {
    status: 'overlap',
    note: '与A-05送风方向可能冲突，待现场确认',
  },
};

export const pointsByPhase: Record<string, PointData[]> = {
  'phase-1': buildPhasePoints('phase-1', PHASE1_OVERRIDES, 0, 0),
  'phase-2': buildPhasePoints('phase-2', PHASE2_OVERRIDES, 0.5, -50),
  'phase-3': buildPhasePoints('phase-3', PHASE3_OVERRIDES, 1.0, -100),
};

function buildAnomalies(phaseId: string, phasePoints: PointData[]): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];

  const overlapPoints = phasePoints.filter((p) => p.status === 'overlap');
  if (overlapPoints.length > 0) {
    for (let i = 0; i < overlapPoints.length; i++) {
      const p = overlapPoints[i];
      const nextP = overlapPoints[i + 1] ?? overlapPoints[0];
      const isSerious = p.note?.includes('450mm') || p.note?.includes('送风方向冲突');
      anomalies.push({
        id: `anom-${phaseId}-${String(i + 1).padStart(3, '0')}`,
        type: 'overlap',
        pointIds: [p.id, nextP.id],
        severity: isSerious ? 'error' : 'warning',
        title: `对象重叠：${p.name} ${p.note?.split('，')[0] ?? ''}`,
        humanSteps: buildOverlapSteps(p, phasePoints),
      });
    }
  }

  const badDataPoints = phasePoints.filter((p) => p.status === 'bad_data');
  badDataPoints.forEach((p, i) => {
    anomalies.push({
      id: `anom-${phaseId}-bd-${String(i + 1).padStart(3, '0')}`,
      type: 'bad_data',
      pointIds: [p.id],
      severity: p.note?.includes('超出') ? 'error' : 'warning',
      title: `坏数据：${p.name} ${p.note?.split('，')[0] ?? ''}`,
      humanSteps: buildBadDataSteps(p),
    });
  });

  return anomalies;
}

function buildOverlapSteps(point: PointData, allPoints: PointData[]): string[] {
  const steps: string[] = [];
  steps.push(`打开《${point.sourceFile}》第${point.sourceRow}行`);
  if (point.note?.includes('送风方向')) {
    steps.push(`确认${point.name}机柜背面朝向冷通道侧`);
    steps.push(`联系现场工程师调整${point.name}机柜方向180度`);
    steps.push('调整后重新录入点位坐标并上传新照片');
  } else if (point.note?.includes('走线架')) {
    steps.push(`将温感探头从${point.name}机柜顶部移至侧面立柱`);
    steps.push('更新坐标Z值从2800mm改为2400mm');
    steps.push('复核通过后在系统中标记附件已补');
  } else if (point.note?.includes('间距')) {
    steps.push('规范要求冷通道侧机柜间距≥600mm');
    steps.push(`方案一：移除${point.name}机柜，方案二：整体平移B排机柜`);
    steps.push('与设计组确认方案后更新点位数据');
  } else {
    steps.push(`检查${point.name}与相邻机柜的空间关系`);
    steps.push('确认冲突类型和调整方向');
    steps.push('调整后重新录入点位坐标');
  }
  return steps;
}

function buildBadDataSteps(point: PointData): string[] {
  const steps: string[] = [];
  steps.push(`定位原始行：《${point.sourceFile}》第${point.sourceRow}行`);
  if (point.note?.includes('Z坐标')) {
    steps.push(`当前Z值=${point.z + 2.2 > 4 ? '4500mm' : '异常值'}，机房层高=3800mm`);
    steps.push('联系录入人员核对是笔误还是单位错误');
    steps.push('修正后重新计算风量和温度指标');
  } else if (point.note?.includes('风量')) {
    steps.push(`风量字段值=${point.airflow} m³/h，疑似录入时符号输入错误`);
    const neighbor = '3200';
    steps.push(`参照相邻机柜的风量值${neighbor} m³/h进行修正`);
    steps.push('修正后保存并重新触发异常检测');
  } else {
    steps.push(`当前值异常，需与原始记录核对`);
    steps.push('修正后重新计算相关指标');
  }
  return steps;
}

function buildDecisions(phaseId: string, phasePoints: PointData[]): DecisionItem[] {
  const decisions: DecisionItem[] = [];
  const nameMap = new Map(phasePoints.map((p) => [p.id, p]));

  phasePoints
    .filter((p) => p.status === 'missing')
    .forEach((p, i) => {
      decisions.push({
        id: `dec-${phaseId}-sup-miss-${i}`,
        type: 'supply',
        pointId: p.id,
        description: `${p.name}机柜：${p.attachments.length === 0 ? '坐标确认单和现场照片均缺失' : '缺少现场复核照片'}`,
        actionText: p.attachments.length === 0
          ? `抄送设计组，要求补充完整附件后重新提交`
          : `通知现场工程师，24小时内上传机柜定位照片`,
        owner: p.attachments.length === 0 ? '李工（设计）' : '王工（现场）',
      });
    });

  phasePoints
    .filter((p) => p.status === 'late')
    .forEach((p, i) => {
      decisions.push({
        id: `dec-${phaseId}-sup-late-${i}`,
        type: 'supply',
        pointId: p.id,
        description: `晚到附件：${p.name}机柜现场照片待补`,
        actionText: '已与现场确认，6月12日前提交，暂标记待补',
        owner: '王工（现场）',
      });
    });

  phasePoints
    .filter((p) => p.status === 'overlap')
    .forEach((p, i) => {
      decisions.push({
        id: `dec-${phaseId}-sup-overlap-${i}`,
        type: 'supply',
        pointId: p.id,
        description: `${p.name}机柜：${p.note?.split('，')[0] ?? '对象重叠需调整'}`,
        actionText: p.note?.includes('间距')
          ? '与设计组确认调整方案（移柜或撤柜）'
          : `联系现场调整机柜位置，更新后重新录入`,
        owner: '李工（设计）',
      });
    });

  phasePoints
    .filter((p) => p.status === 'bad_data')
    .forEach((p, i) => {
      decisions.push({
        id: `dec-${phaseId}-sup-bd-${i}`,
        type: 'supply',
        pointId: p.id,
        description: `${p.name}机柜：${p.note?.split('，')[0] ?? '数据异常需核实'}`,
        actionText: `录入人员核对原始数据表第${p.sourceRow}行，修正数值`,
        owner: '张工（录入）',
      });
    });

  phasePoints
    .filter((p) => p.status === 'normal')
    .forEach((p, i) => {
      decisions.push({
        id: `dec-${phaseId}-rel-${i}`,
        type: 'release',
        pointId: p.id,
        description: `${p.name}机柜点位复核通过，坐标/附件/计算均符合规范`,
        actionText: '放行，纳入终版方案',
      });
    });

  phasePoints
    .filter((p) => p.status === 'normal')
    .slice(0, 4)
    .forEach((p, i) => {
      decisions.push({
        id: `dec-${phaseId}-pend-${i}`,
        type: 'pending',
        pointId: p.id,
        description: `需设计组二次确认：${p.name}临界值风量 ${Math.round(p.airflow ?? 0)} m³/h`,
        actionText: '待李工确认后放行或转补料',
        owner: '李工（设计）',
      });
    });

  return decisions;
}

export const anomaliesByPhase: Record<string, AnomalyResult[]> = {
  'phase-1': buildAnomalies('phase-1', pointsByPhase['phase-1']),
  'phase-2': buildAnomalies('phase-2', pointsByPhase['phase-2']),
  'phase-3': buildAnomalies('phase-3', pointsByPhase['phase-3']),
};

export const decisionsByPhase: Record<string, DecisionItem[]> = {
  'phase-1': buildDecisions('phase-1', pointsByPhase['phase-1']),
  'phase-2': buildDecisions('phase-2', pointsByPhase['phase-2']),
  'phase-3': buildDecisions('phase-3', pointsByPhase['phase-3']),
};
