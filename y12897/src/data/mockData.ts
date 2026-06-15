import type {
  RiskNotice,
  BuoyData,
  ShipTrack,
  AquacultureLog,
  SalinityData,
  OilSpillFrame,
  TidalWindow,
} from '@/types';

const baseTime = '2026-06-15T08:00:00';
const centerLat = 22.58;
const centerLon = 113.92;

export const riskNotices: RiskNotice[] = [
  {
    id: 'notice-001',
    title: '大亚湾西侧海域发现大面积油膜',
    noticeTime: '2026-06-15T09:30:00',
    location: '大亚湾西区近岸海域',
    severity: 'high',
    handlingOpinion:
      '立即启动三级应急响应，调度近岸浮标加密监测，通知沿岸养殖区做好防范准备，协调海事部门排查过往船舶。',
    source: '市海洋环境监测中心',
    latitude: 22.56,
    longitude: 113.9,
  },
  {
    id: 'notice-002',
    title: '浮标 F-03 信号中断超过 6 小时',
    noticeTime: '2026-06-15T14:20:00',
    location: '白芒湾养殖区外海',
    severity: 'medium',
    handlingOpinion:
      '安排运维船赴现场排查，期间使用相邻浮标数据进行插值估算，提示养殖区加强人工巡视。',
    source: '浮标运维组',
    latitude: 22.61,
    longitude: 113.95,
  },
];

export const buoys: BuoyData[] = [
  {
    id: 'buoy-f01',
    buoyId: 'F-01',
    timestamp: '2026-06-15T15:00:00',
    latitude: 22.55,
    longitude: 113.89,
    oilThickness: 0.0,
    status: 'active',
    isOffline: false,
  },
  {
    id: 'buoy-f02',
    buoyId: 'F-02',
    timestamp: '2026-06-15T15:00:00',
    latitude: 22.58,
    longitude: 113.91,
    oilThickness: 0.35,
    status: 'active',
    isOffline: false,
  },
  {
    id: 'buoy-f03',
    buoyId: 'F-03',
    timestamp: '2026-06-15T08:15:00',
    latitude: 22.61,
    longitude: 113.95,
    oilThickness: 0.12,
    status: 'offline',
    isOffline: true,
    lastOnline: '2026-06-15T08:15:00',
  },
  {
    id: 'buoy-f04',
    buoyId: 'F-04',
    timestamp: '2026-06-15T15:00:00',
    latitude: 22.57,
    longitude: 113.96,
    oilThickness: 0.08,
    status: 'active',
    isOffline: false,
  },
];

export const shipTracks: ShipTrack[] = [
  {
    id: 'ship-s001-01',
    shipId: 'S-001',
    shipName: '远顺油轮',
    timestamp: '2026-06-15T06:00:00',
    latitude: 22.52,
    longitude: 113.85,
    speed: 12.5,
    heading: 65,
  },
  {
    id: 'ship-s001-02',
    shipId: 'S-001',
    shipName: '远顺油轮',
    timestamp: '2026-06-15T09:00:00',
    latitude: 22.56,
    longitude: 113.9,
    speed: 3.2,
    heading: 80,
  },
  {
    id: 'ship-s001-03',
    shipId: 'S-001',
    shipName: '远顺油轮',
    timestamp: '2026-06-15T12:00:00',
    latitude: 22.58,
    longitude: 113.93,
    speed: 8.7,
    heading: 110,
  },
  {
    id: 'ship-s002-01',
    shipId: 'S-002',
    shipName: '海巡 218',
    timestamp: '2026-06-15T10:30:00',
    latitude: 22.6,
    longitude: 113.92,
    speed: 15.3,
    heading: 200,
  },
  {
    id: 'ship-s002-02',
    shipId: 'S-002',
    shipName: '海巡 218',
    timestamp: '2026-06-15T14:00:00',
    latitude: 22.57,
    longitude: 113.91,
    speed: 5.1,
    heading: 270,
  },
];

export const aquacultureLogs: AquacultureLog[] = [
  {
    id: 'log-a001',
    farmId: 'A-001',
    farmName: '白芒湾生蚝养殖区',
    logDate: '2026-06-15',
    salinity: 28.5,
    waterQuality: '良',
    notes: '早潮进水，水色正常，未见异常油膜。下午巡查闻到轻微柴油味。',
    latitude: 22.62,
    longitude: 113.94,
  },
  {
    id: 'log-a002',
    farmId: 'A-002',
    farmName: '东涌石斑鱼养殖基地',
    logDate: '2026-06-15',
    notes: '水质监测设备故障，今日人工巡视记录缺失。建议明天补测。',
    latitude: 22.53,
    longitude: 113.97,
  },
];

export const salinityDataList: SalinityData[] = [
  {
    id: 'sal-s01',
    stationId: 'SAL-01',
    stationName: '大亚湾口站',
    timestamp: '2026-06-15T08:00:00',
    salinity: 32.1,
    unit: 'ppt',
    source: '海洋局常规监测',
    latitude: 22.5,
    longitude: 113.88,
  },
  {
    id: 'sal-s02',
    stationId: 'SAL-02',
    stationName: '白芒湾内测站',
    timestamp: '2026-06-15T10:30:00',
    salinity: 30.5,
    unit: 'psu',
    source: '养殖区自报',
    latitude: 22.6,
    longitude: 113.93,
  },
  {
    id: 'sal-s03',
    stationId: 'SAL-03',
    stationName: '东涌近岸站',
    timestamp: '2026-06-15T14:00:00',
    salinity: 28700,
    unit: 'mg/L',
    source: '科研项目数据',
    latitude: 22.54,
    longitude: 113.96,
  },
];

function generateSpillFrames(): OilSpillFrame[] {
  const frames: OilSpillFrame[] = [];
  const hours = 12;
  const startX = 0;
  const startY = 0;

  for (let h = 0; h <= hours; h++) {
    const time = new Date(baseTime);
    time.setHours(time.getHours() + h);
    const spreadRadius = 0.5 + h * 0.4;
    const driftX = h * 0.15;
    const driftY = h * 0.08;

    const particles: OilSpillFrame['particles'] = [];
    const particleCount = Math.min(200 + h * 40, 1500);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * spreadRadius;
      const x = startX + driftX + Math.cos(angle) * dist;
      const y = startY + driftY + Math.sin(angle) * dist;
      const z = (Math.random() - 0.5) * 0.02;
      const size = 0.02 + Math.random() * 0.06;
      const opacity = 0.3 + Math.random() * 0.5;
      particles.push({ x, y, z, size, opacity });
    }

    frames.push({
      timestamp: time.toISOString(),
      particles,
      spreadRadius,
      centerX: startX + driftX,
      centerY: startY + driftY,
    });
  }
  return frames;
}

export const oilSpillFrames = generateSpillFrames();

export const tidalWindows: TidalWindow[] = [
  {
    id: 'tide-001',
    startTime: '2026-06-15T05:30:00',
    endTime: '2026-06-15T11:45:00',
    type: 'flood',
    height: 2.1,
    label: '涨潮窗口',
  },
  {
    id: 'tide-002',
    startTime: '2026-06-15T11:45:00',
    endTime: '2026-06-15T12:30:00',
    type: 'slack',
    height: 2.3,
    label: '高平潮憩流',
  },
  {
    id: 'tide-003',
    startTime: '2026-06-15T12:30:00',
    endTime: '2026-06-15T18:15:00',
    type: 'ebb',
    height: 1.8,
    label: '落潮窗口',
  },
];

export const mockReportChineseExplanation = `
各位同事：

现将本次大亚湾溢油事件的复盘情况说明如下：

6月15日上午9时30分，监测中心在大亚湾西侧海域发现大面积油膜，随即启动三级应急响应。
经初步溯源，怀疑与"远顺油轮"当日上午在该海域的异常停留有关，目前海事部门正在进一步核实。

本次复盘涉及4个监测浮标，其中F-03号浮标因设备故障于当日8时15分起失去信号，
我们使用相邻浮标数据进行了插值估算，相关结论已在报告中标注为"部分估算"，
请大家使用时注意数据完整性。

养殖区方面，白芒湾生蚝养殖区当日巡查发现轻微柴油味，
东涌石斑鱼基地因监测设备故障，当日水质数据缺失，
建议明天补测后再次评估。盐度数据来自三个不同来源，单位不尽相同，
已统一换算为实用盐度标度（PSU）用于模型计算。

从扩散趋势来看，溢油主体在涨潮期间向西北方向漂移，
落潮后逐渐转往东南。当前下一窗口为今日18:15前后的低平潮，
是开展近岸清理的较好时机。

如有疑问，请随时联系复盘小组。
`.trim();

export { centerLat, centerLon, baseTime };
