import type { SurfaceDefinition } from '@/types'

const SURFACES: SurfaceDefinition[] = [
  {
    id: 'ellipsoid',
    name: '椭球面',
    formula: 'x²/a² + y²/b² + z²/c² = 1',
    formulaSource: {
      type: 'formula',
      label: '解析几何经典定义',
      reference: '《解析几何》第3章 §2',
      detail: '椭球面是二次曲面的基本类型，三个半轴 a, b, c 决定其形状',
    },
    paramDefs: [
      {
        key: 'a',
        label: '半轴 a',
        min: 0.1,
        max: 5,
        step: 0.1,
        source: { type: 'formula', label: 'X轴半轴长度', reference: 'x²/a² + y²/b² + z²/c² = 1', detail: 'a 控制椭球在 X 方向的伸展' },
      },
      {
        key: 'b',
        label: '半轴 b',
        min: 0.1,
        max: 5,
        step: 0.1,
        source: { type: 'formula', label: 'Y轴半轴长度', reference: 'x²/a² + y²/b² + z²/c² = 1', detail: 'b 控制椭球在 Y 方向的伸展' },
      },
      {
        key: 'c',
        label: '半轴 c',
        min: 0.1,
        max: 5,
        step: 0.1,
        source: { type: 'formula', label: 'Z轴半轴长度', reference: 'x²/a² + y²/b² + z²/c² = 1', detail: 'c 控制椭球在 Z 方向的伸展' },
      },
    ],
    computeVertex: (params, u, v) => {
      const a = params.a ?? 1
      const b = params.b ?? 1
      const c = params.c ?? 1
      const phi = u * Math.PI
      const theta = v * 2 * Math.PI
      return [
        a * Math.sin(phi) * Math.cos(theta),
        b * Math.sin(phi) * Math.sin(theta),
        c * Math.cos(phi),
      ]
    },
    defaultParams: { a: 2, b: 1.5, c: 1 },
    uRange: [0, 1],
    vRange: [0, 1],
    colorRule: {
      type: 'color_rule',
      label: '高度映射着色',
      reference: '展陈规范 v2.1 - 椭球面',
      detail: 'Z 值映射为冷暖渐变，顶部暖色底部冷色，半轴变化时渐变范围同步缩放',
    },
  },
  {
    id: 'hyperboloid',
    name: '单叶双曲面',
    formula: 'x²/a² + y²/b² - z²/c² = 1',
    formulaSource: {
      type: 'formula',
      label: '二次曲面标准型',
      reference: '《解析几何》第3章 §4',
      detail: '单叶双曲面为直纹面，沿 Z 轴伸展时截面从椭圆过渡到双曲线',
    },
    paramDefs: [
      {
        key: 'a',
        label: '半轴 a',
        min: 0.1,
        max: 5,
        step: 0.1,
        source: { type: 'formula', label: 'X方向半轴', reference: 'x²/a² + y²/b² - z²/c² = 1', detail: 'a 控制腰部椭圆的X方向半径' },
      },
      {
        key: 'b',
        label: '半轴 b',
        min: 0.1,
        max: 5,
        step: 0.1,
        source: { type: 'formula', label: 'Y方向半轴', reference: 'x²/a² + y²/b² - z²/c² = 1', detail: 'b 控制腰部椭圆的Y方向半径' },
      },
      {
        key: 'c',
        label: '半轴 c',
        min: 0.1,
        max: 5,
        step: 0.1,
        source: { type: 'formula', label: 'Z方向渐近斜率', reference: 'x²/a² + y²/b² - z²/c² = 1', detail: 'c 越小双曲面张开越快' },
      },
    ],
    computeVertex: (params, u, v) => {
      const a = params.a ?? 1
      const b = params.b ?? 1
      const c = params.c ?? 1
      const z = (u - 0.5) * 6
      const r = Math.sqrt(1 + (z * z) / (c * c))
      const theta = v * 2 * Math.PI
      return [a * r * Math.cos(theta), b * r * Math.sin(theta), z]
    },
    defaultParams: { a: 1.5, b: 1, c: 2 },
    uRange: [0, 1],
    vRange: [0, 1],
    colorRule: {
      type: 'color_rule',
      label: '径向着色',
      reference: '展陈规范 v2.1 - 双曲面',
      detail: '距中心轴距离映射为色带，腰部高亮边缘渐暗',
    },
  },
  {
    id: 'paraboloid',
    name: '椭圆抛物面',
    formula: 'z = x²/a² + y²/b²',
    formulaSource: {
      type: 'formula',
      label: '抛物面标准型',
      reference: '《解析几何》第3章 §3',
      detail: '抛物面开口向上，a, b 控制两个方向的开口宽度',
    },
    paramDefs: [
      {
        key: 'a',
        label: '半轴 a',
        min: 0.1,
        max: 5,
        step: 0.1,
        source: { type: 'formula', label: 'X方向开口', reference: 'z = x²/a² + y²/b²', detail: 'a 越大抛物面在X方向越平坦' },
      },
      {
        key: 'b',
        label: '半轴 b',
        min: 0.1,
        max: 5,
        step: 0.1,
        source: { type: 'formula', label: 'Y方向开口', reference: 'z = x²/a² + y²/b²', detail: 'b 越大抛物面在Y方向越平坦' },
      },
    ],
    computeVertex: (params, u, v) => {
      const a = params.a ?? 1
      const b = params.b ?? 1
      const x = (u - 0.5) * 4
      const y = (v - 0.5) * 4
      const z = (x * x) / (a * a) + (y * y) / (b * b)
      return [x, y, z - 2]
    },
    defaultParams: { a: 1, b: 1 },
    uRange: [0, 1],
    vRange: [0, 1],
    colorRule: {
      type: 'color_rule',
      label: '高度着色',
      reference: '展陈规范 v2.1 - 抛物面',
      detail: 'Z值映射为渐变，顶点暖色，底部冷色',
    },
  },
  {
    id: 'saddle',
    name: '鞍面',
    formula: 'z = x²/a² - y²/b²',
    formulaSource: {
      type: 'formula',
      label: '双曲抛物面',
      reference: '《解析几何》第3章 §5',
      detail: '鞍面沿两个方向分别上凸和下凹，a/b 比决定鞍的陡缓',
    },
    paramDefs: [
      {
        key: 'a',
        label: '半轴 a',
        min: 0.1,
        max: 5,
        step: 0.1,
        source: { type: 'formula', label: 'X方向上凸', reference: 'z = x²/a² - y²/b²', detail: 'a 控制上凸方向的开口' },
      },
      {
        key: 'b',
        label: '半轴 b',
        min: 0.1,
        max: 5,
        step: 0.1,
        source: { type: 'formula', label: 'Y方向下凹', reference: 'z = x²/a² - y²/b²', detail: 'b 控制下凹方向的开口' },
      },
    ],
    computeVertex: (params, u, v) => {
      const a = params.a ?? 1
      const b = params.b ?? 1
      const x = (u - 0.5) * 4
      const y = (v - 0.5) * 4
      const z = (x * x) / (a * a) - (y * y) / (b * b)
      return [x, y, z]
    },
    defaultParams: { a: 1, b: 1 },
    uRange: [0, 1],
    vRange: [0, 1],
    colorRule: {
      type: 'color_rule',
      label: '正负着色',
      reference: '展陈规范 v2.1 - 鞍面',
      detail: 'z>0 暖色，z<0 冷色，零点附近过渡',
    },
  },
  {
    id: 'sine',
    name: '正弦曲面',
    formula: 'z = A·sin(ωx)·cos(ωy)',
    formulaSource: {
      type: 'formula',
      label: '波动方程特解',
      reference: '《数学物理方法》第2章',
      detail: '驻波形式，振幅 A 和频率 ω 控制波纹密度和高度',
    },
    paramDefs: [
      {
        key: 'A',
        label: '振幅 A',
        min: 0.1,
        max: 3,
        step: 0.1,
        source: { type: 'formula', label: '振幅', reference: 'z = A·sin(ωx)·cos(ωy)', detail: 'A 控制波峰高度' },
      },
      {
        key: 'omega',
        label: '频率 ω',
        min: 0.5,
        max: 6,
        step: 0.1,
        source: { type: 'formula', label: '角频率', reference: 'z = A·sin(ωx)·cos(ωy)', detail: 'ω 控制波纹密度，过大会导致锯齿' },
      },
    ],
    computeVertex: (params, u, v) => {
      const A = params.A ?? 1
      const omega = params.omega ?? 1
      const x = (u - 0.5) * 6
      const y = (v - 0.5) * 6
      const z = A * Math.sin(omega * x) * Math.cos(omega * y)
      return [x, y, z]
    },
    defaultParams: { A: 1, omega: 1.5 },
    uRange: [0, 1],
    vRange: [0, 1],
    colorRule: {
      type: 'color_rule',
      label: '波峰波谷着色',
      reference: '展陈规范 v2.1 - 正弦曲面',
      detail: '波峰暖色波谷冷色，频率过高时自动降低对比度避免误导',
    },
  },
  {
    id: 'mobius',
    name: '莫比乌斯带',
    formula: '参数方程（扭转带面）',
    formulaSource: {
      type: 'exhibit_screenshot',
      label: '拓扑展陈原图',
      reference: '数学馆-拓扑展区-MB-03',
      detail: '莫比乌斯带是不可定向曲面的经典代表，扭转次数决定拓扑类型',
    },
    paramDefs: [
      {
        key: 'width',
        label: '带宽',
        min: 0.1,
        max: 2,
        step: 0.1,
        source: { type: 'exhibit_screenshot', label: '展陈截图-带宽标注', reference: 'MB-03-fig2', detail: '带宽影响可视性，过窄截线无法辨识' },
      },
      {
        key: 'twists',
        label: '扭转次数',
        min: 1,
        max: 5,
        step: 1,
        source: { type: 'exhibit_screenshot', label: '展陈截图-扭转标注', reference: 'MB-03-fig3', detail: '奇数次扭转不可定向，偶数次扭转可定向' },
      },
    ],
    computeVertex: (params, u, v) => {
      const width = params.width ?? 0.5
      const twists = Math.round(params.twists ?? 1)
      const t = u * 2 * Math.PI
      const s = (v - 0.5) * width
      const halfAngle = (twists * t) / 2
      const R = 2
      const x = (R + s * Math.cos(halfAngle)) * Math.cos(t)
      const y = (R + s * Math.cos(halfAngle)) * Math.sin(t)
      const z = s * Math.sin(halfAngle)
      return [x, y, z]
    },
    defaultParams: { width: 0.5, twists: 1 },
    uRange: [0, 1],
    vRange: [0, 1],
    colorRule: {
      type: 'exhibit_screenshot',
      label: '展陈配色方案',
      reference: 'MB-03-color-guide',
      detail: '内侧暖色外侧冷色，扭转处渐变过渡',
    },
  },
]

export function getSurfaceById(id: string): SurfaceDefinition | undefined {
  return SURFACES.find(s => s.id === id)
}

export function getAllSurfaces(): SurfaceDefinition[] {
  return SURFACES
}

export default SURFACES
