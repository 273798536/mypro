import type { Draft } from '@/types';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function genMockDataRows(draftId: string): Draft['dataRows'] {
  const rows: Draft['dataRows'] = [];
  const total = 60;
  for (let i = 0; i < total; i++) {
    const freq = (i * 1000) / total;
    const baseAmp = Math.sin(freq / 50) * 50 + 60 + Math.random() * 15;
    const noise = Math.random() * 25;
    const isEmpty = i === 12 || i === 37;
    const isDuplicate = i === 8 || i === 23 || i === 45;

    let availability: Draft['dataRows'][0]['availability'] = null;
    let reviewStatus: Draft['dataRows'][0]['reviewStatus'] = 'none';

    if (i < 30) availability = 'available';
    else if (i < 45) availability = 'pending';
    else if (i < 52) availability = 'recollect';

    if (i < 20) reviewStatus = 'approved';
    else if (i < 35) reviewStatus = 'pending';

    rows.push({
      id: uid(),
      draftId,
      index: i + 1,
      xValue: isEmpty ? null : Number(freq.toFixed(2)),
      yValue: isEmpty ? null : Number((baseAmp + noise).toFixed(3)),
      fftAmplitude: isEmpty ? null : Number((baseAmp + noise * 0.7).toFixed(3)),
      filteredAmplitude: isEmpty ? null : Number((baseAmp).toFixed(3)),
      remark:
        isDuplicate
          ? '与第' + (i - 5) + '行数据重复，来源实验B组'
          : i === 18
            ? '边界样例调整：低通截止由120改为150'
            : i === 29
              ? '评分记录补录：助教李确认'
              : undefined,
      availability,
      reviewStatus,
      isDuplicate,
      isEmpty,
    });
  }
  return rows;
}

function genVersionLogs(draftId: string): Draft['versionLogs'] {
  return [
    {
      id: uid(),
      draftId,
      version: 'v0.1',
      changelog: '初始草稿：导入实验A组原始数据60条',
      timestamp: '2026-06-05 14:23',
      author: '张助教',
    },
    {
      id: uid(),
      draftId,
      version: 'v0.2',
      changelog: '评分记录补一版：第20-30行重新打分',
      timestamp: '2026-06-06 09:15',
      author: '张助教',
    },
    {
      id: uid(),
      draftId,
      version: 'v0.3',
      changelog: '边界样例改一句：低通截止频率调整',
      timestamp: '2026-06-07 16:42',
      author: '李助教',
    },
    {
      id: uid(),
      draftId,
      version: 'v1.0',
      changelog: '完成首轮误差分析，标记可用30条',
      timestamp: '2026-06-08 11:08',
      author: '张助教',
    },
  ];
}

function genErrorItems(draftId: string, rows: Draft['dataRows']): Draft['errorItems'] {
  return [
    {
      id: uid(),
      draftId,
      type: 'data',
      description: '第13行数据为空值，频谱图出现断点，影响连续区间分析',
      action: 'fill_material',
      sourceRef: '原始材料-实验A组_第3页_第12行',
      relatedRowId: rows[12]?.id,
    },
    {
      id: uid(),
      draftId,
      type: 'data',
      description: '第38行数据为空值，高频段数据缺失',
      action: 'fill_material',
      sourceRef: '原始材料-实验A组_第7页_第5行',
      relatedRowId: rows[37]?.id,
    },
    {
      id: uid(),
      draftId,
      type: 'data',
      description: '第9行与第4行数据完全重复，可能为录入时误复制',
      action: 'fill_material',
      sourceRef: '计算草稿-备注比对',
      relatedRowId: rows[8]?.id,
    },
    {
      id: uid(),
      draftId,
      type: 'formula',
      description: '低通截止频率150Hz位于奈奎斯特边界，滤波结果出现吉布斯效应',
      action: 'adjust_caliber',
      sourceRef: '公式计算-v0.3版本参数变更记录',
    },
    {
      id: uid(),
      draftId,
      type: 'counterexample',
      description: '反例CE-003未通过：零输入信号滤波后残余振幅>0.001',
      action: 'adjust_caliber',
      sourceRef: '反例生成器-边界条件组B',
    },
  ];
}

function genCounterExamples(draftId: string): Draft['counterExamples'] {
  return [
    {
      id: uid(),
      draftId,
      boundaryCondition: '零输入信号',
      inputData: Array.from({ length: 32 }, (_, i) => ({ x: i, y: 0 })),
      expectedOutput: '输出全为0，残差 < 0.001',
      actualOutput: '残差峰值 0.0003',
      passed: true,
    },
    {
      id: uid(),
      draftId,
      boundaryCondition: '纯直流信号',
      inputData: Array.from({ length: 32 }, (_, i) => ({ x: i, y: 1 })),
      expectedOutput: '输出恒定，无振荡',
      actualOutput: '恒定值 0.9987',
      passed: true,
    },
    {
      id: uid(),
      draftId,
      boundaryCondition: '截止频率处单频信号',
      inputData: Array.from({ length: 64 }, (_, i) => ({
        x: i,
        y: Math.sin((2 * Math.PI * 150 * i) / 1000),
      })),
      expectedOutput: '衰减 > 3dB',
      actualOutput: '衰减 2.1dB，不满足',
      passed: false,
    },
    {
      id: uid(),
      draftId,
      boundaryCondition: '奈奎斯特频率处信号',
      inputData: Array.from({ length: 32 }, (_, i) => ({ x: i, y: i % 2 === 0 ? 1 : -1 })),
      expectedOutput: '完全滤除',
      actualOutput: '残余振幅 0.0015',
      passed: false,
    },
  ];
}

export function createMockDrafts(): Draft[] {
  const draft1Id = 'draft-' + uid();
  const draft1Rows = genMockDataRows(draft1Id);

  const draft1: Draft = {
    id: draft1Id,
    title: '实验A组-温度传感信号滤波',
    author: '张助教',
    createdAt: '2026-06-05 14:20',
    updatedAt: '2026-06-08 11:08',
    currentVersion: 'v1.0',
    fourierConfig: {
      sampleRate: 1000,
      windowSize: 64,
      lowPassCutoff: 150,
      highPassCutoff: 5,
      windowFunction: 'hanning',
    },
    dataRows: draft1Rows,
    versionLogs: genVersionLogs(draft1Id),
    errorItems: genErrorItems(draft1Id, draft1Rows),
    counterExamples: genCounterExamples(draft1Id),
  };

  const draft2Id = 'draft-' + uid();
  const draft2Rows = genMockDataRows(draft2Id);

  const draft2: Draft = {
    id: draft2Id,
    title: '振动台实验-频域降噪对比',
    author: '李助教',
    createdAt: '2026-06-02 10:00',
    updatedAt: '2026-06-07 18:30',
    currentVersion: 'v0.4',
    fourierConfig: {
      sampleRate: 2000,
      windowSize: 128,
      lowPassCutoff: 400,
      highPassCutoff: 10,
      windowFunction: 'hamming',
    },
    dataRows: draft2Rows.slice(0, 40),
    versionLogs: genVersionLogs(draft2Id).slice(0, 2),
    errorItems: genErrorItems(draft2Id, draft2Rows).slice(0, 3),
    counterExamples: genCounterExamples(draft2Id).slice(0, 2),
  };

  return [draft1, draft2];
}
