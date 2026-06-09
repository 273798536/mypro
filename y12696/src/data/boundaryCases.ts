import type { BoundaryCase } from '@/types';

export const boundaryCases: BoundaryCase[] = [
  {
    id: 'case-001',
    name: '相机视角丢失',
    description: '模拟传感器遮挡导致三维视角偏离，水位差从0.6m被误判为0.1m',
    category: 'camera_loss',
    beforeState: {
      waterLevel: {
        currentLevel: 22.5,
        targetLevel: 27.8,
        maxLevel: 28.5,
        minLevel: 17.0,
        upstreamLevel: 27.8,
        downstreamLevel: 18.3,
        flowRate: 125.6,
      },
      anomalies: [
        {
          id: 'anom-001',
          title: '闸室水位双侧不平衡',
          description: '闸室左右两侧水位计读数差异超过阈值（0.6m）',
          explanation: '正常情况下两侧水位差应小于0.1m，当前偏差已达危险阈值。',
          severity: 'danger',
          affectedDevices: ['dev-003', 'dev-004'],
          verified: true,
        },
      ],
    },
    afterState: {
      waterLevel: {
        currentLevel: 22.5,
        targetLevel: 27.8,
        maxLevel: 28.5,
        minLevel: 17.0,
        upstreamLevel: 27.8,
        downstreamLevel: 18.3,
        flowRate: 125.6,
      },
      anomalies: [
        {
          id: 'anom-001-masked',
          title: '闸室水位偏差在容许范围',
          description: '受视角遮挡影响，水位差被误判为0.1m，结论正常',
          explanation: '视角丢失导致左右水位计读数被投影压缩，真实差异被掩盖。',
          severity: 'info',
          affectedDevices: ['dev-003', 'dev-004'],
          verified: false,
        },
      ],
    },
    impactExplanation: '相机视角一旦偏离正对位置（如被船只遮挡、镜头起雾），三维投影会产生压缩变形，本案例中0.6m的危险水位差被误读为0.1m的正常偏差，直接导致"危险"降级为"正常"——这就是为什么必须保存和复核标准视角。',
  },
  {
    id: 'case-002',
    name: '离群点漂浮',
    description: '点云数据混入3个异常高值点，导致平均水位被抬高0.4m',
    category: 'outlier_float',
    beforeState: {
      waterLevel: {
        currentLevel: 22.5,
        targetLevel: 27.8,
        maxLevel: 28.5,
        minLevel: 17.0,
        upstreamLevel: 27.8,
        downstreamLevel: 18.3,
        flowRate: 125.6,
      },
      anomalies: [
        {
          id: 'anom-flow',
          title: '充水速率偏低',
          description: '流量125.6m³/s，低于设计值150m³/s',
          explanation: '实际水位偏低，充水效率不足。',
          severity: 'warning',
          affectedDevices: ['dev-007', 'dev-008'],
          verified: true,
        },
      ],
    },
    afterState: {
      waterLevel: {
        currentLevel: 22.9,
        targetLevel: 27.8,
        maxLevel: 28.5,
        minLevel: 17.0,
        upstreamLevel: 27.8,
        downstreamLevel: 18.3,
        flowRate: 148.2,
      },
      anomalies: [
        {
          id: 'anom-flow-masked',
          title: '充水速率正常',
          description: '混入离群点后流量被"算"为148.2m³/s，接近设计值',
          explanation: '漂浮的离群点（水面反光、气泡、浪花）被误识别为水面，抬高了平均水位。',
          severity: 'info',
          affectedDevices: ['dev-007', 'dev-008'],
          verified: false,
        },
      ],
    },
    impactExplanation: '真实材料中经常混入气泡、浪花反光、水面漂浮物产生的"假点"。本案例仅3个离群点就把平均水位抬高了40厘米，充水不足的警告直接消失——所以剖切和点云切片必须同时复核，剖面图能看穿这些漂浮的假数据。',
  },
  {
    id: 'case-003',
    name: '采样数据缺口',
    description: '阀门B附近连续8个采样点丢失，系统自动插值掩盖了卡阻现象',
    category: 'data_gap',
    beforeState: {
      waterLevel: {
        currentLevel: 22.5,
        targetLevel: 27.8,
        maxLevel: 28.5,
        minLevel: 17.0,
        upstreamLevel: 27.8,
        downstreamLevel: 18.3,
        flowRate: 125.6,
      },
      anomalies: [
        {
          id: 'anom-valve',
          title: '输水阀门B开度异常',
          description: '实际开度62%，指令85%，阀芯疑似卡阻',
          explanation: '传感器数据完整时能清晰看到开度曲线在62%处停滞。',
          severity: 'danger',
          affectedDevices: ['dev-008'],
          location: [3, 1.5, 0],
          verified: true,
        },
      ],
    },
    afterState: {
      waterLevel: {
        currentLevel: 24.2,
        targetLevel: 27.8,
        maxLevel: 28.5,
        minLevel: 17.0,
        upstreamLevel: 27.8,
        downstreamLevel: 18.3,
        flowRate: 142.0,
      },
      anomalies: [
        {
          id: 'anom-valve-masked',
          title: '阀门工作正常',
          description: '数据缺口处被线性插值，显示开度从62%平滑升至85%',
          explanation: '丢失的8个采样点刚好覆盖阀门卡阻的时间段，插值算法"修平"了故障。',
          severity: 'info',
          affectedDevices: ['dev-008'],
          verified: false,
        },
      ],
    },
    impactExplanation: '通信中断、传感器瞬时离线都是现场常态。本例中丢失的数据恰好是阀门卡住的那几秒，系统自动插值把一条"平线"修成了"斜线"，故障直接被掩盖。这就是补录和人工确认环节不能省的原因——机器会"善意"地帮你把问题抹掉。',
  },
];
