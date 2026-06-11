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

function generatePoints(phaseId: string, phaseOffset: number): PointData[] {
  const points: PointData[] = [];
  const rows = 2;
  const racksPerRow = 12;
  let idx = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < racksPerRow; c++) {
      const id = `P-${phaseId}-${String(idx).padStart(3, '0')}`;
      const x = (c - racksPerRow / 2 + 0.5) * 1.2;
      const z = (r - 0.5) * 3.0;
      const y = 0;

      let status: PointData['status'] = 'normal';
      let attachments = ['点位坐标确认单.pdf', '现场照片.jpg'];
      let note: string | undefined;

      const anomalySeed = (idx + phaseOffset) % 48;
      if (anomalySeed === 3) {
        status = 'overlap';
        note = '与相邻机柜B07送风方向冲突';
      } else if (anomalySeed === 11) {
        status = 'overlap';
        note = '温感探头与走线架位置重叠';
      } else if (anomalySeed === 19) {
        status = 'overlap';
        note = '两台机柜间距小于规范最小值600mm';
      } else if (anomalySeed === 7) {
        status = 'bad_data';
        note = 'Z坐标值异常，超出机房层高范围';
      } else if (anomalySeed === 23) {
        status = 'bad_data';
        note = '风量数据为负，疑似录入时符号错误';
      } else if (anomalySeed === 15) {
        status = 'missing';
        attachments = ['点位坐标确认单.pdf'];
        note = '缺少现场复核照片附件';
      } else if (anomalySeed === 31) {
        status = 'missing';
        attachments = [];
        note = '坐标确认单和现场照片均缺失';
      } else if (anomalySeed === 39) {
        status = 'late';
        attachments = ['点位坐标确认单.pdf'];
        note = '现场照片标注"晚到附件-待补"，预计6月12日提交';
      }

      points.push({
        id,
        name: `${r === 0 ? 'A' : 'B'}-${String(c + 1).padStart(2, '0')}`,
        rackIndex: c,
        rowIndex: r,
        x,
        y,
        z,
        status,
        calcFormula: calcFormulas[idx % calcFormulas.length],
        sourceRow: idx + 3 + phaseOffset,
        sourceFile: sourceFiles[idx % sourceFiles.length],
        attachments,
        phaseId,
        temperature: 22 + Math.sin(idx * 0.5) * 3 + phaseOffset * 0.3,
        airflow: 3000 + Math.cos(idx * 0.7) * 800 - phaseOffset * 50,
        note,
      });
      idx++;
    }
  }
  return points;
}

export const pointsByPhase: Record<string, PointData[]> = {
  'phase-1': generatePoints('phase-1', 0),
  'phase-2': generatePoints('phase-2', 100),
  'phase-3': generatePoints('phase-3', 200),
};

export const anomalies: AnomalyResult[] = [
  {
    id: 'anom-001',
    type: 'overlap',
    pointIds: ['P-phase-3-003', 'P-phase-3-004'],
    severity: 'error',
    title: '对象重叠：机柜送风方向冲突',
    humanSteps: [
      '打开《现场勘测记录_机房A.xlsx》第127行',
      '确认A-04机柜背面朝向冷通道侧',
      '联系现场工程师调整A-04机柜方向180度',
      '调整后重新录入点位坐标并上传新照片',
    ],
  },
  {
    id: 'anom-002',
    type: 'overlap',
    pointIds: ['P-phase-3-011', 'P-phase-3-012'],
    severity: 'warning',
    title: '对象重叠：温感探头与走线架冲突',
    humanSteps: [
      '定位《机柜布局坐标_20260518.csv》第14行',
      '将温感探头从机柜顶部移至侧面立柱',
      '更新坐标Z值从2800mm改为2400mm',
      '复核通过后在系统中标记附件已补',
    ],
  },
  {
    id: 'anom-003',
    type: 'overlap',
    pointIds: ['P-phase-3-019', 'P-phase-3-020'],
    severity: 'error',
    title: '对象重叠：机柜间距不足规范',
    humanSteps: [
      '检查《冷通道点位表_V1.xlsx》第22-23行',
      '规范要求冷通道侧机柜间距≥600mm，当前仅450mm',
      '方案一：移除B-08机柜，方案二：整体右移B排机柜',
      '与设计组确认方案后更新点位数据',
    ],
  },
  {
    id: 'anom-004',
    type: 'bad_data',
    pointIds: ['P-phase-3-007'],
    severity: 'error',
    title: '坏数据：Z坐标超出机房层高',
    humanSteps: [
      '定位原始行：《冷通道点位表_V1.xlsx》第10行',
      '当前Z值=4500mm，机房层高=3800mm',
      '联系录入人员核对是笔误还是单位错误',
      '修正后重新计算风量和温度指标',
    ],
  },
  {
    id: 'anom-005',
    type: 'bad_data',
    pointIds: ['P-phase-3-023'],
    severity: 'warning',
    title: '坏数据：风量值为负数',
    humanSteps: [
      '检查原始数据《机柜布局坐标_20260518.csv》第26行',
      '风量字段值=-1200 m³/h，疑似录入时符号输入错误',
      '参照相邻机柜A-11的风量值3200 m³/h进行修正',
      '修正后保存并重新触发异常检测',
    ],
  },
];

export const decisions: DecisionItem[] = [
  {
    id: 'dec-001',
    type: 'supply',
    pointId: 'P-phase-3-015',
    description: 'A-04机柜：缺少现场复核照片',
    actionText: '通知现场工程师王工，24小时内上传机柜定位照片',
    owner: '王工（现场）',
  },
  {
    id: 'dec-002',
    type: 'supply',
    pointId: 'P-phase-3-031',
    description: 'B-08机柜：坐标确认单和现场照片均缺失',
    actionText: '抄送设计组李工，要求补充完整附件后重新提交',
    owner: '李工（设计）',
  },
  {
    id: 'dec-003',
    type: 'supply',
    pointId: 'P-phase-3-003',
    description: 'A-04机柜：与A-05送风方向冲突需调整',
    actionText: '联系现场调整机柜方向，更新后重新录入',
    owner: '王工（现场）',
  },
  {
    id: 'dec-004',
    type: 'supply',
    pointId: 'P-phase-3-007',
    description: 'A-08机柜：Z坐标值异常需核实',
    actionText: '录入人员核对原始数据表第10行，修正Z值',
    owner: '张工（录入）',
  },
  {
    id: 'dec-005',
    type: 'supply',
    pointId: 'P-phase-3-011',
    description: 'A-12机柜：温感探头与走线架位置重叠',
    actionText: '设计组调整探头安装位置，更新Z坐标',
    owner: '李工（设计）',
  },
  {
    id: 'dec-006',
    type: 'supply',
    pointId: 'P-phase-3-023',
    description: 'B-12机柜：风量数据为负值',
    actionText: '修正录入错误，参照相邻机柜风量值',
    owner: '张工（录入）',
  },
  {
    id: 'dec-007',
    type: 'supply',
    pointId: 'P-phase-3-019',
    description: 'B-08机柜：与B-09间距不足600mm',
    actionText: '与设计组确认调整方案（移柜或撤柜）',
    owner: '李工（设计）',
  },
  {
    id: 'dec-008',
    type: 'supply',
    pointId: 'P-phase-3-039',
    description: '晚到附件：B-04机柜现场照片待补',
    actionText: '已与现场确认，6月12日前提交，暂标记待补',
    owner: '王工（现场）',
  },
  ...Array.from({ length: 24 }, (_, i) => ({
    id: `dec-rel-${String(i + 1).padStart(3, '0')}`,
    type: 'release' as const,
    pointId: `P-phase-3-${String((i * 2) % 40).padStart(3, '0')}`,
    description: `机柜点位复核通过，坐标/附件/计算均符合规范`,
    actionText: '放行，纳入终版方案',
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `dec-pend-${String(i + 1).padStart(3, '0')}`,
    type: 'pending' as const,
    pointId: `P-phase-3-${String(5 + i * 3).padStart(3, '0')}`,
    description: `需设计组二次确认：临界值风量 ${(2800 + i * 50)} m³/h`,
    actionText: '待李工确认后放行或转补料',
    owner: '李工（设计）',
  })),
];
