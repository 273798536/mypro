import type { TitrationRecord, Point } from '../types';

function generateGoodSpectrum(): Point[] {
  const points: Point[] = [];
  for (let v = 0; v <= 25; v += 0.5) {
    let ph: number;
    if (v < 11) {
      ph = 2.5 + (v / 11) * 0.8;
    } else if (v >= 11 && v <= 13) {
      const t = (v - 11) / 2;
      ph = 3.3 + t * 7.4;
    } else {
      ph = 10.7 + Math.min(3.3, (v - 13) * 0.4);
    }
    points.push({ volume: v, ph: Math.round(ph * 100) / 100 });
  }
  return points;
}

function generatePendingSpectrum(): Point[] {
  const points: Point[] = [];
  for (let v = 0; v <= 25; v += 0.5) {
    let ph: number;
    if (v < 10.5) {
      ph = 2.8 + (v / 10.5) * 0.6 + (Math.random() - 0.5) * 0.15;
    } else if (v >= 10.5 && v <= 13.5) {
      const t = (v - 10.5) / 3;
      ph = 3.4 + t * 6.8 + (Math.random() - 0.5) * 0.3;
    } else {
      ph = 10.2 + Math.min(3.5, (v - 13.5) * 0.35) + (Math.random() - 0.5) * 0.2;
    }
    points.push({ volume: v, ph: Math.round(ph * 100) / 100 });
  }
  return points;
}

function generateBadSpectrum(): Point[] {
  const points: Point[] = [];
  for (let v = 0; v <= 25; v += 0.5) {
    const ph = 5.5 + Math.sin(v * 0.4) * 0.6 + (Math.random() - 0.5) * 0.4;
    points.push({ volume: v, ph: Math.round(ph * 100) / 100 });
  }
  return points;
}

export const mockRecords: TitrationRecord[] = [
  {
    id: 'sample-good-001',
    sampleCode: 'W-2024-0612-A',
    titrationType: '盐酸标准溶液滴定氢氧化钠',
    status: 'passed',
    reviewer: '陈监测员',
    student: '李明',
    summary: '配平正确，突跃范围 11.0-13.0 mL 明显，终点 pH=7.02，数据可靠可直接使用。',
    isSample: true,
    teacherNote: '这是一条标准的顺利记录。盐酸滴定氢氧化钠是强酸滴定强碱，理论终点 pH=7.0。学生记录的终点体积 12.00 mL 与突跃中点吻合，计算过程每一步都保留了四位有效数字，相对误差 0.12% 远低于实验室允许阈值 0.5%。谱图在 11.0-13.0 mL 区间 pH 从 3.3 陡升至 10.7，这是典型的 S 型滴定曲线，可直接作为教学范例使用。',
    source: {
      notebookId: 'B-2024-06',
      lineNumber: 17,
      spectrumFile: 'titration_042.png',
      samplingTime: '2024-06-12 09:30',
      originalNote: '水样 A，室温 23.5℃，指示剂酚酞',
    },
    calculation: [
      {
        step: 1,
        title: '反应方程式配平',
        equation: 'HCl + NaOH → NaCl + H₂O',
        value: 'n(HCl) : n(NaOH) = 1 : 1',
        explanation: '一元强酸与一元强碱等物质的量反应，配平系数均为 1。',
        hasIssue: false,
      },
      {
        step: 2,
        title: 'NaOH 取样量',
        equation: 'V(NaOH) = 25.00 mL, c(NaOH) = ?',
        value: 'V = 25.00 mL',
        explanation: '使用移液管准确移取 25.00 mL 待测 NaOH 溶液于锥形瓶中。',
        hasIssue: false,
      },
      {
        step: 3,
        title: 'HCl 标准溶液浓度',
        equation: 'c(HCl) = 0.1025 mol/L',
        value: 'c = 0.1025 mol/L',
        explanation: 'HCl 标准溶液已通过基准 Na₂CO₃ 标定，浓度为 0.1025 mol/L（四位有效数字）。',
        hasIssue: false,
      },
      {
        step: 4,
        title: '终点体积读数',
        equation: 'V(HCl) = 12.00 mL',
        value: 'V = 12.00 mL',
        explanation: '滴定管初读数 0.05 mL，终读数 12.05 mL，差值 12.00 mL。与谱图突跃中点一致。',
        hasIssue: false,
      },
      {
        step: 5,
        title: '浓度计算',
        equation: 'c(NaOH) = c(HCl) × V(HCl) / V(NaOH)',
        value: 'c(NaOH) = 0.04920 mol/L',
        explanation: '代入数据：0.1025 × 12.00 / 25.00 = 0.04920 mol/L，四位有效数字正确。',
        hasIssue: false,
      },
      {
        step: 6,
        title: '误差校验',
        equation: '相对误差 = |实测 - 理论| / 理论 × 100%',
        value: '相对误差 = 0.12% < 0.5%（允许阈值）',
        explanation: '理论浓度 0.04926 mol/L，实测 0.04920 mol/L，相对误差 0.12%，在允许范围内。',
        hasIssue: false,
      },
    ],
    spectrum: {
      points: generateGoodSpectrum(),
      endpointVolume: 12.0,
      endpointPh: 7.02,
      jumpRange: { start: 11.0, end: 13.0 },
      note: '突跃明显，曲线平滑，无异常波动。',
    },
    annotations: [
      {
        id: 'ann-1',
        time: '2024-06-12 14:20',
        author: '陈监测员',
        content: '配平正确，有效数字规范。',
        refType: 'calculation',
        refId: '1',
      },
      {
        id: 'ann-2',
        time: '2024-06-12 14:22',
        author: '陈监测员',
        content: '谱图突跃范围清晰，终点位置确认。',
        refType: 'spectrum',
      },
    ],
  },
  {
    id: 'sample-pending-002',
    sampleCode: 'W-2024-0612-B',
    titrationType: '硫酸标准溶液滴定氨水',
    status: 'pending',
    reviewer: '陈监测员',
    student: '王芳',
    summary: '计算结果接近阈值上限，谱图数据点略有波动，待确认浓度是否填错。',
    isSample: true,
    teacherNote: '这条属于"待确认"类记录，最能考验环境监测员的判断力。问题出在两处：一是第 4 步终点体积，学生原始记录写的是 18.65 mL，但谱图突跃中心在 17.9 mL 附近，差了 0.75 mL——需要回头核对滴定管读数照片。二是第 5 步浓度计算结果 0.0958 mol/L，相对误差 0.48%，距离实验室 0.5% 的阈值只差 0.02%，属于压线情况。环境监测员遇到这种数据不能擅自放过或打回，应该标记"待确认"并邀请学生一起核对原始滴定管读数和谱图原始文件。',
    source: {
      notebookId: 'B-2024-06',
      lineNumber: 23,
      spectrumFile: 'titration_047.png',
      samplingTime: '2024-06-12 10:15',
      originalNote: '水样 B，室温 24.0℃，指示剂甲基红',
    },
    calculation: [
      {
        step: 1,
        title: '反应方程式配平',
        equation: 'H₂SO₄ + 2NH₃·H₂O → (NH₄)₂SO₄ + 2H₂O',
        value: 'n(H₂SO₄) : n(NH₃) = 1 : 2',
        explanation: '二元酸与一元碱反应，注意配平系数为 1:2。',
        hasIssue: false,
      },
      {
        step: 2,
        title: '氨水样体积',
        equation: 'V(NH₃·H₂O) = 25.00 mL',
        value: 'V = 25.00 mL',
        explanation: '移液管取样体积正确。',
        hasIssue: false,
      },
      {
        step: 3,
        title: '硫酸标准溶液浓度',
        equation: 'c(H₂SO₄) = 0.0512 mol/L',
        value: 'c = 0.0512 mol/L',
        explanation: '已标定，浓度有效。',
        hasIssue: false,
      },
      {
        step: 4,
        title: '终点体积读数',
        equation: 'V(H₂SO₄) = 18.65 mL',
        value: 'V = 18.65 mL',
        explanation: '⚠ 学生填写 18.65 mL，但谱图突跃中心约在 17.9 mL，存在偏差，需核对原始滴定管读数。',
        hasIssue: true,
      },
      {
        step: 5,
        title: '浓度计算',
        equation: 'c(NH₃) = 2 × c(H₂SO₄) × V(H₂SO₄) / V(NH₃)',
        value: 'c(NH₃) = 0.0958 mol/L',
        explanation: '计算 2 × 0.0512 × 18.65 / 25.00 = 0.0764？不对，需复核计算过程——可能学生体积填错导致结果异常。',
        hasIssue: true,
      },
      {
        step: 6,
        title: '误差校验',
        equation: '相对误差 = 0.48%',
        value: '接近阈值 0.5%',
        explanation: '⚠ 相对误差 0.48% 已非常接近允许上限，建议复核后再做结论。',
        hasIssue: true,
      },
    ],
    spectrum: {
      points: generatePendingSpectrum(),
      endpointVolume: 17.9,
      endpointPh: 5.45,
      jumpRange: { start: 10.5, end: 13.5 },
      note: '数据点略有波动，突跃范围不如强酸强碱明显，需仔细判读。',
    },
    annotations: [
      {
        id: 'ann-3',
        time: '2024-06-12 15:05',
        author: '陈监测员',
        content: '第 4 步终点体积与谱图不符，需核对原始记录照片。',
        refType: 'calculation',
        refId: '4',
      },
      {
        id: 'ann-4',
        time: '2024-06-12 15:08',
        author: '陈监测员',
        content: '误差接近阈值，暂不通过，请联系学生王芳确认。',
        refType: 'general',
      },
    ],
  },
  {
    id: 'sample-error-003',
    sampleCode: 'W-2024-0612-C',
    titrationType: 'NaOH 标准溶液滴定盐酸',
    status: 'error',
    reviewer: '陈监测员',
    student: '张伟',
    summary: '浓度填写错误（差了一个数量级），谱图无明显突跃，属于明显坏数据，需学生重新实验。',
    isSample: true,
    teacherNote: '这是一条典型的坏数据。学生张伟在第 3 步将 NaOH 标准溶液浓度写成了 0.103 mol/L，但实验室当天配制的标准液浓度是 0.0103 mol/L——差了整整一个数量级。更关键的是第 6 步谱图判读：整个滴定过程 pH 在 4.9 到 6.2 之间缓慢波动，没有任何突跃，这说明要么滴定剂浓度太低，要么学生根本没有将电极放入待测液中。这种数据没有复核价值，应该直接标记"异常"并要求学生重新实验。同时要保留原始行号 31 和谱图文件名 titration_053.png，方便后续追溯为什么这次实验失败。',
    source: {
      notebookId: 'B-2024-06',
      lineNumber: 31,
      spectrumFile: 'titration_053.png',
      samplingTime: '2024-06-12 11:00',
      originalNote: '水样 C，室温 24.2℃，指示剂酚酞',
    },
    calculation: [
      {
        step: 1,
        title: '反应方程式配平',
        equation: 'NaOH + HCl → NaCl + H₂O',
        value: 'n(NaOH) : n(HCl) = 1 : 1',
        explanation: '配平正确，强碱滴定强酸。',
        hasIssue: false,
      },
      {
        step: 2,
        title: 'HCl 取样量',
        equation: 'V(HCl) = 25.00 mL',
        value: 'V = 25.00 mL',
        explanation: '取样体积正确。',
        hasIssue: false,
      },
      {
        step: 3,
        title: 'NaOH 标准溶液浓度',
        equation: 'c(NaOH) = 0.103 mol/L',
        value: '⚠ c = 0.103 mol/L（应为 0.0103 mol/L）',
        explanation: '❌ 浓度填写错误！实验室 2024-06-12 配制的 NaOH 标准液浓度为 0.0103 mol/L，学生多写了一个数量级。原始记录簿 B-2024-06 第 5 页可查。',
        hasIssue: true,
      },
      {
        step: 4,
        title: '终点体积读数',
        equation: 'V(NaOH) = 23.50 mL',
        value: 'V = 23.50 mL',
        explanation: '体积读数本身没有问题，但在错误浓度下无意义。',
        hasIssue: false,
      },
      {
        step: 5,
        title: '浓度计算',
        equation: 'c(HCl) = c(NaOH) × V(NaOH) / V(HCl)',
        value: 'c(HCl) = 0.0968 mol/L（结果不可靠）',
        explanation: '❌ 由于第 3 步浓度填错一个数量级，计算结果完全错误。正确值约为 0.00968 mol/L。',
        hasIssue: true,
      },
      {
        step: 6,
        title: '误差校验',
        equation: '相对误差 > 1000%',
        value: '❌ 严重超限',
        explanation: '浓度错误导致计算结果与真实值差一个数量级，且谱图无突跃佐证，数据完全不可用。',
        hasIssue: true,
      },
    ],
    spectrum: {
      points: generateBadSpectrum(),
      endpointVolume: 0,
      endpointPh: 0,
      jumpRange: { start: 0, end: 0 },
      note: '❌ 无明显突跃！pH 在 5-6 之间随机波动，电极可能未正确浸入溶液，或滴定剂浓度异常。',
    },
    annotations: [
      {
        id: 'ann-5',
        time: '2024-06-12 15:30',
        author: '陈监测员',
        content: '第 3 步浓度填写错误，差一个数量级。请对照实验记录簿 B-2024-06 第 5 页。',
        refType: 'calculation',
        refId: '3',
      },
      {
        id: 'ann-6',
        time: '2024-06-12 15:32',
        author: '陈监测员',
        content: '谱图完全无突跃，电极操作或滴定剂浓度存在问题。',
        refType: 'spectrum',
      },
      {
        id: 'ann-7',
        time: '2024-06-12 15:35',
        author: '陈监测员',
        content: '数据不可用，建议学生张伟重新实验并注意标准溶液浓度。',
        refType: 'general',
      },
    ],
  },
  {
    id: 'record-004',
    sampleCode: 'W-2024-0613-A',
    titrationType: '盐酸滴定碳酸钠溶液',
    status: 'passed',
    reviewer: '陈监测员',
    student: '刘静',
    summary: '双指示剂法，两个终点均清晰，计算正确。',
    source: {
      notebookId: 'B-2024-06',
      lineNumber: 42,
      spectrumFile: 'titration_061.png',
      samplingTime: '2024-06-13 09:00',
      originalNote: '碳酸钠标准样品，酚酞 + 甲基橙双指示剂',
    },
    calculation: [
      { step: 1, title: '第一终点配平', equation: 'Na₂CO₃ + HCl → NaHCO₃ + NaCl', value: '1:1', explanation: '酚酞变色，第一化学计量点。', hasIssue: false },
      { step: 2, title: '第二终点配平', equation: 'NaHCO₃ + HCl → NaCl + CO₂ + H₂O', value: '1:1', explanation: '甲基橙变色，第二化学计量点。', hasIssue: false },
      { step: 3, title: '浓度计算', equation: 'c(Na₂CO₃) = c(HCl) × V₁ / V(样)', value: '0.0518 mol/L', explanation: '使用第一终点体积 V₁=12.65 mL 计算。', hasIssue: false },
    ],
    spectrum: {
      points: generateGoodSpectrum(),
      endpointVolume: 12.65,
      endpointPh: 8.31,
      jumpRange: { start: 11.5, end: 13.8 },
    },
    annotations: [],
  },
  {
    id: 'record-005',
    sampleCode: 'W-2024-0613-B',
    titrationType: 'EDTA 络合滴定钙离子',
    status: 'pending',
    reviewer: '陈监测员',
    student: '赵强',
    summary: '终点颜色判断略偏早，需确认是否扣除空白。',
    source: {
      notebookId: 'B-2024-06',
      lineNumber: 58,
      spectrumFile: 'titration_072.png',
      samplingTime: '2024-06-13 10:20',
      originalNote: '自来水样，钙指示剂，pH=12',
    },
    calculation: [
      { step: 1, title: '配平', equation: 'Ca²⁺ + H₂Y²⁻ → CaY²⁻ + 2H⁺', value: '1:1', explanation: 'EDTA 与 Ca²⁺ 1:1 络合。', hasIssue: false },
      { step: 2, title: '浓度计算', equation: 'c(Ca²⁺) = c(EDTA) × V / V(样)', value: '2.18 mmol/L', explanation: '未扣除空白，可能偏高。', hasIssue: true },
    ],
    spectrum: {
      points: generatePendingSpectrum(),
      endpointVolume: 10.9,
      endpointPh: 6.8,
      jumpRange: { start: 9.8, end: 12.0 },
    },
    annotations: [
      { id: 'ann-8', time: '2024-06-13 14:00', author: '陈监测员', content: '需确认空白体积是否已扣除。', refType: 'calculation', refId: '2' },
    ],
  },
];
