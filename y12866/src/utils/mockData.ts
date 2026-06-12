import type { Declaration, BoundaryCase, DataSource, ShipTrackPoint, RiskNotice, TideRecord, BallastWaterRecord, BoundaryIssue, WeatherGapItem, ReviewNote, RiskChangeRecord } from '@/types';

const dataSources: DataSource[] = [
  { id: 'risk-notice', name: '风险通报', sourcePath: '\\\\SharedDrive\\风险通报\\2026年6月', lastSyncTime: '2026-06-12 08:30:00', status: 'online', recordCount: 47 },
  { id: 'tide-table', name: '潮汐表（旧表）', sourcePath: 'D:\\潮汐数据\\2026年度潮汐表.xlsx', lastSyncTime: '2026-06-11 23:00:00', status: 'online', recordCount: 365 },
  { id: 'ship-track', name: '船舶轨迹', sourcePath: '海事AIS系统 / 人工备注夹', lastSyncTime: '2026-06-12 09:15:00', status: 'syncing', recordCount: 128 },
];

const shipTrack1: ShipTrackPoint[] = [
  { id: 'st1-1', lat: 24.48, lng: 118.08, timestamp: '2026-06-11 20:00', speed: 12.3, note: undefined },
  { id: 'st1-2', lat: 24.52, lng: 118.12, timestamp: '2026-06-11 22:00', speed: 10.8, note: undefined },
  { id: 'st1-3', lat: 24.55, lng: 118.15, timestamp: '2026-06-12 00:00', speed: 8.5, note: '减速，准备进港' },
  { id: 'st1-4', lat: 24.58, lng: 118.18, timestamp: '2026-06-12 02:00', speed: 4.2, note: undefined },
  { id: 'st1-5', lat: 24.60, lng: 118.20, timestamp: '2026-06-12 03:30', speed: 0.0, note: '靠泊' },
];

const shipTrack2: ShipTrackPoint[] = [
  { id: 'st2-1', lat: 22.30, lng: 114.10, timestamp: '2026-06-11 18:00', speed: 14.5, note: undefined },
  { id: 'st2-2', lat: 22.35, lng: 114.15, timestamp: '2026-06-11 21:00', speed: 11.2, note: undefined },
  { id: 'st2-3', lat: 22.40, lng: 114.18, timestamp: '2026-06-11 23:00', speed: 9.0, note: '检疫锚地待泊' },
  { id: 'st2-4', lat: 22.42, lng: 114.20, timestamp: '2026-06-12 01:00', speed: 5.1, note: undefined },
  { id: 'st2-5', lat: 22.44, lng: 114.22, timestamp: '2026-06-12 03:00', speed: 0.0, note: '靠泊，压载水排放准备' },
];

const riskNotices1: RiskNotice[] = [
  { id: 'rn1-1', title: '闽东海域赤潮预警', source: '省海洋与渔业局', date: '2026-06-10', level: 'high', content: '6月10-15日闽东海域可能出现赤潮，压载水排放需加强生物检测。' },
  { id: 'rn1-2', title: '厦门港夏季压载水管理提示', source: '厦门海事局', date: '2026-06-08', level: 'medium', content: '夏季高温期压载水生物存活率上升，建议增加交换频次。' },
];

const riskNotices2: RiskNotice[] = [
  { id: 'rn2-1', title: '珠江口海域水质通报', source: '广东海洋局', date: '2026-06-11', level: 'medium', content: '珠江口近岸盐度偏低（<25 PSU），外来压载水排放需注意盐度匹配。' },
];

const tideRecords1: TideRecord[] = [
  { id: 't1-1', time: '2026-06-12 00:30', height: 1.2, type: 'low' },
  { id: 't1-2', time: '2026-06-12 04:15', height: 5.8, type: 'high' },
  { id: 't1-3', time: '2026-06-12 08:45', height: 1.8, type: 'low' },
  { id: 't1-4', time: '2026-06-12 12:30', height: 6.2, type: 'high' },
  { id: 't1-5', time: '2026-06-12 17:00', height: 1.5, type: 'low' },
  { id: 't1-6', time: '2026-06-12 20:45', height: 5.5, type: 'high' },
];

const tideRecords2: TideRecord[] = [
  { id: 't2-1', time: '2026-06-12 01:00', height: 0.8, type: 'low' },
  { id: 't2-2', time: '2026-06-12 05:30', height: 3.2, type: 'high' },
  { id: 't2-3', time: '2026-06-12 09:15', height: 1.0, type: 'low' },
  { id: 't2-4', time: '2026-06-12 13:45', height: 3.5, type: 'high' },
  { id: 't2-5', time: '2026-06-12 18:00', height: 0.9, type: 'low' },
  { id: 't2-6', time: '2026-06-12 22:30', height: 3.0, type: 'high' },
];

const ballastWater1: BallastWaterRecord[] = [
  { id: 'bw1-1', tankId: 'No.1 压载舱（左）', volume: 1200, salinity: 28.5, salinityUnit: 'PSU', exchangeMethod: 'flow-through', exchangeRate: 95 },
  { id: 'bw1-2', tankId: 'No.2 压载舱（右）', volume: 1200, salinity: 28.5, salinityUnit: 'permil', exchangeMethod: 'flow-through', exchangeRate: 92 },
  { id: 'bw1-3', tankId: 'No.3 压载舱（中）', volume: 800, salinity: 32.0, salinityUnit: 'unknown', exchangeMethod: 'dilution', exchangeRate: 88 },
  { id: 'bw1-4', tankId: 'No.4 压载舱（尾）', volume: 600, salinity: 26.8, salinityUnit: 'PSU', exchangeMethod: 'flow-through', exchangeRate: 97 },
];

const ballastWater2: BallastWaterRecord[] = [
  { id: 'bw2-1', tankId: 'No.1 压载舱（左）', volume: 1500, salinity: 22.0, salinityUnit: 'PSU', exchangeMethod: 'flow-through', exchangeRate: 98 },
  { id: 'bw2-2', tankId: 'No.2 压载舱（右）', volume: 1500, salinity: 21.5, salinityUnit: 'PSU', exchangeMethod: 'flow-through', exchangeRate: 96 },
  { id: 'bw2-3', tankId: 'No.3 压载舱（中）', volume: 1000, salinity: 35.0, salinityUnit: 'PSU', exchangeMethod: 'none', exchangeRate: 0 },
];

const boundaryIssues1: BoundaryIssue[] = [
  {
    id: 'bi1-1',
    type: 'salinity-unit-mix',
    severity: 'critical',
    description: 'No.2压载舱盐度单位为"‰"（千分比），与No.1舱的"PSU"不一致。28.5‰ ≈ 28.5 PSU，数值看似相同，但‰和PSU在低盐度区域差异可达0.3-0.5，需确认实际含义。',
    originalValue: '28.5 ‰',
    correctedValue: '28.5 PSU（按千分比与PSU近似等价修正）',
    impactsResult: true,
    relatedRecordId: 'bw1-2',
  },
  {
    id: 'bi1-2',
    type: 'salinity-unit-mix',
    severity: 'critical',
    description: 'No.3压载舱盐度单位缺失，32.0 无单位标注。若默认按PSU处理则不达标（>30 PSU阈值），若实为ppt则可能刚过阈值边界。',
    originalValue: '32.0（无单位）',
    correctedValue: '需确认：32.0 PSU（不达标）或 32.0 ppt（≈32 PSU，不达标）',
    impactsResult: true,
    relatedRecordId: 'bw1-3',
  },
];

const boundaryIssues2: BoundaryIssue[] = [
  {
    id: 'bi2-1',
    type: 'timezone-error',
    severity: 'critical',
    description: '到港时间填报为"2026-06-12 03:00 UTC"，但该船从深圳港出发，实际应为UTC+8。修正后到港时间应为2026-06-12 11:00 CST，对应潮位从低潮0.8m变为高潮3.5m附近，作业窗口判定完全改变。',
    originalValue: '2026-06-12 03:00 UTC',
    correctedValue: '2026-06-12 11:00 CST（UTC+8）',
    impactsResult: true,
  },
  {
    id: 'bi2-2',
    type: 'timezone-error',
    severity: 'warning',
    description: '压载水排放计划时间"2026-06-12 01:00"标注为UTC，但按UTC+8修正后应为2026-06-11 17:00 CST，实际排放发生在前一日的潮位低谷期。',
    originalValue: '2026-06-12 01:00（标注UTC）',
    correctedValue: '2026-06-11 17:00 CST',
    impactsResult: true,
  },
];

const weatherGaps1: WeatherGapItem[] = [
  { id: 'wg1-1', fieldName: 'windSpeed', displayName: '风速', requiredForCalculations: ['排放扩散评估', '溢出风险判定'], alreadyCompleted: ['盐度达标判定', '交换率达标判定'], status: 'missing' },
  { id: 'wg1-2', fieldName: 'waveHeight', displayName: '浪高', requiredForCalculations: ['溢出风险判定'], alreadyCompleted: ['盐度达标判定'], status: 'missing' },
  { id: 'wg1-3', fieldName: 'seaTemp', displayName: '海水温度', requiredForCalculations: ['生物存活率评估'], alreadyCompleted: [], status: 'filled' },
];

const weatherGaps2: WeatherGapItem[] = [
  { id: 'wg2-1', fieldName: 'rainfall', displayName: '降雨量', requiredForCalculations: ['盐度稀释预判', '排放扩散评估'], alreadyCompleted: ['盐度达标判定'], status: 'missing' },
  { id: 'wg2-2', fieldName: 'windSpeed', displayName: '风速', requiredForCalculations: ['排放扩散评估', '溢出风险判定'], alreadyCompleted: ['盐度达标判定', '交换率达标判定'], status: 'missing' },
];

const reviewNotes1: ReviewNote[] = [
  {
    id: 'rn1-1', timestamp: '2026-06-12 09:00', author: '系统', content: '自动完成边界检测，发现2项盐度单位异常。', type: 'auto-boundary-detect',
  },
  {
    id: 'rn1-2', timestamp: '2026-06-12 09:15', author: '系统', content: '气象数据部分缺失，已完成盐度达标判定、交换率达标判定。风速与浪高数据待补录。', type: 'auto-weather-gap',
  },
  {
    id: 'rn1-3', timestamp: '2026-06-12 10:30', author: '张场长', content: 'No.2舱28.5‰与No.1舱28.5 PSU经核实均为同一盐度水平，影响不大。但No.3舱单位缺失问题需联系申报人确认。', type: 'manual',
  },
];

const reviewNotes2: ReviewNote[] = [
  {
    id: 'rn2-1', timestamp: '2026-06-12 08:00', author: '系统', content: '自动完成边界检测，发现2项时区标注异常。', type: 'auto-boundary-detect',
  },
  {
    id: 'rn2-2', timestamp: '2026-06-12 08:30', author: '系统', content: '气象数据部分缺失，降雨量和风速待补录。盐度与交换率已判定完成。', type: 'auto-weather-gap',
  },
];

const riskChangeHistory1: RiskChangeRecord[] = [
  {
    id: 'rch1-1', timestamp: '2026-06-12 10:45', beforeLevel: 'medium', afterLevel: 'high', changedBy: '张场长',
    reason: 'No.3舱盐度单位缺失，若为PSU则超过30 PSU排放阈值，且赤潮预警期间风险升级。',
    affectedFields: ['盐度达标判定', '风险等级'],
  },
];

const declarations: Declaration[] = [
  {
    id: 'decl-001',
    vesselName: '闽渔养 88866',
    vesselNo: 'MYY88866',
    arrivalTime: '2026-06-12 04:15',
    departureTime: '2026-06-14 16:00',
    applicant: '李建国',
    applyTime: '2026-06-11 14:30',
    status: 'reviewing',
    ballastWater: ballastWater1,
    initialRiskLevel: 'medium',
    currentRiskLevel: 'high',
    riskChangeHistory: riskChangeHistory1,
    boundaryIssues: boundaryIssues1,
    weatherGaps: weatherGaps1,
    sources: dataSources,
    shipTrack: shipTrack1,
    riskNotices: riskNotices1,
    tideRecords: tideRecords1,
    reviewNotes: reviewNotes1,
  },
  {
    id: 'decl-002',
    vesselName: '粤海运 31258',
    vesselNo: 'YHY31258',
    arrivalTime: '2026-06-12 03:00 UTC',
    departureTime: '2026-06-15 08:00',
    applicant: '王志强',
    applyTime: '2026-06-10 09:00',
    status: 'pending',
    ballastWater: ballastWater2,
    initialRiskLevel: 'low',
    currentRiskLevel: 'low',
    riskChangeHistory: [],
    boundaryIssues: boundaryIssues2,
    weatherGaps: weatherGaps2,
    sources: dataSources,
    shipTrack: shipTrack2,
    riskNotices: riskNotices2,
    tideRecords: tideRecords2,
    reviewNotes: reviewNotes2,
  },
  {
    id: 'decl-003',
    vesselName: '闽东渔 22078',
    vesselNo: 'MDY22078',
    arrivalTime: '2026-06-11 18:30',
    departureTime: '2026-06-13 12:00',
    applicant: '陈海明',
    applyTime: '2026-06-10 16:00',
    status: 'completed',
    ballastWater: [
      { id: 'bw3-1', tankId: 'No.1 压载舱', volume: 900, salinity: 29.5, salinityUnit: 'PSU', exchangeMethod: 'flow-through', exchangeRate: 99 },
      { id: 'bw3-2', tankId: 'No.2 压载舱', volume: 900, salinity: 30.2, salinityUnit: 'PSU', exchangeMethod: 'flow-through', exchangeRate: 94 },
    ],
    initialRiskLevel: 'low',
    currentRiskLevel: 'low',
    riskChangeHistory: [],
    boundaryIssues: [],
    weatherGaps: [],
    sources: dataSources,
    shipTrack: [
      { id: 'st3-1', lat: 24.40, lng: 117.95, timestamp: '2026-06-11 14:00', speed: 10.0, note: undefined },
      { id: 'st3-2', lat: 24.50, lng: 118.10, timestamp: '2026-06-11 17:00', speed: 5.0, note: '正常进港' },
    ],
    riskNotices: [],
    tideRecords: tideRecords1,
    reviewNotes: [
      { id: 'rn3-1', timestamp: '2026-06-11 19:00', author: '张场长', content: '全部合规，盐度与交换率均达标，无异常。', type: 'manual' },
    ],
  },
];

const boundaryCases: BoundaryCase[] = [
  {
    id: 'case-sal-1',
    category: 'salinity',
    title: 'PSU vs ppt：看似相同，判定反转',
    description: '压载舱A盐度28.5 PSU，压载舱B盐度28.5 ppt。数值完全相同，但PSU（实用盐度标度）和ppt（千分比）在低盐度区域存在0.3-0.5的差异。当排放阈值为30 PSU时，28.5 PSU达标，但28.5 ppt换算后可能为28.2 PSU，恰好在某些严格标准下不达标。',
    originalData: '28.5 ppt',
    correctedData: '≈28.2 PSU（ppt→PSU低盐度修正）',
    beforeResult: '达标（28.5 ≥ 阈值线以下，但按PSU看待时通过）',
    afterResult: '临界/不达标（28.2 PSU 接近或低于部分严格标准线）',
    impactsResult: true,
    severity: 'critical',
    realWorldNote: '这个差异在日常材料里完全看不出来，就是单位写法不同，但实际上低盐度区域PSU比ppt大约高0.3-0.5，卡在阈值线上的情况就翻盘了。',
  },
  {
    id: 'case-sal-2',
    category: 'salinity',
    title: '‰ 与 % 混用：差一千倍',
    description: '压载水盐度申报为"20%"，但实际应为"20‰"（千分之二十）。20% = 200‰，差了整整10倍。换算为PSU后，20‰ ≈ 20 PSU（合规），但20%意味着盐度约为200 PSU——远超任何标准，系统会直接判定为严重越界。',
    originalData: '20 %',
    correctedData: '20 ‰（应为千分比，非百分比）',
    beforeResult: '严重越界（200 PSU → 远超30 PSU阈值）',
    afterResult: '合规（20 PSU < 30 PSU阈值）',
    impactsResult: true,
    severity: 'critical',
    realWorldNote: '这种错误特别常见——旧表里‰和%的手写体容易混，录数据的人看着像%就填了%，其实差了一千倍。系统会直接报警，但人工审核时如果只看数字20觉得合理就放过了。',
  },
  {
    id: 'case-sal-3',
    category: 'salinity',
    title: '单位缺失：默认值修正后风险升级',
    description: '压载舱盐度填报"32.0"，无单位标注。系统默认按PSU处理，32.0 PSU超过30 PSU排放阈值，判定不达标。但若实际为ppt，32.0 ppt ≈ 31.7 PSU仍不达标，风险不变；若为‰则等同于ppt。真正的风险在于：单位不明时无法确认是否有换算错误，需联系申报人核实。',
    originalData: '32.0（无单位）',
    correctedData: '需确认单位后判定：32.0 PSU（不达标）或 32.0 ppt（≈31.7 PSU，不达标）',
    beforeResult: '低风险（默认PSU，32.0刚好过线）',
    afterResult: '中风险（单位不明导致无法精确判定，保守升级）',
    impactsResult: true,
    severity: 'warning',
    realWorldNote: '这种情况最头疼——不是数字错了，是单位压根没写。默认按PSU处理虽然结果可能一样，但"不确定"本身就是风险。场长一般会要求申报人补上单位再定。',
  },
  {
    id: 'case-tz-1',
    category: 'timezone',
    title: 'UTC+8 误写为 UTC：潮位从高潮变低潮',
    description: '到港时间填报"2026-06-12 03:00 UTC"，但该船在国内港口作业，时间应为UTC+8。修正后实际到港时间为11:00 CST，对应潮位从凌晨低潮（0.8m）变为午间高潮（3.5m附近），作业窗口从"不宜排放"变为"适宜排放"。',
    originalData: '2026-06-12 03:00 UTC → 对应潮位 0.8m（低潮）',
    correctedData: '2026-06-12 11:00 CST（UTC+8）→ 对应潮位 3.5m（高潮）',
    beforeResult: '不宜排放（低潮期，扩散条件差）',
    afterResult: '适宜排放（高潮期，扩散条件好）',
    impactsResult: true,
    severity: 'critical',
    realWorldNote: '这真的是平时材料里会混进来的小麻烦——报时区的人随手写了UTC，但国内船运的申报人其实想写的是北京时间。差了8小时，刚好把高潮变低潮，作业窗口判定完全反过来。',
  },
  {
    id: 'case-tz-2',
    category: 'timezone',
    title: '跨日时区偏移：日期都错了',
    description: '压载水排放计划时间"2026-06-12 01:00"标注为UTC，按UTC+8修正后应为"2026-06-11 17:00 CST"。不仅时间差8小时，连日期都跨了一天。6月11日17:00对应的潮位与6月12日01:00完全不同，排放窗口和潮位匹配全部错位。',
    originalData: '2026-06-12 01:00 UTC',
    correctedData: '2026-06-11 17:00 CST（UTC+8）',
    beforeResult: '6月12日凌晨排放，对应低潮期',
    afterResult: '6月11日傍晚排放，对应退潮期，窗口不同',
    impactsResult: true,
    severity: 'critical',
    realWorldNote: '日期都变了这个最隐蔽——看6月12日觉得没问题，但实际排放发生在6月11日。拿错日期的潮位表去匹配，整个排放计划的时间窗口就对不上了。',
  },
];

export function getDeclarations(): Declaration[] {
  return declarations;
}

export function getDeclarationById(id: string): Declaration | undefined {
  return declarations.find(d => d.id === id);
}

export function getBoundaryCases(): BoundaryCase[] {
  return boundaryCases;
}

export function getDataSources(): DataSource[] {
  return dataSources;
}
