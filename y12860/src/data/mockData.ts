import type {
  Buoy,
  EventRecord,
  RiskAssessment,
  TideReport,
  TidePoint,
  TrackPoint,
  DeliveryCard,
  SavedView,
  Availability,
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const NOW = dayjs('2026-06-12T10:30:00');

function makeSensors(
  variations: Partial<Record<string, { value: number; out?: boolean }>> = {}
) {
  const base = [
    { type: 'temperature', value: 18.5, min: 5, max: 30, unit: '°C' },
    { type: 'salinity', value: 32.1, min: 28, max: 36, unit: '‰' },
    { type: 'pressure', value: 101.2, min: 95, max: 110, unit: 'kPa' },
    { type: 'wave', value: 1.2, min: 0, max: 6, unit: 'm' },
    { type: 'wind', value: 5.8, min: 0, max: 20, unit: 'm/s' },
  ];
  return base.map((s) => {
    const v = variations[s.type];
    const value = v?.value ?? s.value;
    const isOutOfRange = v?.out ?? (value < s.min || value > s.max);
    return {
      id: uuidv4(),
      type: s.type as any,
      value,
      threshold: { min: s.min, max: s.max },
      isOutOfRange,
      unit: s.unit,
    };
  });
}

export const MOCK_BUOYS: Buoy[] = [
  {
    id: 'buoy-001',
    name: '东海一号浮标',
    code: 'EC-B01',
    location: { lat: 30.521, lng: 122.893 },
    depth: 42,
    status: 'normal',
    lastOnline: NOW.subtract(5, 'minute').toISOString(),
    offlineDuration: 0,
    sensors: makeSensors(),
    operator: '张伟',
    installDate: NOW.subtract(180, 'day').toISOString(),
  },
  {
    id: 'buoy-002',
    name: '东海二号浮标',
    code: 'EC-B02',
    location: { lat: 30.874, lng: 123.156 },
    depth: 58,
    status: 'offline',
    lastOnline: NOW.subtract(3, 'hour').toISOString(),
    offlineDuration: 182,
    sensors: makeSensors({ temperature: { value: 17.8 } }),
    operator: '李娜',
    installDate: NOW.subtract(220, 'day').toISOString(),
  },
  {
    id: 'buoy-003',
    name: '黄渤海一号浮标',
    code: 'YS-B01',
    location: { lat: 37.452, lng: 122.178 },
    depth: 28,
    status: 'normal',
    lastOnline: NOW.subtract(2, 'minute').toISOString(),
    offlineDuration: 0,
    sensors: makeSensors({ temperature: { value: 14.2 } }),
    operator: '王建国',
    installDate: NOW.subtract(150, 'day').toISOString(),
  },
  {
    id: 'buoy-004',
    name: '南海一号浮标',
    code: 'SC-B01',
    location: { lat: 18.234, lng: 110.567 },
    depth: 85,
    status: 'anomaly',
    lastOnline: NOW.subtract(45, 'minute').toISOString(),
    offlineDuration: 0,
    sensors: makeSensors({ wave: { value: 7.2, out: true } }),
    operator: '陈海',
    installDate: NOW.subtract(90, 'day').toISOString(),
  },
  {
    id: 'buoy-005',
    name: '南海二号浮标',
    code: 'SC-B02',
    location: { lat: 20.145, lng: 112.345 },
    depth: 112,
    status: 'out_of_range',
    lastOnline: NOW.subtract(12, 'minute').toISOString(),
    offlineDuration: 0,
    sensors: makeSensors({ wind: { value: 22.5, out: true }, wave: { value: 6.8, out: true } }),
    operator: '刘芳',
    installDate: NOW.subtract(130, 'day').toISOString(),
  },
  {
    id: 'buoy-006',
    name: '东海三号浮标',
    code: 'EC-B03',
    location: { lat: 31.234, lng: 122.789 },
    depth: 35,
    status: 'pending',
    lastOnline: NOW.subtract(20, 'minute').toISOString(),
    offlineDuration: 0,
    sensors: makeSensors({ salinity: { value: 37.2, out: true } }),
    operator: '赵磊',
    installDate: NOW.subtract(200, 'day').toISOString(),
  },
  {
    id: 'buoy-007',
    name: '黄渤海二号浮标',
    code: 'YS-B02',
    location: { lat: 38.123, lng: 121.456 },
    depth: 22,
    status: 'normal',
    lastOnline: NOW.subtract(8, 'minute').toISOString(),
    offlineDuration: 0,
    sensors: makeSensors({ temperature: { value: 13.8 } }),
    operator: '孙明',
    installDate: NOW.subtract(170, 'day').toISOString(),
  },
  {
    id: 'buoy-008',
    name: '台湾海峡浮标',
    code: 'TS-B01',
    location: { lat: 24.567, lng: 119.234 },
    depth: 65,
    status: 'offline',
    lastOnline: NOW.subtract(8, 'hour').toISOString(),
    offlineDuration: 485,
    sensors: makeSensors({ temperature: { value: 24.5 } }),
    operator: '周强',
    installDate: NOW.subtract(110, 'day').toISOString(),
  },
  {
    id: 'buoy-009',
    name: '北部湾一号浮标',
    code: 'BB-B01',
    location: { lat: 21.345, lng: 108.789 },
    depth: 38,
    status: 'normal',
    lastOnline: NOW.subtract(3, 'minute').toISOString(),
    offlineDuration: 0,
    sensors: makeSensors({ temperature: { value: 27.8 } }),
    operator: '吴敏',
    installDate: NOW.subtract(85, 'day').toISOString(),
  },
  {
    id: 'buoy-010',
    name: '琼州海峡浮标',
    code: 'QZ-B01',
    location: { lat: 20.089, lng: 110.356 },
    depth: 52,
    status: 'offline',
    lastOnline: NOW.subtract(26, 'hour').toISOString(),
    offlineDuration: 1562,
    sensors: makeSensors(),
    operator: '郑涛',
    installDate: NOW.subtract(140, 'day').toISOString(),
  },
  {
    id: 'buoy-011',
    name: '长江口浮标',
    code: 'CJ-B01',
    location: { lat: 31.210, lng: 121.890 },
    depth: 18,
    status: 'anomaly',
    lastOnline: NOW.subtract(30, 'minute').toISOString(),
    offlineDuration: 0,
    sensors: makeSensors({ salinity: { value: 26.8, out: true } }),
    operator: '杨华',
    installDate: NOW.subtract(95, 'day').toISOString(),
  },
  {
    id: 'buoy-012',
    name: '珠江口浮标',
    code: 'ZJ-B01',
    location: { lat: 22.134, lng: 113.789 },
    depth: 25,
    status: 'pending',
    lastOnline: NOW.subtract(15, 'minute').toISOString(),
    offlineDuration: 0,
    sensors: makeSensors({ pressure: { value: 112.5, out: true } }),
    operator: '林峰',
    installDate: NOW.subtract(160, 'day').toISOString(),
  },
];

export const MOCK_EVENTS: EventRecord[] = [
  {
    id: 'evt-001',
    buoyId: 'buoy-002',
    timestamp: NOW.subtract(3, 'hour').add(2, 'minute').toISOString(),
    operator: '李娜',
    operationType: 'offline_detected',
    content: '系统检测到东海二号浮标心跳中断，最后有效数据包时间戳为10:28:03，信号强度从-65dBm骤降至-120dBm。',
  },
  {
    id: 'evt-002',
    buoyId: 'buoy-002',
    timestamp: NOW.subtract(3, 'hour').subtract(15, 'minute').toISOString(),
    operator: '李娜',
    operationType: 'status_checked',
    content: '电话联系海域巡检船"海巡01号"，确认该区域11:00-14:00有强雷雨，可能影响卫星通讯链路。',
    sourceMaterial: {
      id: 'src-001',
      type: 'manual_note',
      name: '海巡01号通话记录.txt',
      uploadedAt: NOW.subtract(2, 'hour').toISOString(),
      uploader: '李娜',
    },
  },
  {
    id: 'evt-003',
    buoyId: 'buoy-002',
    timestamp: NOW.subtract(2, 'hour').subtract(40, 'minute').toISOString(),
    operator: '李娜',
    operationType: 'forecast_updated',
    content: '气象预报补版：原预报浪高1.5m修订为3.2m，风速8m/s修订为15m/s。',
    versionBefore: {
      id: 'ver-b001',
      timestamp: NOW.subtract(6, 'hour').toISOString(),
      fields: {
        forecastWave: 1.5,
        forecastWind: 8.0,
        forecastIssue: '2026-06-12 04:00 初版',
        forecastSource: 'ECMWF全球模式',
      },
    },
    versionAfter: {
      id: 'ver-a001',
      timestamp: NOW.subtract(2, 'hour').subtract(40, 'minute').toISOString(),
      fields: {
        forecastWave: 3.2,
        forecastWind: 15.0,
        forecastIssue: '2026-06-12 08:00 补一版',
        forecastSource: 'ECMWF全球模式+区域同化',
      },
    },
    sourceMaterial: {
      id: 'src-002',
      type: 'forecast_file',
      name: '东海区海浪预报_20260612_补一版.pdf',
      uploadedAt: NOW.subtract(2, 'hour').subtract(40, 'minute').toISOString(),
      uploader: '李娜',
      size: '2.4 MB',
    },
  },
  {
    id: 'evt-004',
    buoyId: 'buoy-002',
    timestamp: NOW.subtract(1, 'hour').subtract(20, 'minute').toISOString(),
    operator: '李娜',
    operationType: 'photo_modified',
    content: '巡检照片修订：原照片"太阳能板完好"备注调整为"太阳能板边缘约3cm轻微划痕，不影响充电效率"。',
    versionBefore: {
      id: 'ver-b002',
      timestamp: NOW.subtract(3, 'day').toISOString(),
      fields: {
        photoRemark: '太阳能板完好，浮标主体无明显锈蚀，天线垂直度良好。',
        photoShootTime: '2026-06-09 14:25',
        photoAuditor: '张巡检',
      },
    },
    versionAfter: {
      id: 'ver-a002',
      timestamp: NOW.subtract(1, 'hour').subtract(20, 'minute').toISOString(),
      fields: {
        photoRemark: '太阳能板边缘约3cm轻微划痕，不影响充电效率；浮标主体无明显锈蚀；天线垂直度良好（修正后复测±1.2°）。',
        photoShootTime: '2026-06-09 14:25',
        photoAuditor: '张巡检（复核：李娜）',
      },
    },
    sourceMaterial: {
      id: 'src-003',
      type: 'inspection_photo',
      name: 'EC-B02_太阳能板特写_06091425.JPG',
      uploadedAt: NOW.subtract(3, 'day').toISOString(),
      uploader: '张巡检',
      size: '5.8 MB',
      exifInfo: {
        '拍摄设备': 'Canon EOS R5',
        'GPS坐标': '30°52′26″N 123°09′22″E',
        '焦距': '50mm',
        '光圈': 'f/8',
      },
    },
  },
  {
    id: 'evt-005',
    buoyId: 'buoy-002',
    timestamp: NOW.subtract(30, 'minute').toISOString(),
    operator: '李娜',
    operationType: 'note_added',
    content: '预计16:00雷雨过后通讯恢复，届时优先补传13:00-16:00缺失的整点数据包；如仍无法连接，明早派船现场核查。',
  },
  {
    id: 'evt-006',
    buoyId: 'buoy-008',
    timestamp: NOW.subtract(8, 'hour').add(5, 'minute').toISOString(),
    operator: '周强',
    operationType: 'offline_detected',
    content: '台湾海峡浮标离线，怀疑受船只锚泊干扰，已调取AIS轨迹。',
  },
  {
    id: 'evt-007',
    buoyId: 'buoy-008',
    timestamp: NOW.subtract(6, 'hour').toISOString(),
    operator: '周强',
    operationType: 'data_supplemented',
    content: '补充上传该浮标相邻海域SC-B02的同步观测数据，用于后续插值补缺。',
    sourceMaterial: {
      id: 'src-004',
      type: 'ship_track',
      name: 'AIS轨迹_台湾海峡_20260612.csv',
      uploadedAt: NOW.subtract(6, 'hour').toISOString(),
      uploader: '周强',
      size: '860 KB',
    },
  },
  {
    id: 'evt-008',
    buoyId: 'buoy-008',
    timestamp: NOW.subtract(2, 'hour').toISOString(),
    operator: '周强',
    operationType: 'caliber_adjusted',
    content: '调整温度数据统计口径：由"整点平均值"调整为"整点前后10分钟滑动平均"，消除瞬时值波动影响。',
  },
  {
    id: 'evt-009',
    buoyId: 'buoy-010',
    timestamp: NOW.subtract(26, 'hour').add(3, 'minute').toISOString(),
    operator: '郑涛',
    operationType: 'offline_detected',
    content: '琼州海峡浮标持续离线超过24小时，已进入应急预案。',
  },
  {
    id: 'evt-010',
    buoyId: 'buoy-004',
    timestamp: NOW.subtract(1, 'hour').toISOString(),
    operator: '陈海',
    operationType: 'note_added',
    content: '南海一号浪高传感器数据异常偏大，已标记待船舶传感器比对确认。',
  },
  {
    id: 'evt-011',
    buoyId: 'buoy-011',
    timestamp: NOW.subtract(40, 'minute').toISOString(),
    operator: '杨华',
    operationType: 'forecast_updated',
    content: '长江口盐度预报补版：因上游径流量调整，预报值从10‰调整为8.5‰。',
    versionBefore: {
      id: 'ver-b003',
      timestamp: NOW.subtract(5, 'hour').toISOString(),
      fields: {
        salinityForecast: 10.0,
        runoffData: '大通站流量 42000 m³/s',
      },
    },
    versionAfter: {
      id: 'ver-a003',
      timestamp: NOW.subtract(40, 'minute').toISOString(),
      fields: {
        salinityForecast: 8.5,
        runoffData: '大通站流量 46500 m³/s（补正）',
      },
    },
  },
];

export const MOCK_ASSESSMENTS: RiskAssessment[] = [
  {
    id: 'risk-001',
    buoyId: 'buoy-002',
    anomalyType: 'late_forecast',
    impactLevel: 4,
    likelihoodLevel: 4,
    riskLevel: 'high',
    nextAction: 'supplement_material',
    shortDescription: '风浪预报晚到4小时，初版浪高与实际差2倍。可用数据：04:00前整点记录；暂缓：08:00-12:00逐浪数据；无需重采。',
    availableData: ['水温整点(04:00前)', '盐度整点(全时段)', '卫星通讯日志'],
    pendingData: ['08:00-12:00逐时浪高', '08:00-12:00瞬时风速'],
    recollectData: [],
    createdAt: NOW.subtract(2, 'hour').toISOString(),
  },
  {
    id: 'risk-002',
    buoyId: 'buoy-008',
    anomalyType: 'data_gap',
    impactLevel: 5,
    likelihoodLevel: 3,
    riskLevel: 'high',
    nextAction: 'adjust_caliber',
    shortDescription: '台湾海峡浮标数据断档8小时。可用：同期相邻浮标插值；暂缓：高频采样数据；口径调整：由单点值改区域滑动平均。',
    availableData: ['相邻浮标SC-B02同步数据', '卫星海表温度SST'],
    pendingData: ['高频采样(10min间隔)'],
    recollectData: [],
    createdAt: NOW.subtract(4, 'hour').toISOString(),
  },
  {
    id: 'risk-003',
    buoyId: 'buoy-010',
    anomalyType: 'track_anomaly',
    impactLevel: 5,
    likelihoodLevel: 5,
    riskLevel: 'critical',
    nextAction: 'recollect',
    shortDescription: '琼州海峡浮标持续离线26小时，AIS显示多艘商船锚泊半径500m。全部数据暂缓，派船现场核查后重新采集。',
    availableData: ['AIS周边船舶轨迹', '最近一次有效数据包(前日12:00)'],
    pendingData: ['全时段传感器数据'],
    recollectData: ['现场CTD剖面', '浮标姿态复核', '传感器校准比对'],
    createdAt: NOW.subtract(20, 'hour').toISOString(),
  },
  {
    id: 'risk-004',
    buoyId: 'buoy-005',
    anomalyType: 'out_of_range',
    impactLevel: 3,
    likelihoodLevel: 3,
    riskLevel: 'medium',
    nextAction: 'supplement_material',
    shortDescription: '风速22.5m/s越界、浪高6.8m越界。可用：水温、盐度、水压；暂缓：风场+浪场；补充相邻SC-B01同期风浪数据比对。',
    availableData: ['水温', '盐度', '水压'],
    pendingData: ['风速', '浪高'],
    recollectData: [],
    createdAt: NOW.subtract(1, 'hour').toISOString(),
  },
  {
    id: 'risk-005',
    buoyId: 'buoy-004',
    anomalyType: 'sensor_drift',
    impactLevel: 3,
    likelihoodLevel: 4,
    riskLevel: 'medium',
    nextAction: 'adjust_caliber',
    shortDescription: '南海一号浪高漂移+0.6m。可用：其余传感器；调整口径：浪高统一减去0.6m偏移量，待下航次校准。',
    availableData: ['水温', '盐度', '水压', '风速'],
    pendingData: ['浪高(修正前原值)'],
    recollectData: [],
    createdAt: NOW.subtract(1, 'hour').add(20, 'minute').toISOString(),
  },
  {
    id: 'risk-006',
    buoyId: 'buoy-006',
    anomalyType: 'late_forecast',
    impactLevel: 2,
    likelihoodLevel: 2,
    riskLevel: 'low',
    nextAction: 'supplement_material',
    shortDescription: '盐度越界为潮汐混合正常现象。可用：全部数据；补充当日潮汐表验证即可。',
    availableData: ['水温', '盐度', '水压', '浪高', '风速'],
    pendingData: [],
    recollectData: [],
    createdAt: NOW.subtract(30, 'minute').toISOString(),
  },
  {
    id: 'risk-007',
    buoyId: 'buoy-011',
    anomalyType: 'late_forecast',
    impactLevel: 3,
    likelihoodLevel: 3,
    riskLevel: 'medium',
    nextAction: 'supplement_material',
    shortDescription: '长江口盐度预报晚到，流量修正。可用：全部传感器实测；补充：大通站最新逐时流量序列。',
    availableData: ['全部传感器实测'],
    pendingData: ['盐度统计值(待重新计算)'],
    recollectData: [],
    createdAt: NOW.subtract(25, 'minute').toISOString(),
  },
  {
    id: 'risk-008',
    buoyId: 'buoy-012',
    anomalyType: 'out_of_range',
    impactLevel: 2,
    likelihoodLevel: 2,
    riskLevel: 'low',
    nextAction: 'adjust_caliber',
    shortDescription: '水压112.5kPa越界为传感器零点漂移。可用：其他传感器；调整口径：水压统一减1.8kPa。',
    availableData: ['水温', '盐度', '浪高', '风速', '水压(修正后)'],
    pendingData: [],
    recollectData: [],
    createdAt: NOW.subtract(10, 'minute').toISOString(),
  },
];

function generateTideData(days = 3): TideReport {
  const data: TidePoint[] = [];
  const start = NOW.startOf('day');
  for (let h = 0; h < days * 24; h++) {
    const t = start.add(h, 'hour');
    const phase = (h / 6.2) * Math.PI * 2;
    const height = 2.8 + Math.sin(phase) * 1.6 + Math.sin(phase * 2 + 0.5) * 0.4;
    const isLate = (h === 18 || h === 42);
    const isOutOfRange = h === 30;
    const isForecast = h >= 12;
    data.push({
      time: t.toISOString(),
      hourLabel: t.format('MM-DD HH:00'),
      height: Number(height.toFixed(2)),
      isForecast,
      isLate,
      isOutOfRange,
    });
  }
  const highTides = data.filter((_, i) => {
    if (i < 2 || i >= data.length - 2) return false;
    return data[i].height > data[i - 1].height && data[i].height > data[i + 1].height;
  });
  const lowTides = data.filter((_, i) => {
    if (i < 2 || i >= data.length - 2) return false;
    return data[i].height < data[i - 1].height && data[i].height < data[i + 1].height;
  });
  return {
    id: 'tide-report-001',
    buoyId: 'buoy-002',
    portName: '舟山嵊山港',
    startDate: start.toISOString(),
    endDate: start.add(days, 'day').toISOString(),
    tideData: data,
    highTides,
    lowTides,
    datumHeight: 3.85,
    forecastQuality: {
      onTimeRate: 1 - 2 / data.filter((d) => d.isForecast).length,
      outOfRangeCount: 1,
      totalPoints: data.length,
    },
    generatedAt: NOW.toISOString(),
  };
}

export const MOCK_TIDE_REPORTS: TideReport[] = [
  generateTideData(3),
  {
    ...generateTideData(3),
    id: 'tide-report-002',
    buoyId: 'buoy-008',
    portName: '厦门港',
    datumHeight: 4.20,
  },
  {
    ...generateTideData(3),
    id: 'tide-report-003',
    buoyId: 'buoy-010',
    portName: '海口秀英港',
    datumHeight: 2.95,
  },
];

function generateTrackPoints(n = 100): TrackPoint[] {
  const start = NOW.subtract(1, 'day').startOf('hour');
  const pts: TrackPoint[] = [];
  for (let i = 0; i < n; i++) {
    const t = start.add(i * 15, 'minute');
    const progress = i / n;
    const lat = 30.5 + progress * 0.8 + Math.sin(i * 0.2) * 0.02;
    const lng = 122.8 + progress * 0.6 + Math.cos(i * 0.15) * 0.02;
    const speed = 8 + Math.sin(i * 0.3) * 3 + Math.random() * 1;
    const heading = 85 + Math.sin(i * 0.08) * 15;
    const flags: TrackPoint['qualityFlags'] = [];
    let availability: Availability = 'available';
    let duplicateOf: number | undefined;
    let remark = '';

    if ([5, 12, 28, 37, 45, 56, 68, 77, 88, 95].includes(i)) {
      flags.push('null_value');
      availability = 'need_clean';
    }
    if ([15, 16, 50, 51, 80].includes(i)) {
      flags.push('duplicate');
      duplicateOf = i - 1;
      availability = 'need_clean';
    }
    if (i === 33) {
      remark = '靠泊加油 14:20-14:45 航速异常';
      flags.push('mixed_remark');
      availability = 'need_clean';
    } else if (i === 66) {
      remark = '避让渔船 临时绕航（船长电话记录）';
      flags.push('mixed_remark');
      availability = 'need_clean';
    } else if (i === 90) {
      remark = '抵达锚地 关闭GPS 1小时';
      flags.push('mixed_remark');
      availability = 'need_clean';
    }

    pts.push({
      id: `trk-${String(i + 1).padStart(3, '0')}`,
      index: i + 1,
      timestamp: t.toISOString(),
      lat: flags.includes('null_value') ? null : Number(lat.toFixed(5)),
      lng: flags.includes('null_value') ? null : Number(lng.toFixed(5)),
      speed: flags.includes('null_value') ? null : Number(speed.toFixed(1)),
      heading: flags.includes('null_value') ? null : Math.round(heading) % 360,
      remark,
      qualityFlags: flags,
      availability,
      duplicateOf,
    });
  }
  return pts;
}

export const MOCK_TRACK_POINTS: TrackPoint[] = generateTrackPoints(100);

export const MOCK_DELIVERY_CARDS: DeliveryCard[] = [
  {
    id: 'dlv-001',
    buoyId: 'buoy-001',
    buoyName: '东海一号浮标',
    buoyCode: 'EC-B01',
    dataPeriod: { start: NOW.subtract(7, 'day').toISOString(), end: NOW.toISOString() },
    status: 'direct_use',
    shortDescription: '全时段数据完整，传感器指标均在正常范围内，无晚到或越界记录。',
    availableItems: ['水温(逐时)', '盐度(逐时)', '水压(逐时)', '浪高(逐时)', '风速(逐时)', '周统计报告'],
    pendingItems: [],
    recollectItems: [],
    deliveredAt: NOW.subtract(2, 'hour').toISOString(),
    reportId: 'tide-report-001',
  },
  {
    id: 'dlv-002',
    buoyId: 'buoy-003',
    buoyName: '黄渤海一号浮标',
    buoyCode: 'YS-B01',
    dataPeriod: { start: NOW.subtract(7, 'day').toISOString(), end: NOW.toISOString() },
    status: 'direct_use',
    shortDescription: '数据质量良好，仅周三14:00-15:00瞬时值已做平滑处理，不影响统计。',
    availableItems: ['水温(逐时+修正)', '盐度(逐时)', '水压(逐时)', '浪高(逐时)', '风速(逐时)'],
    pendingItems: [],
    recollectItems: [],
    deliveredAt: NOW.subtract(1, 'hour').add(30, 'minute').toISOString(),
  },
  {
    id: 'dlv-003',
    buoyId: 'buoy-009',
    buoyName: '北部湾一号浮标',
    buoyCode: 'BB-B01',
    dataPeriod: { start: NOW.subtract(7, 'day').toISOString(), end: NOW.toISOString() },
    status: 'direct_use',
    shortDescription: '全量数据可用，周变化趋势符合季节规律，与相邻站点一致性好。',
    availableItems: ['水温(逐时)', '盐度(逐时)', '水压(逐时)', '浪高(逐时)', '风速(逐时)', '潮汐观测'],
    pendingItems: [],
    recollectItems: [],
    deliveredAt: NOW.subtract(1, 'hour').toISOString(),
  },
  {
    id: 'dlv-004',
    buoyId: 'buoy-007',
    buoyName: '黄渤海二号浮标',
    buoyCode: 'YS-B02',
    dataPeriod: { start: NOW.subtract(7, 'day').toISOString(), end: NOW.toISOString() },
    status: 'direct_use',
    shortDescription: '周二有1小时通讯中断已通过相邻浮标插值补齐，偏差<3%。',
    availableItems: ['水温(逐时+插值补齐)', '盐度(逐时+插值补齐)', '水压(逐时)', '浪高(逐时)', '风速(逐时)'],
    pendingItems: [],
    recollectItems: [],
    deliveredAt: NOW.subtract(40, 'minute').toISOString(),
  },
  {
    id: 'dlv-005',
    buoyId: 'buoy-002',
    buoyName: '东海二号浮标',
    buoyCode: 'EC-B02',
    dataPeriod: { start: NOW.subtract(7, 'day').toISOString(), end: NOW.toISOString() },
    status: 'need_review',
    shortDescription: '风浪预报晚到4小时，08-12点逐时浪高与风速需复核后使用；其余数据可直接引用。',
    availableItems: ['水温(逐时)', '盐度(逐时)', '水压(逐时)', '卫星通讯日志', '巡检照片(修订版)'],
    pendingItems: ['08:00-12:00逐时浪高', '08:00-12:00瞬时风速'],
    recollectItems: [],
    reviewer: '李娜',
    reviewNote: '16:00通讯恢复后补传缺失数据，预计今日17:30前更新风浪数据。',
    deliveredAt: NOW.subtract(20, 'minute').toISOString(),
    reportId: 'tide-report-001',
  },
  {
    id: 'dlv-006',
    buoyId: 'buoy-010',
    buoyName: '琼州海峡浮标',
    buoyCode: 'QZ-B01',
    dataPeriod: { start: NOW.subtract(7, 'day').toISOString(), end: NOW.toISOString() },
    status: 'need_review',
    shortDescription: '浮标持续离线26小时，前日12:00后数据全部暂缓，建议待现场核查后重新采集。',
    availableItems: ['前日12:00前全量数据', 'AIS周边船舶轨迹'],
    pendingItems: ['前日12:00后全部传感器数据'],
    recollectItems: ['现场CTD剖面', '浮标姿态复核', '传感器校准比对'],
    reviewer: '郑涛',
    reviewNote: '已安排明早(6月13日)08:00"海勘三号"赴现场，预计14:00完成核查。',
    deliveredAt: NOW.subtract(15, 'minute').toISOString(),
  },
];

export const MOCK_SAVED_VIEWS: SavedView[] = [
  {
    id: 'view-all',
    name: '全部浮标总览',
    description: '默认视角，展示12个浮标的状态分布与统计指标',
    createdAt: NOW.subtract(30, 'day').toISOString(),
    filter: { statuses: [], buoyIds: [] },
    zoomLevel: 1,
  },
  {
    id: 'view-offline',
    name: '离线浮标聚焦',
    description: '仅显示离线与异常浮标，方便日常排查',
    createdAt: NOW.subtract(15, 'day').toISOString(),
    filter: { statuses: ['offline', 'anomaly', 'out_of_range'], buoyIds: [] },
    zoomLevel: 1.2,
  },
  {
    id: 'view-review',
    name: '评审截图视角',
    description: '优化截图：显示完整图例、无动效、聚焦问题浮标，用于评审会议',
    createdAt: NOW.subtract(5, 'day').toISOString(),
    filter: { statuses: ['offline', 'anomaly', 'out_of_range', 'pending'], buoyIds: [] },
    zoomLevel: 1.3,
  },
];
