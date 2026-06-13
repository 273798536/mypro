import type { BuoyDataPoint, AnomalyPoint } from '@/types';

function generateBuoyData(): BuoyDataPoint[] {
  const data: BuoyDataPoint[] = [];
  const startDate = new Date('2024-03-01T00:00:00');
  
  for (let i = 0; i < 168; i++) {
    const timestamp = new Date(startDate.getTime() + i * 3600000);
    
    const baseWaveHeight = 2.5 + Math.sin(i * 0.1) * 1.2 + Math.sin(i * 0.05) * 0.8;
    const noise = (Math.random() - 0.5) * 0.3;
    let waveHeight = Math.max(0.3, baseWaveHeight + noise);
    
    const basePeriod = 8 + Math.sin(i * 0.08) * 2.5;
    let wavePeriod = Math.max(2, basePeriod + (Math.random() - 0.5) * 1);
    
    let status: BuoyDataPoint['status'] = 'normal';
    let errorValue = 0;
    const anomalyIds: string[] = [];
    
    if (i === 12) {
      waveHeight = 16.8;
      status = 'error';
      errorValue = 2.3;
      anomalyIds.push('anom-001');
    } else if (i === 25) {
      waveHeight = 0.05;
      status = 'error';
      errorValue = -1.8;
      anomalyIds.push('anom-002');
    } else if (i === 37) {
      waveHeight = 8.5;
      wavePeriod = 28;
      status = 'warning';
      errorValue = 1.2;
      anomalyIds.push('anom-003');
    } else if (i === 45) {
      waveHeight = 4.2;
      status = 'warning';
      errorValue = 0.65;
      anomalyIds.push('anom-004');
    } else if (i >= 58 && i <= 62) {
      waveHeight = 6 + (i - 60) * 0.1;
      errorValue = 0.9 + (i - 60) * 0.1;
      status = i === 60 ? 'error' : 'warning';
      anomalyIds.push(`anom-drift-${i}`);
    } else if (i === 73) {
      waveHeight = 5.5;
      errorValue = 1.1;
      status = 'warning';
      anomalyIds.push('anom-noise-001');
    } else if (i === 88) {
      waveHeight = 3.8;
      errorValue = 0.45;
      status = 'normal';
    } else if (i === 95) {
      waveHeight = 12.5;
      errorValue = 1.8;
      status = 'error';
      anomalyIds.push('anom-005');
    } else if (i === 110) {
      waveHeight = 0.08;
      status = 'error';
      errorValue = -2.1;
      anomalyIds.push('anom-006');
    } else if (i === 125) {
      waveHeight = 7.2;
      errorValue = 0.7;
      status = 'warning';
      anomalyIds.push('anom-noise-002');
    } else if (i === 140) {
      waveHeight = 5.8;
      errorValue = 0.3;
      status = 'processed';
    } else if (i === 155) {
      waveHeight = 9.1;
      errorValue = 1.5;
      status = 'error';
      anomalyIds.push('anom-007');
    } else {
      errorValue = (Math.random() - 0.3) * 0.2;
      if (Math.abs(errorValue) > 0.4) {
        status = 'warning';
      }
    }
    
    const source = i < 84 ? 'buoy-A-primary' : 'buoy-A-secondary';
    
    data.push({
      id: `data-${String(i).padStart(4, '0')}`,
      timestamp: timestamp.toISOString(),
      waveHeight: Math.round(waveHeight * 100) / 100,
      wavePeriod: Math.round(wavePeriod * 10) / 10,
      errorValue: Math.round(errorValue * 1000) / 1000,
      attribution: 'v2.1.0',
      status,
      source,
      anomalyIds: anomalyIds.length > 0 ? anomalyIds : undefined,
    });
  }
  
  return data;
}

export const buoyData: BuoyDataPoint[] = generateBuoyData();

export const anomalyPoints: AnomalyPoint[] = [
  {
    id: 'anom-001',
    dataId: 'data-0012',
    type: 'extreme',
    description: '波高16.8m，远超15m上限，疑似极端天气或传感器故障',
    isSuspectedNoise: false,
    status: 'pending',
    attribution: '超出波高上限边界值，标记为极端值',
  },
  {
    id: 'anom-002',
    dataId: 'data-0025',
    type: 'missing',
    description: '波高0.05m，接近零值，疑似数据缺失或传感器异常',
    isSuspectedNoise: false,
    status: 'reviewed',
    attribution: '低于波高下限边界值，标记为缺失异常',
  },
  {
    id: 'anom-003',
    dataId: 'data-0037',
    type: 'extreme',
    description: '波周期28s，远超25s上限，数据合理性存疑',
    isSuspectedNoise: true,
    status: 'pending',
    attribution: '超出波周期上限边界值，疑似噪声',
  },
  {
    id: 'anom-004',
    dataId: 'data-0045',
    type: 'drift',
    description: '误差值0.65m，超过0.5m阈值，存在缓慢漂移趋势',
    isSuspectedNoise: false,
    status: 'resolved',
    attribution: '误差漂移超过阈值，已通过参数校准修正',
  },
  {
    id: 'anom-005',
    dataId: 'data-0095',
    type: 'extreme',
    description: '波高12.5m，接近上限，伴随较大误差',
    isSuspectedNoise: false,
    status: 'reviewed',
    attribution: '大浪区间误差增大，符合预期趋势',
  },
  {
    id: 'anom-006',
    dataId: 'data-0110',
    type: 'missing',
    description: '波高0.08m，几乎为零，确认数据传输中断',
    isSuspectedNoise: false,
    status: 'resolved',
    attribution: '数据传输中断，已使用插值补全',
  },
  {
    id: 'anom-007',
    dataId: 'data-0155',
    type: 'extreme',
    description: '波高9.1m，误差1.5m，超过2σ阈值',
    isSuspectedNoise: true,
    status: 'pending',
    attribution: '高海况下疑似随机噪声，需人工复核',
  },
  {
    id: 'anom-noise-001',
    dataId: 'data-0073',
    type: 'noise',
    description: '单点突跳，前后数据连续，疑似瞬时噪声',
    isSuspectedNoise: true,
    status: 'reviewed',
    attribution: '孤立异常点，前后数据正常，判定为噪声',
  },
  {
    id: 'anom-noise-002',
    dataId: 'data-0125',
    type: 'noise',
    description: '数据波动异常，疑似电磁干扰',
    isSuspectedNoise: true,
    status: 'pending',
    attribution: '短时高频波动，疑似环境噪声干扰',
  },
  {
    id: 'anom-drift-58',
    dataId: 'data-0058',
    type: 'drift',
    description: '误差开始持续增大，漂移起始点',
    isSuspectedNoise: false,
    status: 'resolved',
    attribution: '传感器零点漂移起始点',
  },
  {
    id: 'anom-drift-59',
    dataId: 'data-0059',
    type: 'drift',
    description: '误差持续增大中',
    isSuspectedNoise: false,
    status: 'resolved',
    attribution: '漂移过程中',
  },
  {
    id: 'anom-drift-60',
    dataId: 'data-0060',
    type: 'drift',
    description: '漂移峰值，误差达到最大值',
    isSuspectedNoise: false,
    status: 'resolved',
    attribution: '漂移峰值点',
  },
  {
    id: 'anom-drift-61',
    dataId: 'data-0061',
    type: 'drift',
    description: '误差开始回落',
    isSuspectedNoise: false,
    status: 'resolved',
    attribution: '漂移回落阶段',
  },
  {
    id: 'anom-drift-62',
    dataId: 'data-0062',
    type: 'drift',
    description: '漂移结束，恢复正常',
    isSuspectedNoise: false,
    status: 'resolved',
    attribution: '漂移结束',
  },
];
