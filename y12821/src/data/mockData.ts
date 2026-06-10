import { Sample, AuditLog, ReviewHistory, LocationChange, StatSnapshot, SampleStatus } from '../../shared/types';

const generateId = () => Math.random().toString(36).substring(2, 11);

const today = new Date('2026-06-11');
const formatDate = (date: Date) => date.toISOString().split('T')[0];
const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const mockSamples: Sample[] = [
  {
    id: generateId(),
    strainCode: 'ST-0001',
    strainName: '大肠杆菌 DH5α',
    preservationDate: '2023-08-15',
    expiryDate: formatDate(addDays(today, 7)),
    samplingLocation: '动物房A区',
    strainType: '细菌',
    status: 'pending',
    autoJudge: 'normal',
    notes: '质粒克隆常用菌株，无特殊抗性',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2023-08-15T10:30:00',
    updatedAt: '2026-06-10T08:00:00',
  },
  {
    id: generateId(),
    strainCode: 'ST-0002',
    strainName: '金黄色葡萄球菌 ATCC25923',
    preservationDate: '2023-09-20',
    expiryDate: formatDate(addDays(today, 3)),
    samplingLocation: '动物房B区',
    strainType: '细菌',
    status: 'pending',
    autoJudge: 'normal',
    notes: '药敏试验质控菌株',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2023-09-20T14:20:00',
    updatedAt: '2026-06-10T08:00:00',
  },
  {
    id: generateId(),
    strainCode: 'ST-0003',
    strainName: '铜绿假单胞菌 PAO1',
    preservationDate: '2024-01-10',
    expiryDate: formatDate(addDays(today, -2)),
    samplingLocation: 'SPF区',
    strainType: '细菌',
    status: 'pending',
    autoJudge: 'normal',
    notes: '生物膜研究模式菌株',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2024-01-10T09:15:00',
    updatedAt: '2026-06-10T08:00:00',
  },
  {
    id: generateId(),
    strainCode: 'ST-0004',
    strainName: '酿酒酵母 BY4741',
    preservationDate: '2024-02-28',
    expiryDate: formatDate(addDays(today, 14)),
    samplingLocation: '动物房A区',
    strainType: '真菌',
    status: 'pending',
    autoJudge: 'normal',
    notes: '酵母双杂交实验宿主菌',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2024-02-28T11:45:00',
    updatedAt: '2026-06-10T08:00:00',
  },
  {
    id: generateId(),
    strainCode: 'ST-0005',
    strainName: 'HEK293T细胞株',
    preservationDate: '2024-03-15',
    expiryDate: formatDate(addDays(today, 21)),
    samplingLocation: '动物房C区',
    strainType: '细胞株',
    status: 'pending',
    autoJudge: 'normal',
    notes: '病毒包装常用细胞系，第12代',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2024-03-15T16:00:00',
    updatedAt: '2026-06-10T08:00:00',
  },
  {
    id: generateId(),
    strainCode: 'ST-0006',
    strainName: '枯草芽孢杆菌 WB800',
    preservationDate: '2024-04-20',
    expiryDate: formatDate(addDays(today, 30)),
    samplingLocation: '动物房B区',
    strainType: '细菌',
    status: 'pending',
    autoJudge: 'normal',
    notes: '分泌表达系统宿主菌',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2024-04-20T13:30:00',
    updatedAt: '2026-06-10T08:00:00',
  },
  {
    id: generateId(),
    strainCode: 'ST-0007',
    strainName: '沙门氏菌 SL1344',
    preservationDate: '2024-05-10',
    expiryDate: formatDate(addDays(today, 0)),
    samplingLocation: 'SPF区',
    strainType: '细菌',
    status: 'pending',
    autoJudge: 'normal',
    notes: '胞内侵袭研究菌株',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2024-05-10T10:00:00',
    updatedAt: '2026-06-10T08:00:00',
  },
  {
    id: generateId(),
    strainCode: 'ST-0008',
    strainName: 'CHO-K1细胞株',
    preservationDate: '2024-06-01',
    expiryDate: formatDate(addDays(today, 45)),
    samplingLocation: '动物房C区',
    strainType: '细胞株',
    status: 'pending',
    autoJudge: 'normal',
    notes: '重组蛋白表达细胞系，第8代',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2024-06-01T15:20:00',
    updatedAt: '2026-06-10T08:00:00',
  },
  {
    id: generateId(),
    strainCode: 'ST-0009',
    strainName: '黑曲霉 ATCC16404',
    preservationDate: '2024-07-15',
    expiryDate: formatDate(addDays(today, 60)),
    samplingLocation: '检疫区',
    strainType: '真菌',
    status: 'pending',
    autoJudge: 'normal',
    notes: '防霉效果测试质控菌株',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2024-07-15T09:45:00',
    updatedAt: '2026-06-10T08:00:00',
  },
  {
    id: generateId(),
    strainCode: 'ST-0010',
    strainName: '单核细胞增生李斯特菌',
    preservationDate: '2024-08-20',
    expiryDate: formatDate(addDays(today, -5)),
    samplingLocation: '动物房A区',
    strainType: '细菌',
    status: 'pending',
    autoJudge: 'normal',
    notes: '食品致病菌检测参考菌株',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2024-08-20T11:30:00',
    updatedAt: '2026-06-10T08:00:00',
  },
  {
    id: generateId(),
    strainCode: 'ST-0011',
    strainName: 'Vero细胞株',
    preservationDate: '2024-09-10',
    expiryDate: formatDate(addDays(today, -10)),
    samplingLocation: 'SPF区',
    strainType: '细胞株',
    status: 'pending',
    autoJudge: 'normal',
    notes: '病毒滴度测定细胞系，第15代',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2024-09-10T14:00:00',
    updatedAt: '2026-06-10T08:00:00',
  },
  {
    id: generateId(),
    strainCode: 'ST-0012',
    strainName: '肺炎克雷伯菌 ATCC700603',
    preservationDate: '2024-10-01',
    expiryDate: formatDate(addDays(today, 10)),
    samplingLocation: '检疫区',
    strainType: '细菌',
    status: 'pending',
    autoJudge: 'normal',
    notes: 'ESBL阳性质控菌株',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2024-10-01T10:15:00',
    updatedAt: '2026-06-10T08:00:00',
  },
  {
    id: generateId(),
    strainCode: 'ST-0013',
    strainName: '大肠杆菌 BL21(DE3)',
    preservationDate: '2024-03-25',
    expiryDate: formatDate(addDays(today, 5)),
    samplingLocation: '动物房B区',
    strainType: '细菌',
    status: 'pending',
    autoJudge: 'borderline',
    notes: '蛋白表达菌株。LB斜面培养基有轻微浑浊，OD600=0.12（临界值0.1），但划线分离后菌落形态正常，PCR检测目的条带清晰可见。建议复检后决定是否继续保藏。',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2024-03-25T13:00:00',
    updatedAt: '2026-06-10T08:00:00',
  },
  {
    id: generateId(),
    strainCode: 'ST-0014',
    strainName: '白色念珠菌 SC5314',
    preservationDate: '2024-04-18',
    expiryDate: formatDate(addDays(today, -1)),
    samplingLocation: '动物房C区',
    strainType: '真菌',
    status: 'pending',
    autoJudge: 'borderline',
    notes: '致病性研究菌株。沙氏葡萄糖琼脂平板上部分菌落形态略有变化，边缘呈锯齿状，但生化反应特征正常，rDNA测序确认菌株正确。可能是传代过程中的形态变异。',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2024-04-18T15:45:00',
    updatedAt: '2026-06-10T08:00:00',
  },
  {
    id: generateId(),
    strainCode: 'ST-0015',
    strainName: 'Raw264.7巨噬细胞',
    preservationDate: '2024-05-22',
    expiryDate: formatDate(addDays(today, 2)),
    samplingLocation: 'SPF区',
    strainType: '细胞株',
    status: 'pending',
    autoJudge: 'borderline',
    notes: '第20代细胞。镜下观察细胞形态基本正常，但生长速度较初代减慢约15%，活率92%（临界值90%）。吞噬功能检测结果在正常范围下限。建议进行支原体检测后决定。',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2024-05-22T09:30:00',
    updatedAt: '2026-06-10T08:00:00',
  },
  {
    id: generateId(),
    strainCode: 'ST-0016',
    strainName: '鲍曼不动杆菌 MDR株',
    preservationDate: '2024-06-30',
    expiryDate: formatDate(addDays(today, -3)),
    samplingLocation: '检疫区',
    strainType: '细菌',
    status: 'pending',
    autoJudge: 'borderline',
    notes: '多重耐药临床分离株。药敏试验显示部分抗生素MIC值较原始记录升高2-4倍，但仍符合MDR定义标准。可能是实验室传代过程中适应性变化。',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2024-06-30T14:20:00',
    updatedAt: '2026-06-10T08:00:00',
  },
  {
    id: generateId(),
    strainCode: 'ST-0017',
    strainName: '流感病毒 H1N1 毒株',
    preservationDate: '2024-08-05',
    expiryDate: formatDate(addDays(today, -7)),
    samplingLocation: '动物房A区',
    strainType: '病毒',
    status: 'pending',
    autoJudge: 'borderline',
    notes: '鸡胚尿囊液保存。血凝滴度1:160（最低合格滴度1:80），较初始滴度下降了一个数量级。TCID50测定正在进行中，预计3天后出结果。',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2024-08-05T11:15:00',
    updatedAt: '2026-06-10T08:00:00',
  },
  {
    id: generateId(),
    strainCode: 'ST-0018',
    strainName: '烟曲霉临床分离株',
    preservationDate: '2024-02-10',
    expiryDate: formatDate(addDays(today, 8)),
    samplingLocation: '动物房C区',
    strainType: '真菌',
    status: 'contaminated',
    autoJudge: 'contaminated',
    notes: '2026年6月5日检查发现PDA平板边缘有棉絮状菌丝生长，疑似青霉污染，菌落颜色变为灰绿色，与原始烟曲霉的深绿色菌落有明显差异。显微镜下观察到两种不同形态的分生孢子头。已取样做分子鉴定。',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2024-02-10T10:00:00',
    updatedAt: '2026-06-10T08:00:00',
    contaminationMarks: [
      '平板边缘棉絮状菌丝生长',
      '菌落颜色异常（灰绿色）',
      '镜下可见两种分生孢子头',
      '疑似青霉属污染',
    ],
  },
  {
    id: generateId(),
    strainCode: 'ST-0019',
    strainName: '伤寒沙门氏菌 Ty2',
    preservationDate: '2023-11-20',
    expiryDate: formatDate(addDays(today, 12)),
    samplingLocation: 'SPF区',
    strainType: '细菌',
    status: 'contaminated',
    autoJudge: 'contaminated',
    notes: 'LB液体培养基浑浊，OD600=0.8（正常值<0.1），镜检发现有大量活泼运动的短杆菌，与沙门氏菌形态不符。划线分离后出现两种不同菌落形态。生化鉴定显示有大肠杆菌特征。可能是超低温冰箱存取时发生的交叉污染。',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2023-11-20T13:45:00',
    updatedAt: '2026-06-10T08:00:00',
    contaminationMarks: [
      'LB液体培养基严重浑浊',
      'OD600=0.8（正常值<0.1）',
      '镜检发现杂菌游动',
      '划线分离出两种菌落',
      '生化鉴定显示大肠杆菌特征',
    ],
  },
  {
    id: generateId(),
    strainCode: 'ST-0020',
    strainName: '人胚肾细胞 293F',
    preservationDate: '2024-01-05',
    expiryDate: formatDate(addDays(today, 25)),
    samplingLocation: '检疫区',
    strainType: '细胞株',
    status: 'contaminated',
    autoJudge: 'contaminated',
    notes: '细胞复苏后培养3天，培养基出现黄色浑浊，pH急剧下降。显微镜下观察细胞间隙有大量细小黑点做布朗运动。支原体检测PCR阳性。同时细菌16S rDNA测序显示有多个条带，提示存在多种细菌污染。怀疑是水浴锅复苏时引入的污染。',
    batchNumber: 'BATCH-2026-06-001',
    createdAt: '2024-01-05T15:30:00',
    updatedAt: '2026-06-10T08:00:00',
    contaminationMarks: [
      '培养基黄色浑浊，pH急剧下降',
      '镜下可见大量布朗运动黑点',
      '支原体检测PCR阳性',
      '16S rDNA测序多条带',
      '多种细菌混合污染',
    ],
  },
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: generateId(),
    sampleId: mockSamples[0].id,
    operator: '张管理员',
    operateTime: '2026-06-10T08:00:00',
    action: 'create',
    fieldChanged: '样本创建',
    oldValue: '-',
    newValue: '创建成功',
    reason: '系统自动生成到期提醒批次',
  },
  {
    id: generateId(),
    sampleId: mockSamples[17].id,
    operator: '李管理员',
    operateTime: '2026-06-05T14:30:00',
    action: 'review',
    fieldChanged: 'status',
    oldValue: 'normal',
    newValue: 'contaminated',
    reason: '例行检查发现霉菌污染，已拍照记录，等待复核确认处理方案',
  },
  {
    id: generateId(),
    sampleId: mockSamples[18].id,
    operator: '王管理员',
    operateTime: '2026-06-08T09:15:00',
    action: 'review',
    fieldChanged: 'status',
    oldValue: 'normal',
    newValue: 'contaminated',
    reason: 'OD值异常升高，镜检发现杂菌，建议废弃处理',
  },
  {
    id: generateId(),
    sampleId: mockSamples[12].id,
    operator: '赵质控员',
    operateTime: '2026-06-09T16:45:00',
    action: 'manual_confirm',
    fieldChanged: 'autoJudge',
    oldValue: 'normal',
    newValue: 'borderline',
    reason: '系统漏检，OD值虽在临界值内但有轻微浑浊趋势，标记为边界样本提醒复核注意',
  },
];

export const mockReviewHistories: ReviewHistory[] = [
  {
    id: generateId(),
    sampleId: mockSamples[17].id,
    reviewer: '李管理员',
    reviewDate: '2026-06-05T14:30:00',
    oldStatus: 'normal',
    newStatus: 'contaminated',
    opinion: '平板边缘有明显的青霉菌落生长，与原始菌株形态差异显著，确认污染。',
    reason: '例行质量检查发现',
  },
  {
    id: generateId(),
    sampleId: mockSamples[18].id,
    reviewer: '王管理员',
    reviewDate: '2026-06-08T09:15:00',
    oldStatus: 'normal',
    newStatus: 'contaminated',
    opinion: '液体培养基浑浊，OD值异常，镜检和生化鉴定均证实存在大肠杆菌污染。',
    reason: '传代培养前质量验证发现',
  },
];

export const mockLocationChanges: LocationChange[] = [];

function calculateStats(samples: Sample[]): StatSnapshot['statsData'] {
  const byLocation: Record<string, Record<SampleStatus, number>> = {};
  const byStrainType: Record<string, Record<SampleStatus, number>> = {};
  const total: Record<SampleStatus, number> = {
    pending: 0,
    normal: 0,
    borderline: 0,
    contaminated: 0,
  };

  samples.forEach((sample) => {
    total[sample.status]++;

    if (!byLocation[sample.samplingLocation]) {
      byLocation[sample.samplingLocation] = { pending: 0, normal: 0, borderline: 0, contaminated: 0 };
    }
    byLocation[sample.samplingLocation][sample.status]++;

    if (!byStrainType[sample.strainType]) {
      byStrainType[sample.strainType] = { pending: 0, normal: 0, borderline: 0, contaminated: 0 };
    }
    byStrainType[sample.strainType][sample.status]++;
  });

  return { byLocation, byStrainType, total };
}

export const mockStatSnapshots: StatSnapshot[] = [
  {
    id: generateId(),
    batchNumber: 'BATCH-2026-06-001',
    snapshotTime: '2026-06-10T08:00:00',
    statsData: calculateStats(mockSamples),
    operator: '系统自动',
    runType: 'initial',
  },
];

export function getInitialSamples(): Sample[] {
  return JSON.parse(JSON.stringify(mockSamples));
}

export function getInitialAuditLogs(): AuditLog[] {
  return JSON.parse(JSON.stringify(mockAuditLogs));
}

export function getInitialReviewHistories(): ReviewHistory[] {
  return JSON.parse(JSON.stringify(mockReviewHistories));
}

export function getInitialLocationChanges(): LocationChange[] {
  return JSON.parse(JSON.stringify(mockLocationChanges));
}

export function getInitialStatSnapshots(): StatSnapshot[] {
  return JSON.parse(JSON.stringify(mockStatSnapshots));
}

export { calculateStats };
