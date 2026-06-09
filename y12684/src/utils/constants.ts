import type { ParamDependency } from '../types';

export const paramLinkageRules: ParamDependency[] = [
  {
    source: 'windSpeed',
    target: 'erosionRate',
    formula: 'erosionRate = windSpeed * 0.15',
    description: '风速越快，沙粒获得的动能越大，对沙丘表面的侵蚀速率越高'
  },
  {
    source: 'grainSize',
    target: 'threshold',
    formula: 'threshold = grainSize * 2.5',
    description: '粒径越大的沙粒需要更大的启动风速才能被吹动（希尔兹临界参数）'
  },
  {
    source: 'moisture',
    target: 'cohesion',
    formula: 'cohesion = moisture * 0.8 + 0.2',
    description: '沙粒含水率提高时，颗粒间毛细作用力增大，粘聚力增强，抗风蚀能力提升'
  }
];

export const defaultCameraPresets = [
  {
    name: '俯视',
    position: [0, 25, 0.01] as [number, number, number],
    target: [0, 0, 0] as [number, number, number],
    description: '从正上方俯瞰沙丘整体形态和风蚀分布'
  },
  {
    name: '侧视',
    position: [20, 10, 0] as [number, number, number],
    target: [0, 2, 0] as [number, number, number],
    description: '从侧面观察沙丘剖面轮廓和侵蚀深度'
  },
  {
    name: '正视',
    position: [0, 5, 20] as [number, number, number],
    target: [0, 2, 0] as [number, number, number],
    description: '从正面迎风方向观察沙丘迎风波形态'
  },
  {
    name: '斜视',
    position: [15, 15, 15] as [number, number, number],
    target: [0, 2, 0] as [number, number, number],
    description: '斜45°视角，综合观察三维风蚀分布效果'
  }
];

export const paramRanges: Record<string, { min: number; max: number; unit: string; label: string }> = {
  windSpeed: { min: 0, max: 30, unit: 'm/s', label: '风速' },
  windDirection: { min: 0, max: 360, unit: '°', label: '风向' },
  grainSize: { min: 0.05, max: 2, unit: 'mm', label: '沙粒粒径' },
  moisture: { min: 0, max: 1, unit: '%', label: '含水率' },
  vegetation: { min: 0, max: 1, unit: '%', label: '植被覆盖率' },
  erosionRate: { min: 0, max: 10, unit: 'kg/(m²·h)', label: '侵蚀速率' },
  threshold: { min: 0, max: 10, unit: 'm/s', label: '启动风速阈值' },
  cohesion: { min: 0, max: 1, unit: 'kPa', label: '粘聚力' }
};

export const exceptionTypeLabels: Record<string, { label: string; color: string; action: string }> = {
  param_missing: {
    label: '参数缺失',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    action: '请前往参数配置页补录相关测量数据'
  },
  param_exceed: {
    label: '参数超限',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    action: '请调整参数至建议取值范围（修改口径）'
  },
  camera_lost: {
    label: '相机视角丢失',
    color: 'bg-red-100 text-red-800 border-red-300',
    action: '点击恢复默认视角或从预设视角中重新选择'
  },
  calc_error: {
    label: '计算错误',
    color: 'bg-red-100 text-red-800 border-red-300',
    action: '请检查参数配置后重新运行模拟'
  },
  export_fail: {
    label: '导出失败',
    color: 'bg-red-100 text-red-800 border-red-300',
    action: '请检查本地存储空间和浏览器权限后重试'
  }
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
};

export const formatTimestamp = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

export const formatDateTime = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
