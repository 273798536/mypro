import type { BuoyData, CorrectionRecord, InspectionPhoto, WindWindowResult } from '@/types';

const now = new Date();

const generateBuoyData = (): BuoyData[] => {
  const stations = ['东海一号浮标', '南海二号浮标', '黄海三号浮标', '渤海四号浮标'];
  const data: BuoyData[] = [];
  
  for (let i = 0; i < 20; i++) {
    const stationIndex = i % stations.length;
    const date = new Date(now.getTime() - i * 3 * 60 * 60 * 1000);
    const windSpeed = 4 + Math.random() * 12;
    const waveHeight = 0.5 + Math.random() * 2.5;
    const visibility = 500 + Math.random() * 3000;
    
    let status: BuoyData['status'] = 'available';
    if (windSpeed > 12 || waveHeight > 2.5 || visibility < 800) {
      status = 'recollect';
    } else if (windSpeed > 10 || waveHeight > 2 || visibility < 1200) {
      status = 'pending';
    }
    
    data.push({
      id: `buoy-${i}`,
      stationName: stations[stationIndex],
      timestamp: date.toISOString(),
      windSpeed: Number(windSpeed.toFixed(1)),
      windDirection: Math.floor(Math.random() * 360),
      waveHeight: Number(waveHeight.toFixed(2)),
      wavePeriod: Number((4 + Math.random() * 6).toFixed(1)),
      visibility: Math.round(visibility),
      status,
      dataSource: '自动采集',
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
    });
  }
  
  return data;
};

const generateCorrectionRecords = (): CorrectionRecord[] => {
  return [
    {
      id: 'corr-1',
      buoyDataId: 'buoy-3',
      fieldName: 'windSpeed',
      fieldLabel: '风速',
      oldValue: 12.5,
      newValue: 10.2,
      unit: 'm/s',
      reason: '传感器瞬时异常，已校验修正',
      operator: '张科研',
      status: 'approved',
      createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
      confirmedAt: new Date(now.getTime() - 86400000).toISOString(),
    },
    {
      id: 'corr-2',
      buoyDataId: 'buoy-7',
      fieldName: 'waveHeight',
      fieldLabel: '浪高',
      oldValue: 2.8,
      newValue: 2.1,
      unit: 'm',
      reason: '相邻站点数据比对后修正',
      operator: '李助理',
      status: 'pending',
      createdAt: new Date(now.getTime() - 3600000 * 5).toISOString(),
    },
    {
      id: 'corr-3',
      buoyDataId: 'buoy-11',
      fieldName: 'visibility',
      fieldLabel: '能见度',
      oldValue: 2500,
      newValue: 1800,
      unit: 'm',
      reason: '人工观测校准',
      operator: '王工',
      status: 'pending',
      createdAt: new Date(now.getTime() - 3600000 * 2).toISOString(),
    },
  ];
};

const generateInspectionPhotos = (): InspectionPhoto[] => {
  const stations = ['东海一号浮标', '南海二号浮标', '黄海三号浮标'];
  const categories = ['设备外观', '传感器状态', '锚系系统', '通信模块'];
  const photos: InspectionPhoto[] = [];
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getTime() - i * 86400000);
    const hasIssue = i === 3 || i === 7;
    photos.push({
      id: `photo-${i}`,
      title: `${stations[i % stations.length]}巡检${i + 1}`,
      stationName: stations[i % stations.length],
      category: categories[i % categories.length],
      imageUrl: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ocean%20buoy%20inspection%20photo%2C%20marine%20research%20equipment%2C%20sea%20background&image_size=square`,
      description: hasIssue ? '发现设备表面有腐蚀痕迹，需进一步检查' : '设备状态正常，无明显异常',
      hasIssue,
      issueType: hasIssue ? '设备腐蚀' : undefined,
      takenAt: date.toISOString(),
      createdAt: date.toISOString(),
    });
  }
  
  return photos;
};

const generateWindWindowResult = (): WindWindowResult => {
  const startTime = new Date(now.getTime() + 3600000 * 2);
  const endTime = new Date(startTime.getTime() + 3600000 * 8);
  
  return {
    id: 'window-1',
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    safetyLevel: 'caution',
    safetyScore: 0.68,
    description: '今日下午至夜间有8小时窗口期，风浪条件基本满足换班要求，建议谨慎作业',
    parameters: {
      windSpeed: 8.5,
      waveHeight: 1.2,
      visibility: 1500,
      windSpeedThreshold: 10.8,
      waveHeightThreshold: 1.5,
      visibilityThreshold: 1000,
      durationHours: 8,
    },
    calculatedAt: now.toISOString(),
  };
};

export const mockBuoyData = generateBuoyData();
export const mockCorrectionRecords = generateCorrectionRecords();
export const mockInspectionPhotos = generateInspectionPhotos();
export const mockWindWindowResult = generateWindWindowResult();

export const photoCategories = [
  { id: 'all', name: '全部' },
  { id: '设备外观', name: '设备外观' },
  { id: '传感器状态', name: '传感器状态' },
  { id: '锚系系统', name: '锚系系统' },
  { id: '通信模块', name: '通信模块' },
];

export const stationNames = [
  '东海一号浮标',
  '南海二号浮标',
  '黄海三号浮标',
  '渤海四号浮标',
];
