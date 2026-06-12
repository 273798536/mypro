const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function prepareMaterials(outputDir) {
  ensureDir(outputDir);

  const normalRecord = {
    recordId: 'REC-20260612-001',
    version: 'v2.3.1',
    recordedAt: '2026-06-12T09:30:00+08:00',
    recordedBy: '老唐',
    venue: '训练馆A区-3号场地',
    equipment: {
      microphone: 'Shure SM58 #A023',
      speaker: 'JBL EON615 #S117',
      analyzer: 'NTi Audio XL2 #AN042'
    },
    parameters: {
      rt60_125hz: 1.42,
      rt60_250hz: 1.28,
      rt60_500hz: 1.15,
      rt60_1khz: 1.08,
      rt60_2khz: 0.97,
      rt60_4khz: 0.89,
      rt60_8khz: 0.76,
      c50_500hz: 3.2,
      c50_1khz: 4.5,
      c50_2khz: 5.8,
      d50_500hz: 0.56,
      d50_1khz: 0.63,
      d50_2khz: 0.71,
      clarity_500hz: 2.1,
      clarity_1khz: 3.8,
      definition: 0.68
    },
    source: {
      type: 'manual',
      logFile: 'measurement_log_20260612_0930.xlsx',
      sheet: 'Sheet1',
      rows: 'B12:B28'
    },
    remark: '正常训练前校准，室温24℃，湿度58%'
  };
  fs.writeFileSync(
    path.join(outputDir, 'normal_record_REC-20260612-001.json'),
    JSON.stringify(normalRecord, null, 2),
    'utf8'
  );
  console.log(chalk.green('  ✓ ') + '正常记录: normal_record_REC-20260612-001.json');

  const repairNote = {
    noteId: 'REP-20260611-003',
    createdAt: '2026-06-11T17:45:00+08:00',
    createdBy: '老王',
    venue: '训练馆A区-3号场地',
    equipment: 'JBL EON615 #S117',
    issueType: '高频单元异响',
    description: '下午训练时发现3号场地主音箱高频单元有滋滋声，音量超过60%时明显。',
    action: '更换高频驱动单元，型号替换为原规格2414H-1',
    partsReplaced: ['高频驱动单元 x1 (SN: DR-20260528-017)'],
    completedAt: '2026-06-11T19:20:00+08:00',
    completedBy: '老王',
    followUp: '建议第二天重新做一次混响参数校准，确认更换后声场正常。',
    status: '待次日验证',
    versionTag: '参数基线变更：更换扬声器单元后需重新校准，原v2.3.0作废'
  };
  fs.writeFileSync(
    path.join(outputDir, 'repair_note_REP-20260611-003.json'),
    JSON.stringify(repairNote, null, 2),
    'utf8'
  );
  console.log(chalk.green('  ✓ ') + '维修备注: repair_note_REP-20260611-003.json');

  const gapRecord = {
    recordId: 'REC-20260612-002',
    version: 'v2.3.2-pending',
    recordedAt: '2026-06-12T15:10:00+08:00',
    recordedBy: '老唐',
    venue: '训练馆A区-3号场地',
    equipment: {
      microphone: 'Shure SM58 #A023',
      speaker: 'JBL EON615 #S117 (已换高频单元)',
      analyzer: 'NTi Audio XL2 #AN042'
    },
    parameters: {
      rt60_125hz: 1.45,
      rt60_250hz: 1.31,
      rt60_500hz: null,
      rt60_1khz: 1.12,
      rt60_2khz: null,
      rt60_4khz: 0.91,
      rt60_8khz: 0.78,
      c50_500hz: null,
      c50_1khz: 4.7,
      c50_2khz: null,
      d50_500hz: null,
      d50_1khz: 0.64,
      d50_2khz: null,
      clarity_500hz: null,
      clarity_1khz: 4.0,
      definition: null
    },
    source: {
      type: 'manual',
      logFile: 'measurement_log_20260612_1510.xlsx',
      sheet: 'Sheet1',
      rows: 'B12:B28',
      note: '500Hz和2kHz频段测量时分析仪突发告警，数据未能稳定采集'
    },
    remark: '更换高频单元后首次复测，中间频段数据缺失，待补测。',
    hasGap: true,
    gapBands: ['rt60_500hz', 'rt60_2khz', 'c50_500hz', 'c50_2khz', 'd50_500hz', 'd50_2khz', 'clarity_500hz', 'definition']
  };
  fs.writeFileSync(
    path.join(outputDir, 'gap_record_REC-20260612-002.json'),
    JSON.stringify(gapRecord, null, 2),
    'utf8'
  );
  console.log(chalk.green('  ✓ ') + '带采样缺口记录: gap_record_REC-20260612-002.json');

  const supplementaryNote = {
    noteId: 'SUP-20260612-001',
    createdAt: '2026-06-12T20:15:00+08:00',
    createdBy: '老唐',
    relatedRecords: ['REC-20260612-002', 'REP-20260611-003'],
    content: '6月12日下午3点复测3号场地混响参数，中途NTi分析仪500Hz和2kHz频段持续告警，怀疑是新换高频单元与分频器匹配问题。已预约厂家技术支持下周二（6月16日）到场联合调试。此期间3号场地不安排正式训练，仅用于基础发声练习。参数版本暂以v2.3.1为准，但需备注高频单元已更换。',
    attachedFiles: ['现场照片_20260612_1523.jpg', '分析仪告警截图_20260612_1518.png'],
    urgent: false,
    nextAction: '等待厂家6月16日到场联合调试后重新做完整参数测量'
  };
  fs.writeFileSync(
    path.join(outputDir, 'supplementary_note_SUP-20260612-001.json'),
    JSON.stringify(supplementaryNote, null, 2),
    'utf8'
  );
  console.log(chalk.green('  ✓ ') + '后补说明: supplementary_note_SUP-20260612-001.json');

  const manifest = {
    generatedAt: new Date().toISOString(),
    materialType: 'acoustic_reverb_playback_package',
    packageVersion: '1.0',
    contents: [
      { type: 'normal_record', file: 'normal_record_REC-20260612-001.json', recordId: 'REC-20260612-001' },
      { type: 'repair_note', file: 'repair_note_REP-20260611-003.json', noteId: 'REP-20260611-003' },
      { type: 'gap_record', file: 'gap_record_REC-20260612-002.json', recordId: 'REC-20260612-002' },
      { type: 'supplementary_note', file: 'supplementary_note_SUP-20260612-001.json', noteId: 'SUP-20260612-001' }
    ],
    responsible: '老唐',
    description: '训练馆A区3号场地混响参数回放材料包（含维修后复测缺口场景）'
  };
  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
  console.log(chalk.green('  ✓ ') + '材料清单: manifest.json');
}

module.exports = { prepareMaterials };
