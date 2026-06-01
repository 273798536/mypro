import type { ForbiddenZone } from '@/types'

export const forbiddenZoneData: ForbiddenZone[] = [
  {
    id: 'fz01',
    name: '辐射控制区 B-2',
    description: '高辐射区域，未经许可禁止进入，需二级防护',
    boundary: [
      [-2, 0, -1],
      [-2, 0, -6],
      [-8, 0, -6],
      [-8, 0, -1],
    ],
    color: '#DC2626',
    level: 'critical',
    effectiveFrom: '2025-01-01T00:00:00Z',
    workOrderId: 'WO-2025-0003',
  },
  {
    id: 'fz02',
    name: '蒸汽管道警戒区 C-1',
    description: '高温蒸汽管道区域，需穿戴隔热防护',
    boundary: [
      [10, 0, 7],
      [10, 0, 12],
      [15, 0, 12],
      [15, 0, 7],
    ],
    color: '#D97706',
    level: 'warning',
    effectiveFrom: '2025-06-01T00:00:00Z',
  },
]
