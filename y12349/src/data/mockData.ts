import { BatteryBatch, CycleRecord, Anomaly } from '../types';

const generateAnomalies = (cycleNumber: number, timestamp: Date): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  
  if (cycleNumber === 127) {
    anomalies.push({
      id: `anom-${cycleNumber}-1`,
      type: 'interruption',
      timestamp: new Date(timestamp.getTime() + 3600000 * 5),
      cycleNumber,
      description: '测试中断后重启',
      cause: '温控系统故障，导致温度超过安全阈值触发自动停机保护。检查发现冷却风扇轴承磨损，散热效率下降35%。',
      suggestion: '1. 更换冷却风扇轴承；2. 校准温度传感器；3. 重启前执行10分钟预充放电测试验证稳定性；4. 后续每50次循环检查一次散热系统状态。',
      severity: 'high',
      dataSources: ['循环记录_00127', '温度传感器_TS03', '温控系统日志_TCL_2024_01_15', '设备维护记录_MR_045']
    });
  }
  
  if (cycleNumber === 200) {
    anomalies.push({
      id: `anom-${cycleNumber}-2`,
      type: 'rate_change',
      timestamp: new Date(timestamp.getTime() + 3600000 * 2),
      cycleNumber,
      description: '充放电倍率切换',
      cause: '根据实验方案，从1C/1C切换至2C/1C模式，评估高倍率充电对电池衰减的影响。',
      suggestion: '1. 密切监测前50次循环的容量衰减速率；2. 如衰减速率超过基准的120%，考虑调回1.5C充电倍率；3. 记录温升变化趋势。',
      severity: 'medium',
      dataSources: ['实验方案文档_EP_003', '循环记录_00200', '测试人员操作日志_OP_089']
    });
  }
  
  if (cycleNumber === 350) {
    anomalies.push({
      id: `anom-${cycleNumber}-3`,
      type: 'temperature_drift',
      timestamp: new Date(timestamp.getTime() + 3600000 * 3),
      cycleNumber,
      description: '温度异常漂移',
      cause: '环境空调系统在凌晨时段自动进入节能模式，导致测试环境温度从25°C降至18°C，持续约6小时。',
      suggestion: '1. 修改空调策略，测试期间禁用节能模式；2. 对受影响的3个循环数据进行温度补偿校正；3. 设置温度异常告警阈值（±2°C）。',
      severity: 'medium',
      dataSources: ['温度传感器_TS01', '环境监测系统_EMS_LOG', '空调控制记录_AC_2024_02_20', '循环记录_00350']
    });
  }
  
  if (cycleNumber === 412) {
    anomalies.push({
      id: `anom-${cycleNumber}-4`,
      type: 'interruption',
      timestamp: new Date(timestamp.getTime() + 3600000 * 1),
      cycleNumber,
      description: '通讯中断导致测试暂停',
      cause: '测试电脑与设备之间的USB连接线接触不良，导致数据通讯中断15分钟后自动恢复。',
      suggestion: '1. 更换高质量屏蔽USB连接线；2. 定期（每月）检查连接线接口状态；3. 启用数据缓存机制，避免短时间中断影响测试。',
      severity: 'low',
      dataSources: ['设备通讯日志_COMM_0123', '系统事件日志_EVENT_4567', '循环记录_00412']
    });
  }
  
  return anomalies;
};

const generateCycleData = (count: number, nominalCapacity: number): CycleRecord[] => {
  const cycles: CycleRecord[] = [];
  const startDate = new Date('2024-01-01T08:00:00');
  
  for (let i = 1; i <= count; i++) {
    const cycleRetention = 100 - (i * 0.035) - Math.pow(i / 200, 1.5) * 2;
    const randomNoise = (Math.random() - 0.5) * 1.5;
    const capacityRetention = Math.max(60, cycleRetention + randomNoise);
    
    const baseTemp = 28 + (i / 50) * 5;
    const tempNoise = (Math.random() - 0.5) * 4;
    
    let chargeRate = 1.0;
    let dischargeRate = 1.0;
    
    if (i >= 200 && i < 400) {
      chargeRate = 2.0;
    } else if (i >= 400) {
      chargeRate = 1.5;
    }
    
    if (i >= 300) {
      dischargeRate = 1.5;
    }
    
    const anomalies = generateAnomalies(i, new Date(startDate.getTime() + i * 3600000 * 4));
    
    cycles.push({
      id: `cycle-${String(i).padStart(5, '0')}`,
      cycleNumber: i,
      timestamp: new Date(startDate.getTime() + i * 3600000 * 4),
      capacity: nominalCapacity * (capacityRetention / 100),
      capacityRetention,
      chargeRate,
      dischargeRate,
      avgTemperature: baseTemp + tempNoise,
      maxTemperature: baseTemp + tempNoise + (3 + Math.random() * 5),
      energyEfficiency: 96 - (i / 100) * 0.8 + (Math.random() - 0.5) * 1,
      anomalies
    });
  }
  
  return cycles;
};

export const mockBatteryBatch: BatteryBatch = {
  id: 'batch-001',
  name: 'NCM811-21700-5000mAh-A',
  chemistry: 'NCM811',
  nominalCapacity: 5000,
  testStartDate: new Date('2024-01-01T08:00:00'),
  cycles: generateCycleData(500, 5000)
};

export const mockComparisonBatches = [
  {
    id: 'batch-001',
    name: '1C充电基准组',
    data: generateCycleData(500, 5000).map((c, i) => ({
      cycleNumber: i + 1,
      capacityRetention: c.capacityRetention
    }))
  },
  {
    id: 'batch-002',
    name: '2C充电实验组',
    data: generateCycleData(500, 5000).map((c, i) => ({
      cycleNumber: i + 1,
      capacityRetention: c.capacityRetention - (i > 200 ? (i - 200) * 0.02 : 0)
    }))
  },
  {
    id: 'batch-003',
    name: '0.5C慢充组',
    data: generateCycleData(500, 5000).map((c, i) => ({
      cycleNumber: i + 1,
      capacityRetention: Math.min(100, c.capacityRetention + (i > 100 ? 2 : i * 0.02))
    }))
  }
];
