import type { AnomalyConclusion } from '@/types';

export const initialAnomalies: AnomalyConclusion[] = [
  {
    id: 'anom-001',
    title: '闸室水位双侧不平衡',
    description: '闸室左右两侧水位计读数差异超过阈值（0.6m）',
    explanation: '简单说就是船闸左右两边水位不一样高，差了60厘米。正常应该几乎齐平，这个偏差说明输水可能不均匀，或者有一侧阀门没完全打开。给运维讲的时候可以说："就像家里水池两个水龙头出水不一样快，水池就会歪。"',
    severity: 'danger',
    affectedDevices: ['dev-003', 'dev-004', 'dev-008'],
    location: [0, 4, 0],
    verified: false,
  },
  {
    id: 'anom-002',
    title: '下游液压泵油温偏高',
    description: '液压系统工作温度68℃，超过正常工作范围（40-60℃）',
    explanation: '闸门开关用的液压机现在有点"发烧"了。温度高说明要么是持续工作太久，要么是冷却系统效率下降。可以类比成汽车发动机过热，短时间还能跑，但长时间会烧机油、损密封。',
    severity: 'warning',
    affectedDevices: ['dev-006'],
    location: [5, 2, 4],
    verified: false,
  },
  {
    id: 'anom-003',
    title: '输水阀门B开度异常',
    description: '指令开度85%，实际反馈62%，偏差23%',
    explanation: '给阀门发了"开大点"的指令，但它只开了一半多一点。可能是阀芯卡住了，也可能是位置传感器不准。这就是上面水位不平衡的直接原因——右边进水量不够。',
    severity: 'danger',
    affectedDevices: ['dev-008', 'dev-004'],
    location: [3, 1.5, 0],
    verified: false,
  },
  {
    id: 'anom-004',
    title: '充水速率低于设计值',
    description: '当前流量125.6m³/s，设计值150m³/s，偏差16.3%',
    explanation: '水进得比设计的慢，每次过闸要多花15%-20%的时间。一天算下来少过好几艘船，影响通航效率。结合阀门开度异常看，大概率是阀门没到位导致的。',
    severity: 'warning',
    affectedDevices: ['dev-007', 'dev-008'],
    verified: false,
  },
];
