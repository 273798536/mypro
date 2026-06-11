import type {
  FeedingRecord,
  Sample,
  SampleVersion,
  ImageAnnotation,
  PathologyNote,
  CorrectionLog,
  WorkflowRun,
  Anomaly,
  SpeciesSynonymCheck,
  AppSettings,
} from '../types';
import {
  setFeedingRecords,
  setSamples,
  setSampleVersions,
  setImageAnnotations,
  setPathologyNotes,
  setCorrectionLogs,
  setWorkflowRuns,
  setAnomalies,
  setSpeciesSynonymChecks,
  setAppSettings,
  setToStorage,
  STORAGE_KEYS,
} from '../utils/storage';
import { DICTIONARY_VERSION } from '../utils/species';

/**
 * 生成指定日期范围内的 ISO 格式时间字符串
 *
 * @param daysAgo - 距离今天的天数（0 表示今天）
 * @param hour - 小时（0-23）
 * @param minute - 分钟（0-59）
 * @returns ISO 格式时间字符串
 */
function daysAgoISO(daysAgo: number, hour: number = 10, minute: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/**
 * 生成日期字符串（YYYY-MM-DD）
 */
function daysAgoDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

/**
 * 初始化 Mock 数据
 * 创建完整的示例数据集并保存到 LocalStorage
 * 数据包含：
 * - 10 条投喂记录
 * - 15 个样本
 * - 多个样本版本
 * - 图片标注
 * - 病理备注
 * - 修正日志
 * - 3 次工作流运行
 * - 异常记录
 * - 物种名同义校验记录
 *
 * 所有数据的外键关联正确，日期分布在最近一个月内
 */
export function initMockData(): void {
  const researchers = ['张伟', '李娜', '王磊', '赵敏', '陈浩'];
  const groups = ['A', 'B', 'C', 'D'];

  const feedingRecords: FeedingRecord[] = [];
  for (let i = 0; i < 10; i++) {
    const daysAgo = 28 - i * 3;
    feedingRecords.push({
      id: `feed_rec_${i + 1}`,
      date: daysAgoDate(daysAgo),
      researcher: researchers[i % researchers.length],
      group_id: groups[i % groups.length],
      notes: [
        '正常投喂，鱼群状态良好',
        '投喂量增加5%，观察生长情况',
        '更换新型饲料，记录反应',
        '水温略有上升，注意观察',
        '部分鱼只食欲不佳',
      ][i % 5],
      created_at: daysAgoISO(daysAgo, 9, 0),
      updated_at: daysAgoISO(daysAgo, 9, 30),
    });
  }

  const rawSpeciesNames = [
    '斑马鱼',
    '蓝条鱼',
    '青鳉鱼',
    '稻田鱼',
    '孔雀鱼',
    '彩虹鱼',
    '斑马鱼',
    '青鳉鱼',
    'zebrafish',
    '孔雀',
    '金鱼',
    '金鲫鱼',
    '鲤鱼',
    '锦鲤',
    '斑马鱼',
  ];

  const standardSpeciesNames = rawSpeciesNames.map((name) => {
    const dict: Record<string, string> = {
      斑马鱼: '斑马鱼',
      蓝条鱼: '斑马鱼',
      zebrafish: '斑马鱼',
      青鳉鱼: '青鳉鱼',
      稻田鱼: '青鳉鱼',
      孔雀鱼: '孔雀鱼',
      彩虹鱼: '孔雀鱼',
      孔雀: '孔雀鱼',
      金鱼: '金鱼',
      金鲫鱼: '金鱼',
      鲤鱼: '鲤鱼',
      锦鲤: '鲤鱼',
    };
    return dict[name] || name;
  });

  const samples: Sample[] = [];
  for (let i = 0; i < 15; i++) {
    const daysAgo = 25 - Math.floor(i / 3) * 5;
    const feedIdx = i % feedingRecords.length;
    samples.push({
      id: `sample_${i + 1}`,
      feeding_record_id: feedingRecords[feedIdx].id,
      species_name: rawSpeciesNames[i],
      standard_species_name: standardSpeciesNames[i],
      group: groups[i % groups.length],
      image_url: i === 7 || i === 12 ? '' : `/images/sample_${i + 1}.jpg`,
      current_version_id: `samp_ver_${i + 1}_v2`,
      created_at: daysAgoISO(daysAgo, 10, i),
      updated_at: daysAgoISO(daysAgo, 14, i),
    });
  }

  const workflowRuns: WorkflowRun[] = [
    {
      id: 'run_001',
      version_label: 'v2026.05.20-r1',
      model_version: 'fish-path-v1.0.0',
      group_filter: null,
      status: 'completed',
      started_at: daysAgoISO(22, 8, 0),
      completed_at: daysAgoISO(22, 10, 30),
      created_by: '张伟',
    },
    {
      id: 'run_002',
      version_label: 'v2026.06.01-r1',
      model_version: 'fish-path-v1.1.0',
      group_filter: 'A',
      status: 'completed',
      started_at: daysAgoISO(10, 9, 0),
      completed_at: daysAgoISO(10, 11, 45),
      created_by: '李娜',
    },
    {
      id: 'run_003',
      version_label: 'v2026.06.10-r1',
      model_version: 'fish-path-v1.2.0',
      group_filter: null,
      status: 'completed',
      started_at: daysAgoISO(1, 7, 30),
      completed_at: daysAgoISO(1, 10, 15),
      created_by: '王磊',
    },
  ];

  const sampleVersions: SampleVersion[] = [];
  for (let i = 0; i < 15; i++) {
    sampleVersions.push({
      id: `samp_ver_${i + 1}_v1`,
      sample_id: `sample_${i + 1}`,
      version_number: 1,
      run_id: workflowRuns[0].id,
      status: 'ai_reviewed',
      created_at: daysAgoISO(22, 9, i),
      created_by: 'AI-System',
    });
    sampleVersions.push({
      id: `samp_ver_${i + 1}_v2`,
      sample_id: `sample_${i + 1}`,
      version_number: 2,
      run_id: workflowRuns[2].id,
      status: i % 4 === 0 ? 'final' : i % 4 === 1 ? 'human_corrected' : 'ai_reviewed',
      created_at: daysAgoISO(1, 8, i),
      created_by: i % 3 === 0 ? 'AI-System' : researchers[i % researchers.length],
    });
  }

  const labels = ['肝肿大', '脾坏死', '肾囊肿', '肠道炎症', '鳃丝增生', '心肌病变'];
  const annotations: ImageAnnotation[] = [];
  let annIdx = 1;
  for (let i = 0; i < 15; i++) {
    const verId = `samp_ver_${i + 1}_v2`;
    const numAnnotations = 2 + (i % 4);
    for (let j = 0; j < numAnnotations; j++) {
      const isLowConf = (i + j) % 5 === 0;
      annotations.push({
        id: `ann_${annIdx}`,
        version_id: verId,
        x: 50 + j * 80 + (i % 3) * 20,
        y: 40 + j * 60 + (i % 2) * 15,
        width: 60 + (j % 3) * 20,
        height: 50 + (j % 2) * 25,
        label: labels[(i + j) % labels.length],
        confidence: isLowConf ? 0.35 + (j % 3) * 0.08 : 0.72 + (i % 5) * 0.05,
        source: (i + j) % 6 === 0 ? 'human' : 'ai',
        created_at: daysAgoISO(1, 9, annIdx),
      });
      annIdx++;
    }
  }

  const pathologyNotes: PathologyNote[] = [
    {
      id: 'note_001',
      version_id: 'samp_ver_1_v2',
      content: '肝组织出现明显水肿，肝细胞排列紊乱，建议重点观察',
      annotation_id: 'ann_1',
      created_at: daysAgoISO(1, 10, 0),
      created_by: '赵敏',
    },
    {
      id: 'note_002',
      version_id: 'samp_ver_2_v2',
      content: '该样本脾脏有轻微坏死迹象，与投喂饲料变化可能相关',
      annotation_id: 'ann_4',
      created_at: daysAgoISO(1, 10, 15),
      created_by: '陈浩',
    },
    {
      id: 'note_003',
      version_id: 'samp_ver_3_v2',
      content: '整体状态良好，无明显病理变化，可作为对照组参考',
      annotation_id: null,
      created_at: daysAgoISO(1, 10, 30),
      created_by: '张伟',
    },
    {
      id: 'note_004',
      version_id: 'samp_ver_5_v2',
      content: '肾脏囊肿较大，可能影响正常生理功能',
      annotation_id: 'ann_10',
      created_at: daysAgoISO(1, 11, 0),
      created_by: '李娜',
    },
    {
      id: 'note_005',
      version_id: 'samp_ver_8_v2',
      content: '肠道炎症程度中等，需跟踪后续样本发展趋势',
      annotation_id: 'ann_18',
      created_at: daysAgoISO(1, 11, 20),
      created_by: '王磊',
    },
  ];

  const correctionLogs: CorrectionLog[] = [
    {
      id: 'corr_001',
      version_id: 'samp_ver_1_v2',
      field_name: 'label',
      old_value: '肝肿大',
      new_value: '肝细胞脂肪变性',
      reason: 'AI误判，实际观察为脂肪变性而非水肿性肿大',
      created_at: daysAgoISO(1, 12, 0),
      created_by: '赵敏',
    },
    {
      id: 'corr_002',
      version_id: 'samp_ver_4_v2',
      field_name: 'confidence',
      old_value: '0.45',
      new_value: '0.92',
      reason: '人工复核确认标注正确，提升置信度',
      created_at: daysAgoISO(1, 12, 30),
      created_by: '陈浩',
    },
    {
      id: 'corr_003',
      version_id: 'samp_ver_6_v2',
      field_name: 'bbox',
      old_value: 'x:130,y:100,w:80,h:70',
      new_value: 'x:125,y:95,w:90,h:80',
      reason: '标注框范围偏小，需包含全部病变区域',
      created_at: daysAgoISO(1, 13, 0),
      created_by: '张伟',
    },
    {
      id: 'corr_004',
      version_id: 'samp_ver_9_v2',
      field_name: 'label',
      old_value: '脾坏死',
      new_value: '脾淤血',
      reason: '经病理专家确认，应为淤血而非坏死',
      created_at: daysAgoISO(1, 13, 45),
      created_by: '李娜',
    },
  ];

  const anomalies: Anomaly[] = [
    {
      id: 'anom_001',
      run_id: 'run_003',
      sample_id: 'sample_8',
      type: 'missing_material',
      severity: 'high',
      description: '样本 sample_8 缺少图片数据，无法进行AI分析',
      next_action: 'supply_material',
      resolved: false,
      resolved_at: null,
    },
    {
      id: 'anom_002',
      run_id: 'run_003',
      sample_id: 'sample_13',
      type: 'missing_material',
      severity: 'high',
      description: '样本 sample_13 缺少图片数据，无法进行AI分析',
      next_action: 'supply_material',
      resolved: true,
      resolved_at: daysAgoISO(1, 14, 0),
    },
    {
      id: 'anom_003',
      run_id: 'run_003',
      sample_id: 'sample_2',
      type: 'species_synonym',
      severity: 'low',
      description: '物种名称"蓝条鱼"为"斑马鱼"的别名，建议使用标准名',
      next_action: 'adjust_standard',
      resolved: false,
      resolved_at: null,
    },
    {
      id: 'anom_004',
      run_id: 'run_003',
      sample_id: 'sample_4',
      type: 'species_synonym',
      severity: 'low',
      description: '物种名称"稻田鱼"为"青鳉鱼"的别名，建议使用标准名',
      next_action: 'adjust_standard',
      resolved: true,
      resolved_at: daysAgoISO(1, 14, 30),
    },
    {
      id: 'anom_005',
      run_id: 'run_003',
      sample_id: 'sample_5',
      type: 'annotation_low_conflict',
      severity: 'medium',
      description: '样本 sample_5 有 2 个AI标注置信度低于0.6，需要人工复核',
      next_action: 'manual_review',
      resolved: false,
      resolved_at: null,
    },
    {
      id: 'anom_006',
      run_id: 'run_003',
      sample_id: 'sample_10',
      type: 'annotation_low_conflict',
      severity: 'medium',
      description: '样本 sample_10 有 1 个AI标注置信度低于0.6，需要人工复核',
      next_action: 'manual_review',
      resolved: true,
      resolved_at: daysAgoISO(1, 15, 0),
    },
    {
      id: 'anom_007',
      run_id: 'run_002',
      sample_id: 'sample_1',
      type: 'other',
      severity: 'low',
      description: '样本 sample_1 在预处理阶段检测到潜在的数据质量问题，建议人工确认',
      next_action: 'manual_review',
      resolved: true,
      resolved_at: daysAgoISO(10, 16, 0),
    },
    {
      id: 'anom_008',
      run_id: 'run_003',
      sample_id: 'sample_6',
      type: 'species_synonym',
      severity: 'low',
      description: '物种名称"彩虹鱼"为"孔雀鱼"的别名，建议使用标准名',
      next_action: 'adjust_standard',
      resolved: false,
      resolved_at: null,
    },
  ];

  const synonymChecks: SpeciesSynonymCheck[] = [
    {
      id: 'syn_001',
      run_id: 'run_003',
      input_name: '蓝条鱼',
      standard_name: '斑马鱼',
      synonyms: ['蓝条鱼', '印度斑马鱼', '孟加拉斑马鱼', 'zebrafish', '条纹鱼'],
      dictionary_version: DICTIONARY_VERSION,
      reason_blocked: '输入名称"蓝条鱼"为斑马鱼（Danio rerio）的别名，已自动标准化为"斑马鱼"',
      resolved: false,
    },
    {
      id: 'syn_002',
      run_id: 'run_003',
      input_name: '稻田鱼',
      standard_name: '青鳉鱼',
      synonyms: ['稻田鱼', '青鳉', '米鱼', 'killifish', 'medaka'],
      dictionary_version: DICTIONARY_VERSION,
      reason_blocked: '输入名称"稻田鱼"为青鳉鱼（Oryzias latipes）的别名，已自动标准化为"青鳉鱼"',
      resolved: true,
    },
    {
      id: 'syn_003',
      run_id: 'run_003',
      input_name: '彩虹鱼',
      standard_name: '孔雀鱼',
      synonyms: ['彩虹鱼', '百万鱼', '古比鱼', 'guppy', 'rainbow fish'],
      dictionary_version: DICTIONARY_VERSION,
      reason_blocked: '输入名称"彩虹鱼"为孔雀鱼（Poecilia reticulata）的别名，已自动标准化为"孔雀鱼"',
      resolved: false,
    },
    {
      id: 'syn_004',
      run_id: 'run_003',
      input_name: 'zebrafish',
      standard_name: '斑马鱼',
      synonyms: ['蓝条鱼', '印度斑马鱼', 'zebrafish', 'zebra danio'],
      dictionary_version: DICTIONARY_VERSION,
      reason_blocked: '输入名称"zebrafish"为斑马鱼（Danio rerio）的英文名，已自动标准化为"斑马鱼"',
      resolved: false,
    },
    {
      id: 'syn_005',
      run_id: 'run_003',
      input_name: '孔雀',
      standard_name: '孔雀鱼',
      synonyms: ['彩虹鱼', '百万鱼', '古比鱼', '孔雀', 'guppy'],
      dictionary_version: DICTIONARY_VERSION,
      reason_blocked: '输入名称"孔雀"为孔雀鱼（Poecilia reticulata）的简称，已自动标准化为"孔雀鱼"',
      resolved: true,
    },
    {
      id: 'syn_006',
      run_id: 'run_002',
      input_name: '金鲫鱼',
      standard_name: '金鱼',
      synonyms: ['金鲫鱼', 'goldfish'],
      dictionary_version: DICTIONARY_VERSION,
      reason_blocked: '输入名称"金鲫鱼"为金鱼（Carassius auratus）的别名，已自动标准化为"金鱼"',
      resolved: true,
    },
  ];

  const appSettings: AppSettings = {
    current_role: 'researcher',
    selected_run_id: 'run_003',
  };

  setFeedingRecords(feedingRecords);
  setSamples(samples);
  setSampleVersions(sampleVersions);
  setImageAnnotations(annotations);
  setPathologyNotes(pathologyNotes);
  setCorrectionLogs(correctionLogs);
  setWorkflowRuns(workflowRuns);
  setAnomalies(anomalies);
  setSpeciesSynonymChecks(synonymChecks);
  setAppSettings(appSettings);
  setToStorage(STORAGE_KEYS.DATA_INITIALIZED, true);
}

/**
 * 检查 Mock 数据是否已初始化
 *
 * @returns 是否已初始化
 */
export function isMockDataInitialized(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DATA_INITIALIZED);
    return raw === 'true';
  } catch {
    return false;
  }
}

/**
 * 清除所有 Mock 数据
 */
export function clearMockData(): void {
  const keys = Object.values(STORAGE_KEYS);
  for (const key of keys) {
    localStorage.removeItem(key);
  }
}

/**
 * 重新初始化 Mock 数据（先清除再初始化）
 */
export function resetMockData(): void {
  clearMockData();
  initMockData();
}
