const generateId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;

export type FuelStatus = 'normal' | 'pending' | 'approved' | 'rejected';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type CorrectionStatus = 'pending' | 'approved' | 'rejected';

export interface Vessel {
  id: string;
  name: string;
  callSign: string;
  tonnage: number;
  enginePower: number;
  fuelTankCapacity: number;
  buildYear: number;
  homePort: string;
  skipper: string;
}

export interface Voyage {
  id: string;
  vesselId: string;
  voyageNo: string;
  departurePort: string;
  arrivalPort: string;
  departureTime: string;
  arrivalTime: string;
  totalDistance: number;
  totalFuel: number;
  purpose: string;
  weatherCondition: string;
}

export interface FuelRecord {
  id: string;
  voyageId: string;
  vesselId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed: number;
  fuelConsumption: number;
  engineRpm: number;
  seaTemperature: number;
  status: FuelStatus;
  remark?: string;
}

export interface WeatherRaw {
  id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  windSpeed: number | null;
  windDirection: string | null;
  waveHeight: number | null;
  waveDirection: string | null;
  temperature: number | null;
  pressure: number | null;
  visibility: number | null;
  remark: string | null;
  source: string;
}

export interface WeatherData {
  id: string;
  rawId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  windSpeed: number;
  windDirection: string;
  waveHeight: number;
  waveDirection: string;
  temperature: number;
  pressure: number;
  visibility: number;
  isNullFilled: boolean;
  nullFilledFields: string[];
  isDuplicateRemoved: boolean;
  isRemarkParsed: boolean;
  parsedFromRemark: string[];
}

export interface TideData {
  id: string;
  stationId: string;
  stationName: string;
  timestamp: string;
  timezone: string;
  tideLevel: number;
  correctedTideLevel: number | null;
  hasTimezoneError: boolean;
  correctedTimezone: string | null;
  source: string;
}

export interface BuoySupplement {
  id: string;
  buoyId: string;
  buoyName: string;
  supplementTime: string;
  latitude: number;
  longitude: number;
  windSpeed: number;
  waveHeight: number;
  temperature: number;
  recordedBy: string;
  remark: string;
}

export interface Correction {
  id: string;
  targetType: 'fuelRecord' | 'weatherData' | 'tideData';
  targetId: string;
  fieldName: string;
  oldValue: string | number | null;
  newValue: string | number | null;
  reason: string;
  status: CorrectionStatus;
  createdBy: string;
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  version: number;
}

export interface AuditLog {
  id: string;
  actionType: 'import' | 'clean' | 'correct' | 'approve' | 'reject' | 'export' | 'review';
  targetType: string;
  targetId: string;
  operator: string;
  operatorRole: string;
  actionTime: string;
  detail: string;
  ipAddress: string;
}

export interface WaterAlert {
  id: string;
  alertTime: string;
  stationName: string;
  latitude: number;
  longitude: number;
  indicator: string;
  value: number;
  threshold: number;
  severity: AlertSeverity;
  relatedVoyageIds: string[];
  status: 'pending' | 'confirmed' | 'resolved';
  description: string;
}

export interface DuplicateGroup {
  id: string;
  groupKey: string;
  dataType: 'weatherRaw' | 'fuelRecord' | 'tideData';
  duplicateCount: number;
  recordIds: string[];
  detectedAt: string;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolution: string | null;
}

const vessels: Vessel[] = [
  {
    id: 'vessel_001',
    name: '浙渔12345',
    callSign: 'ZJ12345',
    tonnage: 185,
    enginePower: 450,
    fuelTankCapacity: 12000,
    buildYear: 2018,
    homePort: '舟山沈家门',
    skipper: '张建国'
  },
  {
    id: 'vessel_002',
    name: '浙渔67890',
    callSign: 'ZJ67890',
    tonnage: 220,
    enginePower: 520,
    fuelTankCapacity: 15000,
    buildYear: 2020,
    homePort: '舟山嵊山',
    skipper: '李明华'
  },
  {
    id: 'vessel_003',
    name: '浙渔11111',
    callSign: 'ZJ11111',
    tonnage: 165,
    enginePower: 380,
    fuelTankCapacity: 10000,
    buildYear: 2016,
    homePort: '舟山岱山',
    skipper: '王海水'
  }
];

const voyages: Voyage[] = [
  {
    id: 'voyage_001',
    vesselId: 'vessel_001',
    voyageNo: 'ZJ12345-20260608',
    departurePort: '沈家门',
    arrivalPort: '沈家门',
    departureTime: '2026-06-08T06:00:00+08:00',
    arrivalTime: '2026-06-09T18:00:00+08:00',
    totalDistance: 128.5,
    totalFuel: 856.2,
    purpose: '拖网作业',
    weatherCondition: '多云有阵雨'
  },
  {
    id: 'voyage_002',
    vesselId: 'vessel_001',
    voyageNo: 'ZJ12345-20260615',
    departurePort: '沈家门',
    arrivalPort: '沈家门',
    departureTime: '2026-06-15T05:30:00+08:00',
    arrivalTime: '2026-06-16T22:00:00+08:00',
    totalDistance: 156.8,
    totalFuel: 1024.5,
    purpose: '围网作业',
    weatherCondition: '晴转多云'
  },
  {
    id: 'voyage_003',
    vesselId: 'vessel_002',
    voyageNo: 'ZJ67890-20260610',
    departurePort: '嵊山',
    arrivalPort: '嵊山',
    departureTime: '2026-06-10T04:00:00+08:00',
    arrivalTime: '2026-06-11T20:00:00+08:00',
    totalDistance: 185.3,
    totalFuel: 1285.6,
    purpose: '钓捕作业',
    weatherCondition: '阴有雾'
  },
  {
    id: 'voyage_004',
    vesselId: 'vessel_002',
    voyageNo: 'ZJ67890-20260620',
    departurePort: '嵊山',
    arrivalPort: '嵊山',
    departureTime: '2026-06-20T05:00:00+08:00',
    arrivalTime: '2026-06-22T08:00:00+08:00',
    totalDistance: 210.5,
    totalFuel: 1520.8,
    purpose: '拖网作业',
    weatherCondition: '晴'
  },
  {
    id: 'voyage_005',
    vesselId: 'vessel_003',
    voyageNo: 'ZJ11111-20260612',
    departurePort: '岱山',
    arrivalPort: '岱山',
    departureTime: '2026-06-12T06:30:00+08:00',
    arrivalTime: '2026-06-13T16:00:00+08:00',
    totalDistance: 98.6,
    totalFuel: 642.3,
    purpose: '流网作业',
    weatherCondition: '多云'
  }
];

const generateFuelRecords = (): FuelRecord[] => {
  const records: FuelRecord[] = [];
  
  const baseCoords: Record<string, { lat: number; lng: number }> = {
    voyage_001: { lat: 30.15, lng: 122.68 },
    voyage_002: { lat: 29.85, lng: 123.12 },
    voyage_003: { lat: 30.52, lng: 122.85 },
    voyage_004: { lat: 30.75, lng: 122.45 },
    voyage_005: { lat: 30.28, lng: 122.15 }
  };

  const voyageInfo: Record<string, { vesselId: string; startTime: Date; hours: number }> = {
    voyage_001: { vesselId: 'vessel_001', startTime: new Date('2026-06-08T06:00:00+08:00'), hours: 36 },
    voyage_002: { vesselId: 'vessel_001', startTime: new Date('2026-06-15T05:30:00+08:00'), hours: 40 },
    voyage_003: { vesselId: 'vessel_002', startTime: new Date('2026-06-10T04:00:00+08:00'), hours: 40 },
    voyage_004: { vesselId: 'vessel_002', startTime: new Date('2026-06-20T05:00:00+08:00'), hours: 51 },
    voyage_005: { vesselId: 'vessel_003', startTime: new Date('2026-06-12T06:30:00+08:00'), hours: 33 }
  };

  Object.entries(voyageInfo).forEach(([voyageId, info]) => {
    const base = baseCoords[voyageId];
    for (let i = 0; i < info.hours; i += 2) {
      const ts = new Date(info.startTime.getTime() + i * 3600 * 1000);
      const latOffset = (Math.random() - 0.5) * 0.8;
      const lngOffset = (Math.random() - 0.5) * 0.8;
      const speed = 5 + Math.random() * 7;
      const fuel = 15 + Math.random() * 25;
      const rpm = 800 + Math.floor(Math.random() * 1000);
      const seaTemp = 18 + Math.random() * 6;
      
      let status: FuelStatus = 'normal';
      const pendingIdx = [3, 8, 15];
      if (pendingIdx.includes(i)) {
        status = 'pending';
      }

      records.push({
        id: generateId('fuel'),
        voyageId,
        vesselId: info.vesselId,
        timestamp: ts.toISOString(),
        latitude: Number((base.lat + latOffset).toFixed(4)),
        longitude: Number((base.lng + lngOffset).toFixed(4)),
        speed: Number(speed.toFixed(1)),
        fuelConsumption: Number(fuel.toFixed(1)),
        engineRpm: rpm,
        seaTemperature: Number(seaTemp.toFixed(1)),
        status,
        remark: i === 8 ? '油位传感器异常波动' : undefined
      });
    }
  });

  return records;
};

const fuelRecords = generateFuelRecords();

const generateWeatherRaws = (): WeatherRaw[] => {
  const records: WeatherRaw[] = [];
  const baseLat = 30.1;
  const baseLng = 122.7;
  const startTime = new Date('2026-06-08T00:00:00+08:00');

  for (let i = 0; i < 40; i++) {
    const ts = new Date(startTime.getTime() + i * 3 * 3600 * 1000);
    const lat = Number((baseLat + (Math.random() - 0.5) * 1.2).toFixed(4));
    const lng = Number((baseLng + (Math.random() - 0.5) * 1.2).toFixed(4));
    
    let windSpeed: number | null = Number((3 + Math.random() * 12).toFixed(1));
    let windDirection: string | null = ['东北', '东南', '西北', '西南', '北', '南', '东', '西'][Math.floor(Math.random() * 8)];
    let waveHeight: number | null = Number((0.5 + Math.random() * 2.5).toFixed(1));
    let waveDirection: string | null = ['东北', '东南', '西北', '西南'][Math.floor(Math.random() * 4)];
    let temperature: number | null = Number((18 + Math.random() * 8).toFixed(1));
    let pressure: number | null = Number((1005 + Math.random() * 15).toFixed(1));
    let visibility: number | null = Number((3 + Math.random() * 15).toFixed(1));
    let remark: string | null = null;

    if (i < 12) {
      const fields = ['windSpeed', 'windDirection', 'waveHeight', 'waveDirection', 'temperature', 'pressure', 'visibility'];
      const nullCount = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < nullCount; j++) {
        const field = fields[Math.floor(Math.random() * fields.length)];
        if (field === 'windSpeed') windSpeed = null;
        if (field === 'windDirection') windDirection = null;
        if (field === 'waveHeight') waveHeight = null;
        if (field === 'waveDirection') waveDirection = null;
        if (field === 'temperature') temperature = null;
        if (field === 'pressure') pressure = null;
        if (field === 'visibility') visibility = null;
      }
    }

    const remarkIdx = [5, 12, 20, 28, 35];
    if (remarkIdx.includes(i)) {
      const remarks = [
        '风速8东北浪高1.2气温22',
        '风6级东南浪1.5米气压1012',
        '西北风10m/s浪高2.0能见度8',
        '东南风5浪高0.8气温25.5',
        '风速12西南浪高2.3温度20'
      ];
      remark = remarks[remarkIdx.indexOf(i)];
    }

    records.push({
      id: generateId('wraw'),
      timestamp: ts.toISOString(),
      latitude: lat,
      longitude: lng,
      windSpeed,
      windDirection,
      waveHeight,
      waveDirection,
      temperature,
      pressure,
      visibility,
      remark,
      source: i % 2 === 0 ? '气象预报API' : '沿海观测站'
    });
  }

  const dupTime = new Date('2026-06-09T12:00:00+08:00').toISOString();
  const dupLat = 30.2500;
  const dupLng = 122.8500;
  for (let d = 0; d < 3; d++) {
    records.push({
      id: generateId('wraw'),
      timestamp: dupTime,
      latitude: dupLat,
      longitude: dupLng,
      windSpeed: 8.5,
      windDirection: '东北',
      waveHeight: 1.5,
      waveDirection: '东北',
      temperature: 22.0,
      pressure: 1010.5,
      visibility: 10.0,
      remark: null,
      source: '重复导入测试'
    });
  }

  return records;
};

const weatherRaws = generateWeatherRaws();

const generateWeatherData = (raws: WeatherRaw[]): WeatherData[] => {
  const result: WeatherData[] = [];
  const seen = new Set<string>();

  raws.forEach((raw) => {
    const key = `${raw.timestamp}_${raw.latitude}_${raw.longitude}`;
    const isDup = seen.has(key);
    seen.add(key);

    const nullFilledFields: string[] = [];
    const parsedFromRemark: string[] = [];

    let windSpeed = raw.windSpeed;
    let windDirection = raw.windDirection;
    let waveHeight = raw.waveHeight;
    let waveDirection = raw.waveDirection;
    let temperature = raw.temperature;
    let pressure = raw.pressure;
    let visibility = raw.visibility;
    let isRemarkParsed = false;

    if (raw.remark) {
      isRemarkParsed = true;
      const remark = raw.remark;
      const windSpeedMatch = remark.match(/风速(\d+\.?\d*)/) || remark.match(/风(\d+\.?\d*)[m级]/);
      if (windSpeedMatch && windSpeed === null) {
        windSpeed = Number(windSpeedMatch[1]);
        parsedFromRemark.push('windSpeed');
      }
      const windDirMatch = remark.match(/([东西南北]+)风/);
      if (windDirMatch && windDirection === null) {
        windDirection = windDirMatch[1];
        parsedFromRemark.push('windDirection');
      }
      const waveMatch = remark.match(/浪高(\d+\.?\d*)/) || remark.match(/浪(\d+\.?\d*)米?/);
      if (waveMatch && waveHeight === null) {
        waveHeight = Number(waveMatch[1]);
        parsedFromRemark.push('waveHeight');
      }
      const tempMatch = remark.match(/气温(\d+\.?\d*)/) || remark.match(/温度(\d+\.?\d*)/);
      if (tempMatch && temperature === null) {
        temperature = Number(tempMatch[1]);
        parsedFromRemark.push('temperature');
      }
      const presMatch = remark.match(/气压(\d+\.?\d*)/);
      if (presMatch && pressure === null) {
        pressure = Number(presMatch[1]);
        parsedFromRemark.push('pressure');
      }
      const visMatch = remark.match(/能见度(\d+\.?\d*)/);
      if (visMatch && visibility === null) {
        visibility = Number(visMatch[1]);
        parsedFromRemark.push('visibility');
      }
    }

    if (windSpeed === null) { windSpeed = 7.5; nullFilledFields.push('windSpeed'); }
    if (windDirection === null) { windDirection = '东北'; nullFilledFields.push('windDirection'); }
    if (waveHeight === null) { waveHeight = 1.2; nullFilledFields.push('waveHeight'); }
    if (waveDirection === null) { waveDirection = '东北'; nullFilledFields.push('waveDirection'); }
    if (temperature === null) { temperature = 21.0; nullFilledFields.push('temperature'); }
    if (pressure === null) { pressure = 1010.0; nullFilledFields.push('pressure'); }
    if (visibility === null) { visibility = 8.0; nullFilledFields.push('visibility'); }

    if (!isDup) {
      result.push({
        id: generateId('wdata'),
        rawId: raw.id,
        timestamp: raw.timestamp,
        latitude: raw.latitude,
        longitude: raw.longitude,
        windSpeed,
        windDirection,
        waveHeight,
        waveDirection,
        temperature,
        pressure,
        visibility,
        isNullFilled: nullFilledFields.length > 0,
        nullFilledFields,
        isDuplicateRemoved: false,
        isRemarkParsed,
        parsedFromRemark
      });
    } else {
      result.push({
        id: generateId('wdata'),
        rawId: raw.id,
        timestamp: raw.timestamp,
        latitude: raw.latitude,
        longitude: raw.longitude,
        windSpeed,
        windDirection,
        waveHeight,
        waveDirection,
        temperature,
        pressure,
        visibility,
        isNullFilled: nullFilledFields.length > 0,
        nullFilledFields,
        isDuplicateRemoved: true,
        isRemarkParsed,
        parsedFromRemark
      });
    }
  });

  return result;
};

const weatherData = generateWeatherData(weatherRaws);

const tideData: TideData[] = [
  {
    id: generateId('tide'),
    stationId: 'tide_zs_001',
    stationName: '舟山沈家门潮位站',
    timestamp: '2026-06-08T12:00:00+00:00',
    timezone: 'UTC+0',
    tideLevel: 2.35,
    correctedTideLevel: null,
    hasTimezoneError: false,
    correctedTimezone: null,
    source: '海洋预报台'
  },
  {
    id: generateId('tide'),
    stationId: 'tide_zs_001',
    stationName: '舟山沈家门潮位站',
    timestamp: '2026-06-08T18:00:00+00:00',
    timezone: 'UTC+0',
    tideLevel: 0.85,
    correctedTideLevel: null,
    hasTimezoneError: false,
    correctedTimezone: null,
    source: '海洋预报台'
  },
  {
    id: generateId('tide'),
    stationId: 'tide_ss_002',
    stationName: '嵊山潮位站',
    timestamp: '2026-06-10T04:00:00+00:00',
    timezone: 'UTC+0',
    tideLevel: 3.12,
    correctedTideLevel: 2.68,
    hasTimezoneError: true,
    correctedTimezone: 'UTC+8',
    source: '浮标手动录入'
  },
  {
    id: generateId('tide'),
    stationId: 'tide_ds_003',
    stationName: '岱山潮位站',
    timestamp: '2026-06-12T00:00:00+08:00',
    timezone: 'UTC+8',
    tideLevel: 1.56,
    correctedTideLevel: null,
    hasTimezoneError: false,
    correctedTimezone: null,
    source: '海洋预报台'
  },
  {
    id: generateId('tide'),
    stationId: 'tide_zs_001',
    stationName: '舟山沈家门潮位站',
    timestamp: '2026-06-09T00:00:00+00:00',
    timezone: 'UTC+0',
    tideLevel: 1.88,
    correctedTideLevel: null,
    hasTimezoneError: false,
    correctedTimezone: null,
    source: '海洋预报台'
  },
  {
    id: generateId('tide'),
    stationId: 'tide_ss_002',
    stationName: '嵊山潮位站',
    timestamp: '2026-06-20T08:00:00+08:00',
    timezone: 'UTC+8',
    tideLevel: 2.75,
    correctedTideLevel: null,
    hasTimezoneError: false,
    correctedTimezone: null,
    source: '海洋预报台'
  }
];

const buoySupplements: BuoySupplement[] = [
  {
    id: generateId('buoy'),
    buoyId: 'buoy_zs_001',
    buoyName: '舟山东海1号浮标',
    supplementTime: '2026-06-08T14:30:00+08:00',
    latitude: 30.1850,
    longitude: 122.7560,
    windSpeed: 9.2,
    waveHeight: 1.8,
    temperature: 22.5,
    recordedBy: '运维-陈晓峰',
    remark: '自动采集中断后手动补录，数据来自邻近观测站'
  },
  {
    id: generateId('buoy'),
    buoyId: 'buoy_ss_002',
    buoyName: '嵊山外海2号浮标',
    supplementTime: '2026-06-10T22:15:00+08:00',
    latitude: 30.6250,
    longitude: 122.9080,
    windSpeed: 11.5,
    waveHeight: 2.3,
    temperature: 20.8,
    recordedBy: '运维-刘海涛',
    remark: '通信故障恢复后补录，与历史趋势一致'
  }
];

const corrections: Correction[] = [
  {
    id: generateId('corr'),
    targetType: 'fuelRecord',
    targetId: fuelRecords.find(r => r.status === 'pending')?.id || '',
    fieldName: 'fuelConsumption',
    oldValue: 38.5,
    newValue: 28.5,
    reason: '油位传感器异常导致读数偏高，比对前后时段数据后修正',
    status: 'approved',
    createdBy: '运维-张建国',
    createdAt: '2026-06-09T20:15:00+08:00',
    approvedBy: '主管-李明',
    approvedAt: '2026-06-10T09:30:00+08:00',
    version: 2
  },
  {
    id: generateId('corr'),
    targetType: 'weatherData',
    targetId: weatherData[0].id,
    fieldName: 'waveHeight',
    oldValue: 1.2,
    newValue: 1.8,
    reason: '备注解析遗漏，现场记录实际浪高1.8米',
    status: 'pending',
    createdBy: '运维-陈晓峰',
    createdAt: '2026-06-11T14:20:00+08:00',
    approvedBy: null,
    approvedAt: null,
    version: 1
  },
  {
    id: generateId('corr'),
    targetType: 'fuelRecord',
    targetId: fuelRecords.filter(r => r.status === 'pending')[1]?.id || '',
    fieldName: 'engineRpm',
    oldValue: 1750,
    newValue: 1650,
    reason: '人工记录时笔误，实际转速为1650rpm',
    status: 'approved',
    createdBy: '运维-王海水',
    createdAt: '2026-06-13T16:45:00+08:00',
    approvedBy: '主管-李明',
    approvedAt: '2026-06-14T10:00:00+08:00',
    version: 2
  }
];

const auditLogs: AuditLog[] = [
  {
    id: generateId('audit'),
    actionType: 'import',
    targetType: 'weatherRaw',
    targetId: weatherRaws[0].id,
    operator: '系统自动',
    operatorRole: 'system',
    actionTime: '2026-06-08T08:05:00+08:00',
    detail: '自动导入气象预报数据43条',
    ipAddress: '10.0.0.1'
  },
  {
    id: generateId('audit'),
    actionType: 'clean',
    targetType: 'weatherData',
    targetId: weatherData[0].id,
    operator: '系统自动',
    operatorRole: 'system',
    actionTime: '2026-06-08T08:06:12+08:00',
    detail: '气象数据清洗完成：填充空值12处，移除重复3条，解析备注5条',
    ipAddress: '10.0.0.1'
  },
  {
    id: generateId('audit'),
    actionType: 'correct',
    targetType: 'fuelRecord',
    targetId: corrections[0].targetId,
    operator: '运维-张建国',
    operatorRole: 'island_ops',
    actionTime: '2026-06-09T20:15:00+08:00',
    detail: `提交油耗修正申请：${corrections[0].fieldName} ${corrections[0].oldValue} → ${corrections[0].newValue}`,
    ipAddress: '192.168.1.105'
  },
  {
    id: generateId('audit'),
    actionType: 'approve',
    targetType: 'correction',
    targetId: corrections[0].id,
    operator: '主管-李明',
    operatorRole: 'island_ops_supervisor',
    actionTime: '2026-06-10T09:30:00+08:00',
    detail: '审批通过油耗修正申请，理由：核实传感器异常记录属实',
    ipAddress: '192.168.1.200'
  },
  {
    id: generateId('audit'),
    actionType: 'correct',
    targetType: 'weatherData',
    targetId: corrections[1].targetId,
    operator: '运维-陈晓峰',
    operatorRole: 'island_ops',
    actionTime: '2026-06-11T14:20:00+08:00',
    detail: `提交气象数据修正：${corrections[1].fieldName} ${corrections[1].oldValue} → ${corrections[1].newValue}`,
    ipAddress: '192.168.1.108'
  },
  {
    id: generateId('audit'),
    actionType: 'import',
    targetType: 'buoySupplement',
    targetId: buoySupplements[0].id,
    operator: '运维-陈晓峰',
    operatorRole: 'island_ops',
    actionTime: '2026-06-08T14:35:00+08:00',
    detail: '手动补录舟山东海1号浮标数据1条',
    ipAddress: '192.168.1.108'
  },
  {
    id: generateId('audit'),
    actionType: 'review',
    targetType: 'voyage',
    targetId: 'voyage_001',
    operator: '课题组-王志远',
    operatorRole: 'researcher',
    actionTime: '2026-06-15T10:00:00+08:00',
    detail: '查看浙渔12345船6月8日航线复盘报告',
    ipAddress: '192.168.2.50'
  },
  {
    id: generateId('audit'),
    actionType: 'export',
    targetType: 'voyage',
    targetId: 'voyage_003',
    operator: '课题组-刘芳',
    operatorRole: 'researcher',
    actionTime: '2026-06-18T15:30:00+08:00',
    detail: '导出浙渔67890船6月10日航程油耗数据',
    ipAddress: '192.168.2.51'
  }
];

const waterAlerts: WaterAlert[] = [
  {
    id: generateId('alert'),
    alertTime: '2026-06-08T16:00:00+08:00',
    stationName: '舟山近海监测点A3',
    latitude: 30.0500,
    longitude: 122.5500,
    indicator: '溶解氧',
    value: 3.2,
    threshold: 5.0,
    severity: 'high',
    relatedVoyageIds: ['voyage_001'],
    status: 'confirmed',
    description: '溶解氧浓度低于渔业水质标准，可能影响渔船作业区域渔获质量'
  },
  {
    id: generateId('alert'),
    alertTime: '2026-06-10T22:00:00+08:00',
    stationName: '嵊山外海监测点B7',
    latitude: 30.6800,
    longitude: 122.9500,
    indicator: 'pH值',
    value: 8.6,
    threshold: 8.5,
    severity: 'low',
    relatedVoyageIds: ['voyage_003'],
    status: 'pending',
    description: 'pH值略超上限，持续监测中'
  },
  {
    id: generateId('alert'),
    alertTime: '2026-06-12T08:00:00+08:00',
    stationName: '岱山附近监测点C2',
    latitude: 30.3500,
    longitude: 122.1000,
    indicator: '化学需氧量(COD)',
    value: 6.8,
    threshold: 5.0,
    severity: 'medium',
    relatedVoyageIds: ['voyage_005'],
    status: 'confirmed',
    description: 'COD超标，疑似陆源排放影响，建议避开该区域作业'
  }
];

const findDuplicateRaws = () => {
  const groups: Record<string, string[]> = {};
  weatherRaws.forEach(r => {
    const key = `${r.timestamp}_${r.latitude}_${r.longitude}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r.id);
  });
  return Object.entries(groups).filter(([, ids]) => ids.length > 1);
};

const dupGroups = findDuplicateRaws();

const duplicateGroups: DuplicateGroup[] = [
  {
    id: generateId('dup'),
    groupKey: dupGroups[0]?.[0] || '2026-06-09T04:00:00.000Z_30.25_122.85',
    dataType: 'weatherRaw',
    duplicateCount: 3,
    recordIds: dupGroups[0]?.[1] || weatherRaws.slice(-3).map(r => r.id),
    detectedAt: '2026-06-08T08:06:05+08:00',
    resolved: true,
    resolvedBy: '系统自动',
    resolvedAt: '2026-06-08T08:06:10+08:00',
    resolution: '保留首条记录，移除其余2条重复数据'
  },
  {
    id: generateId('dup'),
    groupKey: `dup_fuel_${voyages[0].id}`,
    dataType: 'fuelRecord',
    duplicateCount: 2,
    recordIds: [fuelRecords[2].id, fuelRecords[3].id],
    detectedAt: '2026-06-09T19:45:00+08:00',
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    resolution: null
  }
];

export {
  vessels,
  voyages,
  fuelRecords,
  weatherRaws,
  weatherData,
  tideData,
  buoySupplements,
  corrections,
  auditLogs,
  waterAlerts,
  duplicateGroups
};
