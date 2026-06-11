import type {
  Sample,
  CultureRecord,
  ReviewRound,
  ReviewOpinion,
  FinalConclusion,
  DuplicateLog,
} from '../types';

const generateId = () => Math.random().toString(36).substring(2, 11);

const samplingLocations = [
  '动物房A区-小鼠饲养笼架1',
  '动物房B区-大鼠饲养笼架3',
  '实验楼203室-操作台A',
  '实验楼205室-操作台B',
  '动物中心-手术准备室',
  '动物中心-术后恢复区',
];

const timePoints = ['Day 0', 'Day 3', 'Day 7', 'Day 14', 'Day 21', 'Day 28'];

const operators = ['李老师', '王老师', '张老师', '赵老师'];

const imageNames = [
  '20260601_mouse_001.jpg',
  '20260601_rat_023.jpg',
  '20260602_tissue_045.png',
  '20260603_culture_067.jpg',
  '20260603_microscope_089.png',
];

const sourceNotes = [
  '2026年春季学期实验教材附录B',
  '导师组2026-03-15会议纪要附表',
  '动物中心出库单NO.2026050012',
  '实验记录簿第3册第47页',
  '预实验数据汇总表v2.1',
];

export function generateDemoData(): {
  samples: Sample[];
  cultureRecords: CultureRecord[];
  reviewRounds: ReviewRound[];
  reviewOpinions: ReviewOpinion[];
  finalConclusions: FinalConclusion[];
  duplicateLogs: DuplicateLog[];
} {
  const samples: Sample[] = [];
  const cultureRecords: CultureRecord[] = [];
  const reviewRounds: ReviewRound[] = [];
  const reviewOpinions: ReviewOpinion[] = [];
  const finalConclusions: FinalConclusion[] = [];
  const duplicateLogs: DuplicateLog[] = [];

  const statuses: Sample['status'][] = [
    'pending',
    'reviewing',
    'approved',
    'rejected',
    'duplicate',
    'pending',
    'reviewing',
    'approved',
    'pending',
    'approved',
    'reviewing',
    'approved',
  ];

  for (let i = 0; i < 12; i++) {
    const sampleId = generateId();
    const barcode = i === 5 ? 'ANI-2026-0008' : `ANI-2026-${String(i + 1).padStart(4, '0')}`;
    const batchNumber = i < 6 ? 'BATCH-2026-06A' : 'BATCH-2026-06B';

    const sample: Sample = {
      id: sampleId,
      barcode,
      samplingLocation: samplingLocations[i % samplingLocations.length],
      originalRowNumber: `原始表格第${i + 12}行`,
      imageName: imageNames[i % imageNames.length],
      sourceNote: sourceNotes[i % sourceNotes.length],
      status: statuses[i],
      batchNumber,
      createdAt: new Date(2026, 5, 1 + i).toISOString(),
      updatedAt: new Date(2026, 5, 8 + Math.floor(i / 2)).toISOString(),
    };
    samples.push(sample);

    for (let j = 0; j < timePoints.length; j++) {
      const isMissing = (i === 2 && j === 3) || (i === 7 && j === 5);
      const cultureRecord: CultureRecord = {
        id: generateId(),
        sampleId,
        timePoint: timePoints[j],
        content: isMissing
          ? ''
          : `细胞存活率${85 + Math.floor(Math.random() * 15)}%，形态正常，无明显污染。${
              j >= 3 ? '已完成传代培养' : '原代培养中'
            }`,
        operator: operators[j % operators.length],
        recordDate: new Date(2026, 5, 1 + i + j * 3).toISOString(),
        isMissing,
        linkedConclusionId: null,
      };
      cultureRecords.push(cultureRecord);
    }

    if (i >= 4) {
      const roundId = generateId();
      const isFinalized = sample.status === 'approved' || sample.status === 'rejected';

      const round: ReviewRound = {
        id: roundId,
        sampleId,
        roundNumber: 1,
        reviewer: '李老师',
        reviewDate: new Date(2026, 5, 10 + Math.floor(i / 2)).toISOString(),
        status: isFinalized ? 'finalized' : sample.status === 'reviewing' ? 'submitted' : 'draft',
      };
      reviewRounds.push(round);

      if (isFinalized || sample.status === 'reviewing') {
        const opinion: ReviewOpinion = {
          id: generateId(),
          reviewRoundId: roundId,
          content:
            sample.status === 'rejected'
              ? 'Day 14 培养记录缺失，且采样地点标注有误，请核实原始记录后补充。'
              : '培养记录完整，时间点连续，实验操作符合伦理规范。采样地点已核对无误。',
          missingTimePoints:
            sample.status === 'rejected' ? ['Day 14'] : [],
          createdAt: new Date(2026, 5, 10 + Math.floor(i / 2)).toISOString(),
        };
        reviewOpinions.push(opinion);

        if (isFinalized) {
          const conclusion: FinalConclusion = {
            id: generateId(),
            reviewRoundId: roundId,
            result: sample.status === 'approved' ? 'pass' : 'fail',
            linkedCultureRecordId: cultureRecords[i * 6 + 2]?.id || null,
            createdAt: new Date(2026, 5, 11 + Math.floor(i / 2)).toISOString(),
          };
          finalConclusions.push(conclusion);

          cultureRecords.forEach((cr) => {
            if (cr.sampleId === sampleId && cr.id === conclusion.linkedCultureRecordId) {
              cr.linkedConclusionId = conclusion.id;
            }
          });
        }
      }
    }
  }

  const duplicateLog: DuplicateLog = {
    id: generateId(),
    sampleBarcode: 'ANI-2026-0008',
    duplicateType: 'barcode',
    detectedAt: new Date(2026, 5, 10).toISOString(),
    resolution: 'pending',
    sampleIds: [samples[5].id, samples[7].id],
  };
  duplicateLogs.push(duplicateLog);

  return {
    samples,
    cultureRecords,
    reviewRounds,
    reviewOpinions,
    finalConclusions,
    duplicateLogs,
  };
}

export function getStatusText(status: Sample['status']): string {
  const map: Record<Sample['status'], string> = {
    pending: '待核对',
    reviewing: '复核中',
    approved: '已通过',
    rejected: '已驳回',
    duplicate: '重复记录',
  };
  return map[status];
}

export function getStatusColor(status: Sample['status']): string {
  const map: Record<Sample['status'], string> = {
    pending: 'bg-gray-100 text-gray-700 border-gray-200',
    reviewing: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    duplicate: 'bg-rose-100 text-rose-800 border-rose-300',
  };
  return map[status];
}

export function getConclusionText(result: FinalConclusion['result']): string {
  const map: Record<FinalConclusion['result'], string> = {
    pass: '通过',
    fail: '不通过',
    pending: '待确认',
  };
  return map[result];
}

export function getConclusionColor(result: FinalConclusion['result']): string {
  const map: Record<FinalConclusion['result'], string> = {
    pass: 'text-emerald-600 bg-emerald-50',
    fail: 'text-rose-600 bg-rose-50',
    pending: 'text-amber-600 bg-amber-50',
  };
  return map[result];
}
