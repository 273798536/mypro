import dayjs from 'dayjs';
import {
  TrackPoint,
  AnomalyRecord,
  WaterQualityData,
  ReviewTask,
  VersionRecord,
  ActionableError,
  User,
  SHIP_LIST,
  MONITORING_STATIONS,
  DataStatistics,
} from '../types';

const now = Date.now();
const oneDay = 24 * 60 * 60 * 1000;

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
}

function generateShipTrack(shipId: string, shipName: string, days: number = 7): TrackPoint[] {
  const points: TrackPoint[] = [];
  const startTime = now - days * oneDay;
  const interval = 5 * 60 * 1000;
  const totalPoints = Math.floor((days * oneDay) / interval);

  let baseLat = 30 + Math.random() * 5;
  let baseLng = 120 + Math.random() * 5;
  let baseDepth = 20 + Math.random() * 30;

  for (let i = 0; i < totalPoints; i++) {
    const timestamp = startTime + i * interval;
    
    const latVariation = Math.sin(i * 0.01) * 0.1 + Math.random() * 0.02;
    const lngVariation = Math.cos(i * 0.01) * 0.1 + Math.random() * 0.02;
    const depthVariation = Math.sin(i * 0.02) * 5 + Math.random() * 2;
    
    let depth = baseDepth + depthVariation;
    let dataQuality: TrackPoint['dataQuality'] = 'approved';
    let source = 'AIS终端';

    if (shipId === 'SHIP-001' && i >= 200 && i <= 210) {
      depth = -5 - Math.random() * 10;
      dataQuality = 'raw';
    }

    if (shipId === 'SHIP-002' && i >= 400 && i <= 410) {
      continue;
    }

    if (shipId === 'SHIP-001' && i >= 500 && i <= 520) {
      dataQuality = 'pending';
      source = '人工补录';
    }

    if (shipId === 'SHIP-003' && i >= 300 && i <= 305) {
      dataQuality = 'suspended';
    }

    if (shipId === 'SHIP-002' && i >= 600 && i <= 610) {
      dataQuality = 'recollect';
    }

    points.push({
      id: generateId('TRK'),
      shipId,
      shipName,
      timestamp,
      longitude: baseLng + lngVariation,
      latitude: baseLat + latVariation,
      depth: Math.round(depth * 100) / 100,
      speed: Math.round((8 + Math.random() * 12) * 100) / 100,
      heading: Math.round(Math.random() * 360),
      dataQuality,
      source,
      version: dataQuality === 'pending' ? 2 : 1,
      createdAt: timestamp,
      updatedAt: dataQuality === 'pending' ? timestamp + oneDay : timestamp,
    });
  }

  return points;
}

export const mockTrackPoints: TrackPoint[] = [
  ...generateShipTrack('SHIP-001', '海洋勘探一号'),
  ...generateShipTrack('SHIP-002', '深蓝监测船'),
  ...generateShipTrack('SHIP-003', '碳汇采样船'),
];

export const mockAnomalyRecords: AnomalyRecord[] = [
  {
    id: generateId('ANM'),
    trackPointId: mockTrackPoints.find(p => p.shipId === 'SHIP-001' && p.depth < 0)?.id || '',
    type: 'negative_depth',
    severity: 'high',
    description: '检测到深度为负值，可能影响海洋碳汇核算精度',
    detectedAt: now - 2 * oneDay,
    resolved: false,
  },
  {
    id: generateId('ANM'),
    trackPointId: mockTrackPoints.find(p => p.shipId === 'SHIP-002' && p.dataQuality === 'recollect')?.id || '',
    type: 'missing_page',
    severity: 'critical',
    description: '检测到轨迹数据断页，2025-01-15 14:30-14:55期间无数据',
    detectedAt: now - 1 * oneDay,
    resolved: false,
  },
  {
    id: generateId('ANM'),
    trackPointId: mockTrackPoints.find(p => p.shipId === 'SHIP-003' && p.dataQuality === 'suspended')?.id || '',
    type: 'coordinate_drift',
    severity: 'medium',
    description: '检测到坐标漂移，与前后点距离超过正常范围',
    detectedAt: now - 3 * oneDay,
    resolved: true,
    resolvedAt: now - 2 * oneDay,
    resolvedBy: '赵安全员',
    resolution: '已修正坐标偏移，参考GPS校准数据',
  },
  {
    id: generateId('ANM'),
    trackPointId: mockTrackPoints.find(p => p.shipId === 'SHIP-001' && p.speed > 18)?.id || '',
    type: 'speed_abnormal',
    severity: 'low',
    description: '检测到航速异常，超出正常作业范围',
    detectedAt: now - 5 * oneDay,
    resolved: true,
    resolvedAt: now - 4 * oneDay,
    resolvedBy: '张安全员',
    resolution: '确认为正常航行，不影响数据质量',
  },
];

function generateWaterQualityData(): WaterQualityData[] {
  const data: WaterQualityData[] = [];
  const days = 7;
  const interval = 3 * 60 * 60 * 1000;

  MONITORING_STATIONS.forEach(station => {
    for (let day = 0; day < days; day++) {
      for (let hour = 0; hour < 24; hour += 3) {
        const timestamp = now - (days - day) * oneDay + hour * 60 * 60 * 1000;
        
        const baseTemp = 14 + Math.sin(day * 0.5) * 2 + Math.random() * 1;
        const baseSalinity = 32 + Math.random() * 2;
        const basePh = 8.1 + Math.sin(day * 0.3) * 0.2 + Math.random() * 0.1;
        const baseDO = 7 + Math.sin(day * 0.4) * 1.5 + Math.random() * 1;
        const baseTurbidity = 10 + Math.random() * 20;
        const baseChlorophyll = 2 + Math.random() * 3;

        let temperature = baseTemp;
        let salinity = baseSalinity;
        let ph = basePh;
        let dissolved_oxygen = baseDO;
        let turbidity = baseTurbidity;

        const warnings: WaterQualityData['warnings'] = [];

        if (station.id === 'ST-003' && day === 3) {
          dissolved_oxygen = 4.2;
          warnings.push({
            id: generateId('WRN'),
            metric: 'dissolved_oxygen',
            metricName: '溶解氧',
            value: dissolved_oxygen,
            threshold: 5,
            level: 'alert',
            message: '溶解氧低于阈值，可能影响海洋生物生存',
            resolved: false,
          });
        }

        if (station.id === 'ST-001' && day === 5) {
          ph = 8.7;
          warnings.push({
            id: generateId('WRN'),
            metric: 'ph',
            metricName: 'PH值',
            value: ph,
            threshold: 8.5,
            level: 'warning',
            message: 'PH值略高于阈值，可能与潮汐有关',
            resolved: true,
            resolvedAt: now - 2 * oneDay,
            resolvedBy: '王安全员',
          });
        }

        data.push({
          id: generateId('WQD'),
          stationId: station.id,
          stationName: station.name,
          timestamp,
          location: { lat: station.lat, lng: station.lng },
          temperature: Math.round(temperature * 100) / 100,
          salinity: Math.round(salinity * 100) / 100,
          ph: Math.round(ph * 100) / 100,
          dissolved_oxygen: Math.round(dissolved_oxygen * 100) / 100,
          turbidity: Math.round(turbidity * 100) / 100,
          chlorophyll: Math.round(baseChlorophyll * 100) / 100,
          warnings,
        });
      }
    }
  });

  return data;
}

export const mockWaterQualityData: WaterQualityData[] = generateWaterQualityData();

const pendingPoint1 = mockTrackPoints.find(p => p.shipId === 'SHIP-001' && p.dataQuality === 'pending');
const pendingPoint2 = mockTrackPoints.find(p => p.shipId === 'SHIP-002' && p.dataQuality === 'recollect');
const pendingPoint3 = mockTrackPoints.find(p => p.shipId === 'SHIP-003' && p.dataQuality === 'suspended');

export const mockReviewTasks: ReviewTask[] = [
  {
    id: generateId('REV'),
    type: '轨迹清洗复核',
    title: '海洋勘探一号 - 深度异常修正',
    description: '修正了深度为负的异常数据，根据前后30分钟内正常数据的平均值进行插值计算',
    priority: 'high',
    status: 'pending',
    submitterName: '张安全员',
    createdAt: now - 1 * oneDay,
    relatedRecordIds: pendingPoint1 ? [pendingPoint1.id] : [],
    dataSnapshot: {
      before: { depth: -8.5, dataQuality: 'raw' },
      after: { depth: 28.5, dataQuality: 'pending' },
      changes: [
        { field: 'depth', oldValue: -8.5, newValue: 28.5 },
        { field: 'dataQuality', oldValue: 'raw', newValue: 'pending' },
      ],
    },
  },
  {
    id: generateId('REV'),
    type: '轨迹补录复核',
    title: '深蓝监测船 - 轨迹断页补全',
    description: '轨迹数据存在断页，已标记为需重新采集',
    priority: 'critical',
    status: 'pending',
    submitterName: '李安全员',
    createdAt: now - 12 * 60 * 60 * 1000,
    relatedRecordIds: pendingPoint2 ? [pendingPoint2.id] : [],
    dataSnapshot: {
      before: { dataQuality: 'raw', note: '轨迹断页' },
      after: { dataQuality: 'recollect', note: '已标记为需重新采集' },
      changes: [
        { field: 'dataQuality', oldValue: 'raw', newValue: 'recollect' },
      ],
    },
  },
  {
    id: generateId('REV'),
    type: '预警确认复核',
    title: '南海监测站A - 溶解氧异常',
    description: '溶解氧检测值为4.2mg/L，低于阈值5.0mg/L，确认为异常',
    priority: 'high',
    status: 'pending',
    submitterName: '王安全员',
    createdAt: now - 6 * 60 * 60 * 1000,
    relatedRecordIds: mockWaterQualityData.find(d => d.warnings.some(w => w.metric === 'dissolved_oxygen' && !w.resolved))?.id ? 
      [mockWaterQualityData.find(d => d.warnings.some(w => w.metric === 'dissolved_oxygen' && !w.resolved))!.id] : [],
  },
  {
    id: generateId('REV'),
    type: '数据修正复核',
    title: '碳汇采样船 - 坐标漂移修正',
    description: '修正了坐标漂移问题，参考GPS校准数据进行了调整',
    priority: 'medium',
    status: 'approved',
    submitterName: '赵安全员',
    createdAt: now - 3 * oneDay,
    reviewerName: '海事处-刘主任',
    reviewedAt: now - 2 * oneDay,
    relatedRecordIds: pendingPoint3 ? [pendingPoint3.id] : [],
    dataSnapshot: {
      before: { latitude: 35.2, longitude: 121.8, dataQuality: 'raw' },
      after: { latitude: 35.25, longitude: 121.85, dataQuality: 'approved' },
      changes: [
        { field: 'latitude', oldValue: 35.2, newValue: 35.25 },
        { field: 'longitude', oldValue: 121.8, newValue: 121.85 },
        { field: 'dataQuality', oldValue: 'raw', newValue: 'approved' },
      ],
    },
  },
  {
    id: generateId('REV'),
    type: '预警确认复核',
    title: '东海监测站A - pH值异常',
    description: 'pH值检测值为8.7，确认为潮汐影响导致的正常波动',
    priority: 'low',
    status: 'approved',
    submitterName: '张安全员',
    createdAt: now - 5 * oneDay,
    reviewerName: '海事处-陈副主任',
    reviewedAt: now - 4 * oneDay,
    relatedRecordIds: mockWaterQualityData.find(d => d.warnings.some(w => w.metric === 'ph' && w.resolved))?.id ?
      [mockWaterQualityData.find(d => d.warnings.some(w => w.metric === 'ph' && w.resolved))!.id] : [],
  },
];

export const mockVersionRecords: VersionRecord[] = [
  {
    id: generateId('VER'),
    recordId: pendingPoint1?.id || '',
    operatorName: '张安全员',
    changeType: '人工修正深度',
    before: { depth: -8.5, dataQuality: 'raw' },
    after: { depth: 28.5, dataQuality: 'pending' },
    remark: '修正深度为负的异常数据，根据相邻点插值计算',
    timestamp: now - 1 * oneDay,
  },
  {
    id: generateId('VER'),
    recordId: pendingPoint3?.id || '',
    operatorName: '赵安全员',
    changeType: '人工修正坐标',
    before: { latitude: 35.2, longitude: 121.8, dataQuality: 'raw' },
    after: { latitude: 35.25, longitude: 121.85, dataQuality: 'approved' },
    remark: '修正坐标漂移，参考GPS校准数据',
    timestamp: now - 3 * oneDay,
  },
  {
    id: generateId('VER'),
    recordId: mockTrackPoints.find(p => p.shipId === 'SHIP-001' && p.dataQuality === 'approved')?.id || '',
    operatorName: '系统',
    changeType: '自动清洗',
    before: { depth: -5.2, dataQuality: 'raw' },
    after: { depth: 25.3, dataQuality: 'cleaned' },
    remark: '自动检测并修正深度为负的数据',
    timestamp: now - 4 * oneDay,
  },
  {
    id: generateId('VER'),
    recordId: mockTrackPoints.find(p => p.shipId === 'SHIP-002' && p.dataQuality === 'approved')?.id || '',
    operatorName: '李安全员',
    changeType: '人工修正航向',
    before: { heading: 365, dataQuality: 'raw' },
    after: { heading: 5, dataQuality: 'approved' },
    remark: '修正航向数据异常，超出0-360范围',
    timestamp: now - 5 * oneDay,
  },
];

export const mockActionableErrors: ActionableError[] = [
  {
    id: generateId('ERR'),
    code: 'TRK-001',
    message: '检测到缺失船舶轨迹数据',
    severity: 'error',
    context: {
      shipId: 'SHIP-002',
      shipName: '深蓝监测船',
      missingPeriod: '2025-01-15 14:30:00 - 2025-01-15 14:55:00',
      missingCount: 6,
      affectedRange: '约2.5海里',
    },
    actions: [
      { label: '补充该时段轨迹', type: 'primary', handler: 'auto_clean' },
      { label: '标记为暂缓数据', type: 'secondary', handler: 'mark_suspended' },
      { label: '查看影响范围', type: 'secondary', handler: 'export_available' },
    ],
    timestamp: now - 2 * oneDay,
  },
  {
    id: generateId('ERR'),
    code: 'TRK-002',
    message: '深度数据异常，多个轨迹点深度为负',
    severity: 'warning',
    context: {
      shipId: 'SHIP-001',
      shipName: '海洋勘探一号',
      anomalyCount: 11,
      timeRange: '2025-01-14 08:00:00 - 2025-01-14 09:00:00',
      minDepth: -12.5,
    },
    actions: [
      { label: '一键自动清洗', type: 'primary', handler: 'auto_clean' },
      { label: '手动修正', type: 'secondary', handler: 'export_available' },
    ],
    timestamp: now - 3 * oneDay,
  },
  {
    id: generateId('ERR'),
    code: 'WQ-001',
    message: '南海监测站A溶解氧持续偏低',
    severity: 'warning',
    context: {
      stationId: 'ST-003',
      stationName: '南海监测站A',
      currentValue: 4.2,
      threshold: 5.0,
      duration: '已持续12小时',
    },
    actions: [
      { label: '创建复核任务', type: 'primary', handler: 'export_available' },
      { label: '查看水质趋势', type: 'secondary', handler: 'mark_suspended' },
    ],
    timestamp: now - 6 * 60 * 60 * 1000,
  },
];

export const mockCurrentUser: User = {
  id: 'USR-001',
  name: '张安全员',
  role: 'safety_officer',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=safety',
};

export function getStatistics(): DataStatistics {
  const total = mockTrackPoints.length;
  const approved = mockTrackPoints.filter(p => p.dataQuality === 'approved' || p.dataQuality === 'available').length;
  const pending = mockTrackPoints.filter(p => p.dataQuality === 'pending').length;
  const suspended = mockTrackPoints.filter(p => p.dataQuality === 'suspended').length;
  const recollect = mockTrackPoints.filter(p => p.dataQuality === 'recollect').length;
  const anomalies = mockAnomalyRecords.filter(a => !a.resolved).length;
  const warnings = mockWaterQualityData.flatMap(d => d.warnings).filter(w => !w.resolved).length;
  const reviewPending = mockReviewTasks.filter(t => t.status === 'pending').length;
  const reviewApproved = mockReviewTasks.filter(t => t.status === 'approved').length;
  const reviewRejected = mockReviewTasks.filter(t => t.status === 'rejected').length;

  return {
    track: {
      total,
      ships: SHIP_LIST.length,
      available: approved,
      pending,
      suspended,
      recollect,
    },
    waterQuality: {
      total: mockWaterQualityData.length,
      stations: MONITORING_STATIONS.length,
      records: mockWaterQualityData.length,
      warnings,
    },
    review: {
      pending: reviewPending,
      approved: reviewApproved,
      rejected: reviewRejected,
    },
  };
}

export function getTrackPointsByShip(shipId: string): TrackPoint[] {
  return mockTrackPoints.filter(p => p.shipId === shipId);
}

export function getAnomaliesByTrackPoint(trackPointId: string): AnomalyRecord[] {
  return mockAnomalyRecords.filter(a => a.trackPointId === trackPointId);
}

export function getVersionHistory(entityType: 'track' | 'water_quality', recordId: string): VersionRecord[] {
  return mockVersionRecords
    .filter(v => v.recordId === recordId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function formatDateTime(timestamp: number): string {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
}
