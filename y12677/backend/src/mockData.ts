import type { ModelRecord, HistoryRecord, ProcessingRecord } from './types';

function generateProcessingRecords(startTime: string, endTime: string, interval: number): ProcessingRecord[] {
  const records: ProcessingRecord[] = [];
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  let current = start;
  let segmentId = 1;

  while (current <= end) {
    records.push({
      timestamp: new Date(current).toISOString(),
      segmentId: segmentId,
      displacement: Number((Math.random() * 10 - 5).toFixed(3)),
      stress: Number((Math.random() * 200 + 100).toFixed(2)),
      temperature: Number((Math.random() * 15 + 18).toFixed(1))
    });
    current += interval * 1000;
    segmentId++;
  }
  return records;
}

export const mockRecords: ModelRecord[] = [
  {
    id: 'REC-2026-001',
    runTime: '2026-06-08T09:30:00.000Z',
    status: 'pending',
    timeParameters: {
      startTime: '2026-06-08T08:00:00.000Z',
      endTime: '2026-06-08T09:00:00.000Z',
      samplingInterval: 300
    },
    unitConversionError: {
      hasError: true,
      description: '毫米与米单位换算错误，导致位移数据偏差1000倍',
      errorDetails: [
        '位移字段displacement原始单位为毫米，计算时误作为米处理',
        '应力单位MPa与Pa换算系数错误',
        '数据导出时未统一单位制，报告中混合使用mm和m'
      ]
    },
    processingRecords: generateProcessingRecords(
      '2026-06-08T08:00:00.000Z',
      '2026-06-08T09:00:00.000Z',
      300
    ),
    conclusion: '管片错缝位移超出预警阈值3.2mm，需复核单位换算后重新评估。',
    createdAt: '2026-06-08T09:35:00.000Z',
    updatedAt: '2026-06-08T09:35:00.000Z'
  },
  {
    id: 'REC-2026-002',
    runTime: '2026-06-07T14:15:00.000Z',
    status: 'approved',
    timeParameters: {
      startTime: '2026-06-07T12:00:00.000Z',
      endTime: '2026-06-07T14:00:00.000Z',
      samplingInterval: 600
    },
    unitConversionError: {
      hasError: false,
      description: '',
      errorDetails: []
    },
    processingRecords: generateProcessingRecords(
      '2026-06-07T12:00:00.000Z',
      '2026-06-07T14:00:00.000Z',
      600
    ),
    conclusion: '管片状态正常，最大错缝位移0.85mm，在安全范围内。',
    createdAt: '2026-06-07T14:20:00.000Z',
    updatedAt: '2026-06-07T16:45:00.000Z'
  },
  {
    id: 'REC-2026-003',
    runTime: '2026-06-06T10:00:00.000Z',
    status: 'reviewed',
    timeParameters: {
      startTime: '2026-06-06T08:00:00.000Z',
      endTime: '2026-06-06T10:00:00.000Z',
      samplingInterval: 300
    },
    unitConversionError: {
      hasError: true,
      description: '温度单位摄氏度与华氏度混淆',
      errorDetails: [
        '温度传感器输出为华氏度，系统按摄氏度解析',
        '导致温度趋势图异常波动'
      ]
    },
    processingRecords: generateProcessingRecords(
      '2026-06-06T08:00:00.000Z',
      '2026-06-06T10:00:00.000Z',
      300
    ),
    conclusion: '单位换算问题已复核，温度修正后应力计算趋于合理。',
    createdAt: '2026-06-06T10:05:00.000Z',
    updatedAt: '2026-06-06T15:30:00.000Z'
  },
  {
    id: 'REC-2026-004',
    runTime: '2026-06-05T16:20:00.000Z',
    status: 'pending',
    timeParameters: {
      startTime: '2026-06-05T14:00:00.000Z',
      endTime: '2026-06-05T16:00:00.000Z',
      samplingInterval: 180
    },
    unitConversionError: {
      hasError: true,
      description: '时间采样间隔单位分钟与秒混淆，实际采样间隔180秒被误写为180分钟',
      errorDetails: [
        '采样间隔参数配置错误',
        '导致处理记录时间轴跨度异常'
      ]
    },
    processingRecords: generateProcessingRecords(
      '2026-06-05T14:00:00.000Z',
      '2026-06-05T16:00:00.000Z',
      180
    ),
    conclusion: '时间参数异常，需修正采样间隔后重新运行分析。',
    createdAt: '2026-06-05T16:25:00.000Z',
    updatedAt: '2026-06-05T16:25:00.000Z'
  },
  {
    id: 'REC-2026-005',
    runTime: '2026-06-04T11:45:00.000Z',
    status: 'approved',
    timeParameters: {
      startTime: '2026-06-04T09:00:00.000Z',
      endTime: '2026-06-04T11:30:00.000Z',
      samplingInterval: 300
    },
    unitConversionError: {
      hasError: false,
      description: '',
      errorDetails: []
    },
    processingRecords: generateProcessingRecords(
      '2026-06-04T09:00:00.000Z',
      '2026-06-04T11:30:00.000Z',
      300
    ),
    conclusion: '管片错缝值稳定在0.3-0.6mm区间，结构安全。',
    createdAt: '2026-06-04T11:50:00.000Z',
    updatedAt: '2026-06-04T13:10:00.000Z'
  }
];

export const mockHistoryRecords: Record<string, HistoryRecord[]> = {
  'REC-2026-002': [
    {
      id: 'HIST-002-01',
      recordId: 'REC-2026-002',
      modifier: '张工（展馆讲解员）',
      modifiedAt: '2026-06-07T16:45:00.000Z',
      modificationReason: '初始数据经复核确认无单位换算问题，数据质量良好，审核通过',
      changes: [
        {
          field: 'status',
          oldValue: 'pending',
          newValue: 'approved'
        }
      ],
      processingOpinion: '所有测量数据单位统一，位移、应力、温度数值合理，同意通过。'
    }
  ],
  'REC-2026-003': [
    {
      id: 'HIST-003-01',
      recordId: 'REC-2026-003',
      modifier: '李工（展馆讲解员）',
      modifiedAt: '2026-06-06T15:30:00.000Z',
      modificationReason: '修正温度单位换算：华氏度转摄氏度公式应用错误，已重新换算所有温度数据',
      changes: [
        {
          field: 'unitConversionError.description',
          oldValue: '温度单位异常',
          newValue: '温度单位摄氏度与华氏度混淆'
        },
        {
          field: 'status',
          oldValue: 'pending',
          newValue: 'reviewed'
        },
        {
          field: 'conclusion',
          oldValue: '温度数据异常，无法评估结构状态。',
          newValue: '单位换算问题已复核，温度修正后应力计算趋于合理。'
        }
      ],
      processingOpinion: '使用F=(C×9/5)+32反向验证，修正后温度范围22-28℃，与现场实际一致。建议后续增加单位自检机制。'
    }
  ],
  'REC-2026-005': [
    {
      id: 'HIST-005-01',
      recordId: 'REC-2026-005',
      modifier: '王工（展馆讲解员）',
      modifiedAt: '2026-06-04T13:10:00.000Z',
      modificationReason: '复核通过，数据完整且无单位换算问题',
      changes: [
        {
          field: 'status',
          oldValue: 'reviewed',
          newValue: 'approved'
        }
      ],
      processingOpinion: '连续两小时监测数据稳定，单位统一，结论可信。'
    }
  ]
};
