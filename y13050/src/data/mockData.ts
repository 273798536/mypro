import type { CadLayer, WindPoint, Anomaly } from '@/types'

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20240609)

export const mockLayers: CadLayer[] = [
  {
    id: 'layer-001',
    name: '风速仪测点',
    sourceFile: '滨海步道风场_2024_第3版.dwg',
    lineStart: 12,
    lineEnd: 47,
    visible: true,
    color: '#1B9AAA',
  },
  {
    id: 'layer-002',
    name: '风向标测点',
    sourceFile: '滨海步道风场_2024_第3版.dwg',
    lineStart: 48,
    lineEnd: 79,
    visible: true,
    color: '#06D6A0',
  },
  {
    id: 'layer-003',
    name: '温湿度测点',
    sourceFile: '滨海步道风场_2024_第3版.dwg',
    lineStart: 80,
    lineEnd: 112,
    visible: true,
    color: '#FFD166',
  },
  {
    id: 'layer-004',
    name: '气压测点',
    sourceFile: '滨海步道风场_2024_补测记录.dwg',
    lineStart: 1,
    lineEnd: 22,
    visible: true,
    color: '#8D99AE',
  },
]

function generatePoints(): WindPoint[] {
  const points: WindPoint[] = []
  const types: Array<{ type: WindPoint['type']; layerId: string }> = [
    { type: '风速仪', layerId: 'layer-001' },
    { type: '风向标', layerId: 'layer-002' },
    { type: '温湿度', layerId: 'layer-003' },
    { type: '气压', layerId: 'layer-004' },
  ]
  let line = 12

  for (let z = 0; z <= 80; z += 10) {
    types.forEach((t, ti) => {
      const baseX = ti % 2 === 0 ? -3 : 3
      const id = `WP-${String(z / 10 + 1).padStart(3, '0')}-${ti + 1}`
      let status: WindPoint['status'] = 'normal'
      let x = baseX + (rand() - 0.5) * 0.8
      let y = 2.5 + rand() * 0.5

      if (z === 30 && ti === 0) {
        status = 'overlap'
        x = -2.98
      }
      if (z === 30 && ti === 1) {
        status = 'overlap'
        x = -2.97
      }
      if (z === 50 && ti === 2) {
        status = 'outlier'
        x = 8.5
      }
      if (z === 40 && ti === 0) {
        status = 'missing'
      }
      if (z === 60 && ti === 3) {
        status = 'dirty'
      }

      points.push({
        id,
        layerId: t.layerId,
        x,
        y,
        z,
        type: t.type,
        status,
        cadLineNumber: line++,
        rawData: {
          HANDLE: `A${(1000 + z * 4 + ti).toString(16).toUpperCase()}`,
          LAYER: t.layerId.replace('layer-', 'WIND_'),
          X: x.toFixed(4),
          Y: y.toFixed(4),
          Z: z.toFixed(4),
          CODE: status === 'dirty' ? '??_ERR' : id,
          NOTE: status === 'missing' ? '' : status === 'dirty' ? null : `现场标记OK`,
        },
      })
    })
  }
  return points
}

export const mockPoints: WindPoint[] = generatePoints()

export const mockAnomalies: Anomaly[] = [
  {
    id: 'AN-001',
    pointId: 'WP-004-1',
    type: 'overlap',
    description: '与相邻测点 WP-004-2 坐标几乎重合，间距小于0.5米',
    cadReference: '滨海步道风场_2024_第3版.dwg 行12: LAYER=WIND_001, X=-2.9800',
    relatedPointIds: ['WP-004-2'],
  },
  {
    id: 'AN-002',
    pointId: 'WP-004-2',
    type: 'overlap',
    description: '与相邻测点 WP-004-1 坐标几乎重合，间距小于0.5米',
    cadReference: '滨海步道风场_2024_第3版.dwg 行48: LAYER=WIND_002, X=-2.9700',
    relatedPointIds: ['WP-004-1'],
  },
  {
    id: 'AN-003',
    pointId: 'WP-005-1',
    type: 'missing',
    description: '等间距序列中出现缺失，Z=40m 处风速仪未布设',
    cadReference: '滨海步道风场_2024_第3版.dwg 行16: NOTE 字段为空',
    relatedPointIds: [],
  },
  {
    id: 'AN-004',
    pointId: 'WP-006-3',
    type: 'outlier',
    description: '测点偏离步道中心线超过5米（X=8.5m），疑似坐标录错',
    cadReference: '滨海步道风场_2024_第3版.dwg 行83: X=8.5000 超出步道范围±5m',
    relatedPointIds: [],
  },
  {
    id: 'AN-005',
    pointId: 'WP-007-4',
    type: 'dirty',
    description: 'CAD原始字段 CODE 异常值"??_ERR"，NOTE 字段为 null',
    cadReference: '滨海步道风场_2024_补测记录.dwg 行17: CODE="??_ERR", NOTE=null',
    relatedPointIds: [],
  },
]
