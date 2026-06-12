import type { MistakeRecord, ProcessStatus, DataSource } from '../types';
import { checkUnits } from '../utils/unitEngine';
import { analyzeJumpFactors, generateJumpSummary } from '../utils/jumpAnalysis';

const baseRecords: Omit<MistakeRecord, 'unitCheck' | 'jumpAnalysis'>[] = [
  {
    id: 'm001',
    queueNumber: 1,
    title: '火车过桥问题',
    subject: '数学',
    chapter: '行程问题',
    difficulty: 'hard',
    status: 'needs_manual_confirm' as ProcessStatus,
    dataSource: 'import_old' as DataSource,
    questionContent: '一列火车长200米，以每秒15米的速度通过一座大桥，从车头上桥到车尾离桥共用120秒，求大桥的长度。',
    formula: '路程 = 速度 × 时间',
    formulaUnit: 'm/s',
    studentAnswer: {
      value: 1800,
      unit: '米',
      rawText: '1800米'
    },
    correctAnswer: {
      value: 1.6,
      unit: '千米',
      rawText: '1.6千米'
    },
    attachments: [
      {
        id: 'a001',
        name: '原题扫描件.pdf',
        type: 'pdf',
        uploadTime: '2024-03-10 09:00:00',
        isLateArrival: false
      }
    ],
    manualConfirm: {
      reason: '学生答案单位为"米"，参考答案单位为"千米"，数值差异较大。请确认是单位换算错误还是计算错误。',
      nextStep: '请人工确认错误类型后，标记为「单位错误」或「计算错误」，并补充相应复盘笔记。',
      requiredAction: '确认错误类型'
    },
    reviewNotes: '',
    createdAt: '2024-03-10 09:30:00',
    updatedAt: '2024-03-11 14:20:00',
    submittedBy: '张老师',
    fieldMappingNotes: [
      { oldFieldName: '题目', newFieldName: 'questionContent', mappedAt: '2024-03-11 10:00:00', mapper: 'system' },
      { oldFieldName: '学生答案', newFieldName: 'studentAnswer', mappedAt: '2024-03-11 10:00:00', mapper: 'system' }
    ],
    tags: ['单位换算', '行程问题']
  },
  {
    id: 'm002',
    queueNumber: 2,
    title: '密度计算问题',
    subject: '物理',
    chapter: '密度与浮力',
    difficulty: 'medium',
    status: 'unit_checking' as ProcessStatus,
    dataSource: 'manual' as DataSource,
    questionContent: '一个质量为540克的铝球，体积为300立方厘米，请问这个铝球是实心还是空心？（铝的密度为2.7g/cm³）',
    formula: '密度 = 质量 / 体积',
    formulaUnit: 'g/cm³',
    studentAnswer: {
      value: 1.8,
      unit: '',
      rawText: '1.8'
    },
    correctAnswer: {
      value: 2.7,
      unit: 'g/cm³',
      rawText: '2.7g/cm³'
    },
    attachments: [],
    createdAt: '2024-03-10 10:15:00',
    updatedAt: '2024-03-10 10:15:00',
    submittedBy: '李老师',
    tags: ['单位缺失', '密度']
  },
  {
    id: 'm003',
    queueNumber: 3,
    title: '功与功率计算',
    subject: '物理',
    chapter: '功和机械能',
    difficulty: 'medium',
    status: 'pending' as ProcessStatus,
    dataSource: 'import_new' as DataSource,
    questionContent: '小明用100牛的水平推力推动一个重500牛的箱子，在10秒内前进了5米，求小明做功的功率。',
    formula: 'P = W / t = Fs / t',
    formulaUnit: 'W',
    studentAnswer: {
      value: 50,
      unit: 'J',
      rawText: '50J'
    },
    correctAnswer: {
      value: 50,
      unit: 'W',
      rawText: '50W'
    },
    attachments: [
      {
        id: 'a003',
        name: '课堂练习册第32页.jpg',
        type: 'image',
        uploadTime: '2024-03-09 16:00:00',
        isLateArrival: false
      }
    ],
    createdAt: '2024-03-10 11:00:00',
    updatedAt: '2024-03-10 11:00:00',
    submittedBy: '王老师',
    tags: ['单位混淆', '功率']
  },
  {
    id: 'm004',
    queueNumber: 4,
    title: '溶液浓度配制',
    subject: '化学',
    chapter: '溶液',
    difficulty: 'easy',
    status: 'reviewed' as ProcessStatus,
    dataSource: 'api_sync' as DataSource,
    questionContent: '要配制200克质量分数为10%的氯化钠溶液，需要氯化钠和水各多少克？',
    formula: '溶质质量 = 溶液质量 × 质量分数',
    formulaUnit: 'g',
    studentAnswer: {
      value: 20,
      unit: '克',
      rawText: '20克氯化钠，180克水'
    },
    correctAnswer: {
      value: 20,
      unit: 'g',
      rawText: '20g NaCl，180g H₂O'
    },
    attachments: [
      {
        id: 'a004-1',
        name: '实验报告模板.docx',
        type: 'doc',
        uploadTime: '2024-03-08 14:00:00',
        isLateArrival: false
      },
      {
        id: 'a004-2',
        name: '实验补充说明.pdf',
        type: 'pdf',
        uploadTime: '2024-03-10 23:30:00',
        isLateArrival: true,
        impactDescription: '补充说明中明确了"质量分数"与"体积分数"的区别，学生混淆了两个概念，导致对题意理解偏差。'
      }
    ],
    lateAttachmentImpact: '晚到附件「实验补充说明.pdf」重新定义了题意，原答案基于质量分数，补充说明后发现学生实际是按体积分数计算的，需重新评估错误原因。',
    reviewNotes: '学生答案数值正确，但对浓度概念理解不深，需要加强概念辨析。晚到附件提供了重要背景信息。',
    reviewer: '陈老师',
    createdAt: '2024-03-08 15:00:00',
    updatedAt: '2024-03-11 08:45:00',
    submittedBy: '陈老师',
    tags: ['概念理解', '晚到附件']
  },
  {
    id: 'm005',
    queueNumber: 5,
    title: '匀速直线运动速度计算',
    subject: '物理',
    chapter: '运动的描述',
    difficulty: 'easy',
    status: 'completed' as ProcessStatus,
    dataSource: 'manual' as DataSource,
    questionContent: '一辆汽车在平直公路上匀速行驶，2小时行驶了120千米，求汽车的速度。',
    formula: 'v = s / t',
    formulaUnit: 'km/h',
    studentAnswer: {
      value: 60,
      unit: 'km/h',
      rawText: '60km/h'
    },
    correctAnswer: {
      value: 60,
      unit: 'km/h',
      rawText: '60千米/时'
    },
    attachments: [],
    reviewNotes: '答案完全正确，单位一致。学生掌握良好。',
    reviewer: '李老师',
    createdAt: '2024-03-07 09:00:00',
    updatedAt: '2024-03-08 10:30:00',
    submittedBy: '李老师',
    tags: ['全对', '速度']
  },
  {
    id: 'm006',
    queueNumber: 6,
    title: '压强计算（单位跳变案例）',
    subject: '物理',
    chapter: '压强',
    difficulty: 'hard',
    status: 'needs_manual_confirm' as ProcessStatus,
    dataSource: 'import_old' as DataSource,
    questionContent: '一个质量为60千克的人，每只脚与地面的接触面积约为200平方厘米，求人站立时对地面的压强。（g取10N/kg）',
    formula: 'p = F / S = mg / S',
    formulaUnit: 'Pa',
    studentAnswer: {
      value: 15000,
      unit: 'Pa',
      rawText: '15000Pa'
    },
    correctAnswer: {
      value: 1.5,
      unit: '×10⁴ Pa',
      rawText: '1.5×10⁴ Pa'
    },
    attachments: [
      {
        id: 'a006-1',
        name: '压强专题练习.pdf',
        type: 'pdf',
        uploadTime: '2024-03-05 11:00:00',
        isLateArrival: false
      },
      {
        id: 'a006-2',
        name: '评分标准补充.xlsx',
        type: 'excel',
        uploadTime: '2024-03-11 07:00:00',
        isLateArrival: true,
        impactDescription: '评分标准中新增了"科学计数法"要求，答案需用a×10ⁿ形式表示，导致原本数值正确的答案因格式不符合要求被判错。'
      }
    ],
    manualConfirm: {
      reason: '结果跳变：初判得分0.5/1（数值正确、单位正确但格式不符），收到晚到附件后变为0/1（格式要求严格执行）。需确认最终评分标准。',
      nextStep: '请与教研组确认评分标准的严格程度，是否对科学计数法格式做硬性要求。',
      requiredAction: '确认评分标准'
    },
    reviewNotes: '初判：数值正确单位正确，给一半分。收到评分标准补充后，格式要求严格，需重新评估。',
    createdAt: '2024-03-05 14:00:00',
    updatedAt: '2024-03-11 07:30:00',
    submittedBy: '赵老师',
    fieldMappingNotes: [
      { oldFieldName: '题干', newFieldName: 'questionContent', mappedAt: '2024-03-07 09:00:00', mapper: 'system' },
      { oldFieldName: '答题内容', newFieldName: 'studentAnswer', mappedAt: '2024-03-07 09:00:00', mapper: 'system' },
      { oldFieldName: '参考答案', newFieldName: 'correctAnswer', mappedAt: '2024-03-07 09:00:00', mapper: 'system' }
    ],
    tags: ['单位格式', '晚到附件', '跳变案例', '压强']
  },
  {
    id: 'm007',
    queueNumber: 7,
    title: '比热容计算',
    subject: '物理',
    chapter: '热和能',
    difficulty: 'medium',
    status: 'processing' as ProcessStatus,
    dataSource: 'import_new' as DataSource,
    questionContent: '质量为2千克的水，温度从20°C升高到100°C，需要吸收多少热量？（水的比热容为4.2×10³ J/(kg·°C)）',
    formula: 'Q = cmΔt',
    formulaUnit: 'J',
    studentAnswer: {
      value: 672000,
      unit: 'J',
      rawText: '672000J'
    },
    correctAnswer: {
      value: 672,
      unit: 'kJ',
      rawText: '672kJ'
    },
    attachments: [],
    createdAt: '2024-03-11 08:00:00',
    updatedAt: '2024-03-11 09:10:00',
    submittedBy: '孙老师',
    tags: ['单位换算', '热量']
  },
  {
    id: 'm008',
    queueNumber: 8,
    title: '欧姆定律应用',
    subject: '物理',
    chapter: '欧姆定律',
    difficulty: 'easy',
    status: 'pending' as ProcessStatus,
    dataSource: 'manual' as DataSource,
    questionContent: '一个电阻两端电压为6V，通过的电流为0.3A，求电阻的阻值。',
    formula: 'R = U / I',
    formulaUnit: 'Ω',
    studentAnswer: {
      value: 20,
      unit: '',
      rawText: '20'
    },
    correctAnswer: {
      value: 20,
      unit: 'Ω',
      rawText: '20Ω'
    },
    attachments: [],
    createdAt: '2024-03-11 09:30:00',
    updatedAt: '2024-03-11 09:30:00',
    submittedBy: '周老师',
    tags: ['单位缺失', '电阻']
  },
  {
    id: 'm009',
    queueNumber: 9,
    title: '杠杆平衡条件',
    subject: '物理',
    chapter: '简单机械',
    difficulty: 'hard',
    status: 'archived' as ProcessStatus,
    dataSource: 'import_old' as DataSource,
    questionContent: '一根杠杆长2米，左端挂60牛的物体，右端挂40牛的物体，要使杠杆平衡，支点应在距离左端多少米处？',
    formula: 'F₁L₁ = F₂L₂',
    formulaUnit: 'm',
    studentAnswer: {
      value: 0.8,
      unit: '米',
      rawText: '0.8米'
    },
    correctAnswer: {
      value: 0.8,
      unit: 'm',
      rawText: '0.8m'
    },
    attachments: [
      {
        id: 'a009',
        name: '杠杆示意图.png',
        type: 'image',
        uploadTime: '2024-02-28 10:00:00',
        isLateArrival: false
      }
    ],
    reviewNotes: '答案正确，单位一致。学生对杠杆平衡条件掌握良好。已归档。',
    reviewer: '吴老师',
    createdAt: '2024-02-28 14:00:00',
    updatedAt: '2024-03-05 16:00:00',
    submittedBy: '吴老师',
    fieldMappingNotes: [
      { oldFieldName: '题目', newFieldName: 'questionContent', mappedAt: '2024-03-01 09:00:00', mapper: 'system' }
    ],
    tags: ['已归档', '杠杆']
  },
  {
    id: 'm010',
    queueNumber: 10,
    title: '速度单位换算专项',
    subject: '物理',
    chapter: '运动的快慢',
    difficulty: 'medium',
    status: 'reviewed' as ProcessStatus,
    dataSource: 'manual' as DataSource,
    questionContent: '完成下列单位换算：(1) 72 km/h = ____ m/s  (2) 10 m/s = ____ km/h',
    formula: '1 m/s = 3.6 km/h',
    formulaUnit: 'm/s',
    studentAnswer: {
      value: 20,
      unit: 'm/s',
      rawText: '(1)20m/s  (2)36km/h'
    },
    correctAnswer: {
      value: 20,
      unit: 'm/s',
      rawText: '(1)20m/s  (2)36km/h'
    },
    attachments: [],
    reviewNotes: '全对！单位换算掌握熟练。',
    reviewer: '郑老师',
    createdAt: '2024-03-06 11:00:00',
    updatedAt: '2024-03-07 15:00:00',
    submittedBy: '郑老师',
    tags: ['单位换算', '全对', '速度']
  }
];

export function generateMockData(): MistakeRecord[] {
  return baseRecords.map(record => {
    const unitCheck = checkUnits(
      record.formulaUnit,
      record.correctAnswer?.unit,
      record.studentAnswer?.rawText
    );
    
    let jumpAnalysis = undefined;
    if (record.attachments.some(a => a.isLateArrival) || record.status === 'needs_manual_confirm') {
      const oldVersion: Partial<MistakeRecord> = {
        ...record,
        attachments: record.attachments.filter(a => !a.isLateArrival),
        correctAnswer: record.correctAnswer
      };
      const newVersion: Partial<MistakeRecord> = {
        ...record
      };
      
      const factors = analyzeJumpFactors(oldVersion, newVersion);
      if (factors.length > 0) {
        jumpAnalysis = {
          hasJump: true,
          jumpFactors: factors,
          summary: generateJumpSummary(factors)
        };
      }
    }
    
    return {
      ...record,
      unitCheck,
      jumpAnalysis
    };
  });
}

export const mockData = generateMockData();
